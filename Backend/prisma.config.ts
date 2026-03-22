import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CRITICAL: Use DIRECT_URL (Port 5432) for pushing schema changes
    url: process.env["DIRECT_URL"], 
  },
});