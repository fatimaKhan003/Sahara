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
router.post("/save-medications", upload.single("image"), async (req, res) => {
  try {
    const { userId, medicines, backendImageUri } = req.body;

    if (!userId || !medicines) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const medsArray = JSON.parse(medicines);

    const savedMeds = await Medication.insertMany(
      medsArray.map((med) => {
        if (!med.schedule || !med.schedule.times || med.schedule.times.length === 0) {
          throw new Error(`Schedule times are required for medication ${med.name}`);
        }

        return {
          user: userId,
          name: med.name,
          dose: med.dose,
          schedule: {
            times: med.schedule.times,        // ["08:00", "20:00"]
            repeat: med.schedule.repeat || "daily"
          },
          isActive: med.isActive ?? true,
          status: med.status || "pending",
          imageUri: req.file ? `/uploads/${req.file.filename}` : backendImageUri || "",
        };

      })
    );

    res.status(201).json({ message: "Medications saved successfully", medications: savedMeds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


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

router.patch("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, dose, status, schedule } = req.body;
    const updateData = { name, dose, status };

    if (schedule) updateData.schedule = schedule;

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
