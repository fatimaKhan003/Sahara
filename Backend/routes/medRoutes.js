import express from "express";
import Medication from "../models/Medication.js";
import Caregiver from "../models/Caregiver.js";
import MedicationRequest from "../models/MedicationRequest.js";
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
console.log("🔥 HIT SAVE MEDICATION ROUTE");
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

    // 🔍 CHECK IF USER IS A DEPENDENT (HAS A CAREGIVER)
    console.log("Checking caregiver for user:", userId);
    const caregiver = await Caregiver.findOne({
      dependents: userId,
    });
console.log("Caregiver found:",caregiver);
    // ==============================
    // 🚨 CASE 1: HAS CAREGIVER → CREATE REQUEST
    // ==============================
    if (caregiver) {
      await MedicationRequest.create({
        dependent: userId,
        caregiver: caregiver.user,
        medicines: medsArray,
        imageUri: req.file
          ? `/uploads/${req.file.filename}`
          : backendImageUri || "",
      });

      return res.status(200).json({
        requiresApproval: true,
        message: "Request sent to caregiver",
      });
    }

    // ==============================
    // ✅ CASE 2: NO CAREGIVER → NORMAL FLOW
    // ==============================

    const savedMeds = await Medication.insertMany(
      medsArray.map((med) => {
        if (
          !med.schedule ||
          !med.schedule.times ||
          med.schedule.times.length === 0
        ) {
          throw new Error(
            `Schedule times are required for medication ${med.name}`
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
      })
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

    const meds = await Medication.find({ user: userId });

    const today = new Date();
    today.setSeconds(0);
    today.setMilliseconds(0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    for (const med of meds) {
      const todaysLogs = med.doseLogs.filter((log) => {
        const t = new Date(log.scheduledAt);
        return t >= startOfToday && t <= endOfToday;
      });

      const logsToInsert = [];

      for (const time of med.schedule.times) {
        const timeDate = new Date(time);

        const scheduledAt = new Date(startOfToday);
        scheduledAt.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);

        const exists = todaysLogs.some((log) => {
          const t = new Date(log.scheduledAt);
          return (
            t.getHours() === scheduledAt.getHours() &&
            t.getMinutes() === scheduledAt.getMinutes()
          );
        });

        if (!exists) {
          logsToInsert.push({
            scheduledAt,
            status: "pending",
          });
        }
      }

      if (logsToInsert.length > 0) {
        med.doseLogs.push(...logsToInsert);
        await med.save();
      }
    }

    const updatedMeds = await Medication.find({ user: userId }).sort({
      createdAt: -1,
    });

    res.status(200).json(updatedMeds);
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

router.patch("/mark-notification/:medId/:logId", async (req, res) => {
  try {
    const { medId, logId } = req.params;

    const updated = await Medication.findByIdAndUpdate(
      medId,
      { $set: { "doseLogs.$[log].notificationScheduled": true } },
      {
        arrayFilters: [{ "log._id": logId }],
        new: true,
      },
    );

    if (!updated) {
      return res.status(404).json({ message: "Medication or log not found" });
    }

    res.status(200).json({ message: "Notification marked as scheduled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark notification" });
  }
});
// ✅ 1. GET PENDING REQUESTS (for caregiver)
router.get("/requests/:caregiverId", async (req, res) => {
  try {
    const requests = await MedicationRequest.find({
      caregiver: req.params.caregiverId,
      status: "pending",
    }).populate("dependent");

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching requests" });
  }
});
// ✅ 2. APPROVE REQUEST
router.post("/approve/:requestId", async (req, res) => {
  try {
    const request = await MedicationRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: "Not found" });
    }

    // 🔥 CREATE MEDICATIONS (WITH DOSE LOGS)
  const updatedMeds=req.body.medicines || request.medicines;
    const meds = updatedMeds.map((m) => {
      const doseLogs = generateDoseLogs(m.schedule.times || [],7);

      return {
        user: request.dependent,
        name: m.name,
        dose: m.dose,
        schedule: m.schedule || {times:[]},
        doseLogs,
        isActive: m.isActive ?? true,
        imageUri: request.imageUri || "",
      };
    });

    await Medication.insertMany(meds);

    request.status = "approved";
    await request.save();

    res.json({ message: "Approved & medications added" });
  } catch (err) {
    res.status(500).json({ message: "Error approving request" });
  }
});
// ❌ 3. REJECT REQUEST
router.post("/reject/:requestId", async (req, res) => {
  try {
    const request = await MedicationRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: "Not found" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Error rejecting request" });
  }
});

// ✅ DEPENDENT → REQUEST DELETE
router.post("/request-delete", async (req, res) => {
  try {
    const { userId, medicationId } = req.body;

    if (!userId || !medicationId) {
      return res.status(400).json({ message: "Missing userId or medicationId" });
    }

    // Find caregiver for this dependent
    const caregiver = await Caregiver.findOne({ dependents: userId });
    if (!caregiver) {
      // No caregiver → delete directly
      await Medication.findByIdAndDelete(medicationId);
      return res.status(200).json({ message: "Medication deleted directly (no caregiver)" });
    }

    // Check if a pending delete request already exists
    const existing = await MedicationRequest.findOne({
      dependent: userId,
      medicationId,
      type: "delete",
      status: "pending",
    });
    if (existing) {
      return res.status(200).json({ message: "Delete request already pending" });
    }

    // Create delete request
    await MedicationRequest.create({
      dependent: userId,
      caregiver: caregiver.user,
      medicines: [],
      medicationId,
      type: "delete",
      status: "pending",
      deleteRequested: true,
    });

    return res.status(200).json({ message: "Delete request sent to caregiver" });
  } catch (err) {
    console.error("Error requesting delete:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// ✅ APPROVE DELETE
router.post("/approve-delete", async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await MedicationRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Delete the actual medication
    await Medication.findByIdAndDelete(request.medicationId);

    request.status = "approved";
    await request.save();

    res.json({ message: "Medication deletion approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error approving delete" });
  }
});

// ✅ REJECT DELETE
router.post("/reject-delete", async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await MedicationRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "rejected";
    await request.save();

    res.json({ message: "Medication deletion rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error rejecting delete" });
  }
});
// ✅ GET DELETE REQUESTS for caregiver
router.get("/delete-requests/:caregiverId", async (req, res) => {
  try {
    const requests = await MedicationRequest.find({
      caregiver: req.params.caregiverId,
      type: "delete",
      status: "pending",
    })
      .populate("dependent", "name")
      .populate("medicationId");

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching delete requests" });
  }
});

export default router;
