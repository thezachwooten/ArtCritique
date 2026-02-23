import express, { json } from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import fs from "fs";

const PORT = process.env.PORT || 5000; // Use Render's assigned port if available

dotenv.config();

// Acquires the GEMINI_API_KEY env key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
}); 

const app = express();
app.use(cors());

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

app.post("/analyze", upload.single("image"), async (req, res) => {
    // res.json({
    //     message: "Image uploaded successfully",
    //     file: req.file,
    // });

    // Image sent from frontend
    const myFile = await ai.files.upload({
        file: req.file.path,
        config: {mimeType: req.file.mimetype},
    });

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: createUserContent([
        createPartFromUri(myFile.uri, myFile.mimeType),
        "You are an Art teacher, please critique this image and return the feedback in json format: rating - Rating out of 10, Strength - array of strengths , Weaknesses - array of weaknesses, Tips: array of tips to improve",
        ]),
    });
    console.log(response.text);
    const rawText = response.text;

    // remove markdown wrappers like ```json ... ```
    const cleanedText = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

    let parsedFeedback;

    try {
        parsedFeedback = JSON.parse(cleanedText);
    } catch (err) {
        console.error("JSON parse failed:", cleanedText);

        // fallback so server doesn't crash
        parsedFeedback = { raw: cleanedText };
    }

    res.json({
        message: "Image analyzed successfully",
        feedbackDetails: parsedFeedback,
    });


});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});