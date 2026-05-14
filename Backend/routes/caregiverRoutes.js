// controllers/caregiverController.js
import Caregiver from "../models/Caregiver.js";
import User from "../models/User.js";
import express from "express";
import Medication from "../models/Medication.js";
import ThemeRequest from "../models/ThemeRequest.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const router = express.Router();
const createCaregiverIfNotExists = async (req, res) => {
  try {
    console.log("CARE GIVER CREATE HIT");
    console.log("BODY:", req.body);

    const { userId } = req.body;

    let caregiver = await Caregiver.findOne({ user: userId });
    if (caregiver) {
      console.log("Caregiver already exists");
      return res.status(200).json(caregiver);
    }

    caregiver = await Caregiver.create({
      user: userId,
      dependents: [],
    });

    console.log("Caregiver CREATED:", caregiver);
    res.status(201).json(caregiver);
  } catch (err) {
    console.error("Caregiver error:", err);
    res.status(500).json({ error: err.message });
  }
};
//to add a dependent if not registered before
const registerAndAddDependent = async (req, res) => {
  try {
    const { caregiverUserId, email, name, password } = req.body;

    // 1. Double check if user exists (to be safe)
    let dependentUser = await User.findOne({ email: email.toLowerCase() });

    if (!dependentUser) {
      // 2. Create the new user account
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      dependentUser = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "dependent",
      });
      console.log("NEW USER CREATED (HASHED):", dependentUser._id);
    }

    // 3. Find the caregiver record
    const caregiver = await Caregiver.findOne({ user: caregiverUserId });
    if (!caregiver) {
      return res.status(404).json({ error: "Caregiver profile not found" });
    }

    // 4. Link the new user to the caregiver's dependents array
    if (!caregiver.dependents.includes(dependentUser._id)) {
      caregiver.dependents.push(dependentUser._id);
      await caregiver.save();
    }

    res.status(201).json({
      message: "Dependent created and linked successfully",
      dependent: dependentUser,
    });
  } catch (err) {
    console.error("REGISTER & ADD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

const addDependent = async (req, res) => {
  try {
    console.log("ADD DEPENDENT Pressed");
    console.log("BODY:", req.body);

    const { caregiverUserId, email } = req.body;

    const dependentUser = await User.findOne({ email });
    console.log("FOUND USER:", dependentUser);

    if (!dependentUser)
      return res.status(404).json({ error: "User with this email not found" });

    if (dependentUser._id.toString() === caregiverUserId)
      return res.status(400).json({ error: "You cannot add yourself" });

    const caregiver = await Caregiver.findOne({ user: caregiverUserId });
    console.log("CARE GIVER:", caregiver);

    if (!caregiver)
      return res.status(404).json({ error: "Caregiver not found" });

    if (!caregiver.dependents.includes(dependentUser._id)) {
      caregiver.dependents.push(dependentUser._id);
      await caregiver.save();
    }

    res.json({ message: "Dependent added", dependent: dependentUser });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

const getDependents = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({
      user: req.params.userId,
    }).populate("dependents", "name email");

    if (!caregiver) return res.json([]);

    res.json(caregiver.dependents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getDependentsMeds = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({
      user: req.params.userId,
    }).populate("dependents");

    if (!caregiver) return res.json([]);

    const dependentIds = caregiver.dependents.map((d) => d._id);

    const meds = await Medication.find({
      user: { $in: dependentIds },
    }).populate("user", "name email");

    const result = meds.map((m) => ({
      ...m.toObject(),
      dependentName: m.user?.name || "Dependent",
    }));

    res.json(result);
  } catch (err) {
    console.error("DEPENDENTS MEDS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
const checkCaregiver = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.params.userId });
    res.json({ isCaregiver: !!caregiver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get("/:userId/is-caregiver", checkCaregiver);

router.post("/create", createCaregiverIfNotExists);
router.get("/:userId/dependents", getDependents);
router.get("/:userId/dependents-meds", getDependentsMeds);
router.post("/add-dependent", addDependent);
router.post("/register-and-add-dependent", registerAndAddDependent);

// DEPENDENT REQUEST THEME CHANGE
router.post("/request-theme", async (req, res) => {
  try {
    const { userId, theme } = req.body;

    console.log("THEME REQUEST HIT:", userId, theme);

    const caregiver = await Caregiver.findOne({
      dependents: new mongoose.Types.ObjectId(userId),
    });

    console.log("FOUND CAREGIVER:", caregiver);

    if (!caregiver) {
      console.log("No caregiver found");
      return res.status(400).json({ message: "No caregiver found" });
    }

    const existingRequest = await ThemeRequest.findOne({
      dependent: userId,
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A theme change request is already pending." });
    }

    const request = await ThemeRequest.create({
      dependent: userId,
      caregiver: caregiver.user,
      requestedTheme: theme,
    });

    console.log("REQUEST CREATED:", request);

    res.json({ message: "Theme change request sent" });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Error requesting theme change" });
  }
});

router.get("/theme-requests/:caregiverId", async (req, res) => {
  const requests = await ThemeRequest.find({
    caregiver: req.params.caregiverId,
    status: "pending",
  }).populate("dependent");

  res.json(requests);
});

router.post("/approve-theme/:requestId", async (req, res) => {
  const request = await ThemeRequest.findById(req.params.requestId);

  request.status = "approved";
  await request.save();

  res.json({
    message: "Theme approved",
    dependent: request.dependent,
    theme: request.requestedTheme,
  });
});

router.post("/reject-theme/:requestId", async (req, res) => {
  const request = await ThemeRequest.findById(req.params.requestId);

  request.status = "rejected";
  await request.save();

  res.json({ message: "Rejected" });
});
router.get("/is-dependent/:userId", async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({
      dependents: new mongoose.Types.ObjectId(req.params.userId),
    });

    res.json({ isDependent: !!caregiver });
  } catch (err) {
    res.status(500).json({ message: "Error checking dependent" });
  }
});

router.get("/my-theme-requests/:userId", async (req, res) => {
  try {
    const requests = await ThemeRequest.find({
      dependent: req.params.userId,
      status: "approved",
    })
      .sort({ updatedAt: -1 })
      .limit(1);

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching requests" });
  }
});

router.patch("/mark-theme-applied", async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId)
      return res.status(400).json({ message: "requestId required" });

    const updated = await ThemeRequest.findByIdAndUpdate(
      requestId,
      { status: "applied" },
      { new: true },
    );

    if (!updated) return res.status(404).json({ message: "Request not found" });

    res.json({ message: "Theme marked as applied", request: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating request" });
  }
});

export default router;
