import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import medRoutes from "./routes/medRoutes.js";
import ocrRoutes from "./routes/ocrRoutes.js";
import { fileURLToPath } from "url";
import path from "path";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/api", authRoutes);
app.use("/api/medications", medRoutes); 
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/ocr", ocrRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to Sahara's DB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
