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

const generateDoseLogs = (times, days = 7) => {
  const logs = [];
  const today = new Date();
  today.setSeconds(0);
  today.setMilliseconds(0);

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);

    for (const time of times) {
      const timeDate = new Date(time);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);

      logs.push({
        scheduledAt,
        status: "pending",
      });
    }
  }

  return logs;
};

const markExpiredDosesAsMissed = async (userId) => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 mins ago

  await Medication.updateMany(
    {
      user: userId,
      "doseLogs.status": "pending",
      "doseLogs.scheduledAt": { $lt: cutoff },
    },
    {
      $set: {
        "doseLogs.$[log].status": "missed",
      },
    },
    {
      arrayFilters: [
        {
          "log.status": "pending",
          "log.scheduledAt": { $lt: cutoff },
        },
      ],
    },
  );
};

router.post("/save-medications", upload.single("image"), async (req, res) => {
  try {
    const { userId, medicines, backendImageUri } = req.body;

    if (!userId || !medicines) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const medsArray = JSON.parse(medicines);

    const savedMeds = await Medication.insertMany(
      medsArray.map((med) => {
        if (
          !med.schedule ||
          !med.schedule.times ||
          med.schedule.times.length === 0
        ) {
          throw new Error(
            `Schedule times are required for medication ${med.name}`,
          );
        }

        const doseLogs = generateDoseLogs(med.schedule.times, 7);

        return {
          user: userId,
          name: med.name,
          dose: med.dose,
          schedule: med.schedule,
          doseLogs,
          isActive: med.isActive ?? true,
          imageUri: req.file
            ? `/uploads/${req.file.filename}`
            : backendImageUri || "",
        };
      }),
    );

    res.status(201).json({
      message: "Medications saved successfully",
      medications: savedMeds,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const meds = await Medication.find({ user: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(meds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// router.patch("/update-status/:id", async (req, res) => {
//   try {
//     const { status } = req.body;

//     const updated = await Medication.findByIdAndUpdate(
//       req.params.id,
//       { status },
//       { new: true },
//     );

//     res.json(updated);
//   } catch (error) {
//     res.status(500).json({ message: "Status update failed" });
//   }
// });

router.patch("/dose-log/:medId/:logId", async (req, res) => {
  try {
    const { status } = req.body;

    const update = {
      "doseLogs.$.status": status,
    };

    if (status === "taken") {
      update["doseLogs.$.takenAt"] = new Date();
    }

    const updated = await Medication.findOneAndUpdate(
      { _id: req.params.medId, "doseLogs._id": req.params.logId },
      { $set: update },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "Dose log not found" });
    }

    res.json(
      updated.doseLogs.find((log) => log._id.toString() === req.params.logId),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update dose log" });
  }
});

router.post("/sync-missed/:userId", async (req, res) => {
  try {
    await markExpiredDosesAsMissed(req.params.userId);
    res.json({ message: "Dose logs synced" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to sync missed doses" });
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
    const { name, dose, schedule, isActive } = req.body;
    const updateData = { name, dose, isActive };

    const med = await Medication.findById(req.params.id);
    if (!med) {
      return res.status(404).json({ message: "Medication not found" });
    }

    // Update schedule if provided
    if (schedule) {
      let parsedSchedule =
        typeof schedule === "string" ? JSON.parse(schedule) : schedule;

      updateData.schedule = parsedSchedule;

      // Keep all taken logs
      const takenLogs = med.doseLogs.filter((log) => log.status === "taken");
      const newPendingLogs = generateDoseLogs(parsedSchedule.times, 7);
      updateData.doseLogs = [...takenLogs, ...newPendingLogs];
    }

    if (req.file) {
      updateData.imageUri = `/uploads/${req.file.filename}`;
    }

    const updated = await Medication.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

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
    res
      .status(200)
      .json({ imageUrl, message: "Profile image uploaded successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

export default router;
