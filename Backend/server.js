import "dotenv/config";
import express, { json } from "express";
import multer from "multer";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import rateLimit from "express-rate-limit";
import { clerkMiddleware, getAuth } from "@clerk/express";

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'; // Add this
import pg from 'pg'; // Add this
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// This fixes the "Expected 1 argument, but got 0" error
const prisma = new PrismaClient({ adapter });

const PORT = process.env.PORT || 5000; // Use Render's assigned port if available

// Initialize the client
const client = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});

const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: "Too many requests, please try again after 15 minutes have passed."
});

const app = express();
app.use(cors());
app.use(express.json());

app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY
}));

// File storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const upload = multer({ storage });

app.post("/analyze", limit, upload.single("image"), async (req, res) => {
    try {
        // 1. Identify who is making the request (Clerk Express SDK)
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No image file uploaded." });
        }

        // 2. Upload to Gemini's storage using the 2026 @google/genai Client
        const myFile = await client.files.upload({
            file: req.file.path,
            config: { mimeType: req.file.mimetype },
        });

        // 3. Generate Content (The 2026 Syntax)
        const result = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Critique this image. Return a JSON object with: rating (number), strengths (array), weaknesses (array), and tips (array)." },
                        {
                            fileData: {
                                mimeType: myFile.mimeType,
                                fileUri: myFile.uri
                            }
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json"
            }
        });

        // 4. Extract and Parse the response
        // Note: result.text is a property in the 2026 SDK
        const responseText = result.text;
        const parsedFeedback = JSON.parse(responseText);

        // 5. Save to Database with the Clerk userId
        const savedCritique = await prisma.critique.create({
            data: {
                userId: userId,
                imageUrl: myFile.uri, 
                rating: Number(parsedFeedback.rating), // Force number just in case
                strengths: parsedFeedback.strengths,
                weaknesses: parsedFeedback.weaknesses,
                tips: parsedFeedback.tips,
            },
        });

        // 6. Cleanup local storage
        if (req.file) fs.unlinkSync(req.file.path);

        res.json({
            message: "Analysis Complete and Saved to Profile",
            feedbackDetails: parsedFeedback,
            recordId: savedCritique.id
        });

    } catch (error) {
        // Cleanup file if an error happens before the usual delete line
        if (req.file) fs.unlinkSync(req.file.path);
        
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/history", async (req, res) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // Fetch all critiques for this specific user, newest first
        const history = await prisma.critique.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});