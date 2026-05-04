import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/extract", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype,
    });

    const ocrResponse = await axios.post("http://localhost:8000/ocr", form, {
      headers: form.getHeaders(),
    });

    return res.json({
      ocrText: ocrResponse.data.text,
      ...ocrResponse.data,
    });
  } catch (err) {
    console.log("OCR server unreachable: ", err.message);
    res.status(500).json({ message: "OCR failed" });
  }
});

export default router;
