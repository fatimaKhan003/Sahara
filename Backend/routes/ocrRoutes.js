import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

router.post("/extract", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;

    const form = new FormData();
    form.append("file", fs.createReadStream(imagePath));

    const ocrResponse = await axios.post("http://localhost:8000/ocr", form, {
      headers: form.getHeaders(),
    });

    return res.json({
      ocrText: ocrResponse.data.text,
      imageUri: `/uploads/${req.file.filename}`,
    });

  } catch (err) {
    console.log("OCR server unreachable: ", err.message);
    res.status(500).json({ message: "OCR failed" });
  }
});

export default router;
