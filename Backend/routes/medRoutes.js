import express from "express";
import Medication from "../models/Medication.js";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// POST: save medication -----------------------------------
router.post("/save-medications", async (req, res) => {
  try {
    const { userId, medicines, imageUri } = req.body;

    if (!userId || !medicines) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const savedMeds = await Medication.insertMany(
      medicines.map((med) => {
        if (!med.time) {
          throw new Error(`Time is required for medication ${med.name}`);
        }
        return {
          user: userId,
          name: med.name,
          dose: med.dose,
          frequency: med.frequency,
          time: med.time,
          isActive: med.isActive ?? true,
          imageUri,
        };
      })
    );

    res.status(201).json({ message: "Medications saved successfully", medications: savedMeds });
  
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET: get user's medications -----------------------------------
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const meds = await Medication.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json(meds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH: update medication status -----------------------------------
router.patch("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body; 

    const updated = await Medication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }
});

// DELETE: delete medication -----------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Medication.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Medication not found" });
    }

    res.json({ message: "Medication deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete medication" });
  }
});

// PATCH: update medication details -----------------------------------
router.patch("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, dose, frequency, time, status } = req.body;
    const updateData = { name, dose, frequency, time, status };

    if (req.file) {
      updateData.imageUri = `/uploads/${req.file.filename}`;
    }

    const updated = await Medication.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Medication not found" });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update medication" });
  }
});

// POST: upload profile image -----------------------------------
router.post("/upload-profile", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl, message: "Profile image uploaded successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

export default router;
