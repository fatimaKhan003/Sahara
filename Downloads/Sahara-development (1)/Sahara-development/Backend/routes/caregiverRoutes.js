// controllers/caregiverController.js
import Caregiver from "../models/Caregiver.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import express from "express";
import Medication from "../models/Medication.js";
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


const addDependent = async (req, res) => {
  try {
    console.log("ADD DEPENDENT HIT ✅");
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
    console.error("ERROR ❌:", err);
    res.status(500).json({ error: err.message });
  }
};

// Create new account for dependent (caregiver provides name, email, password)
const createDependent = async (req, res) => {
  try {
    const { caregiverUserId, name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use. Use 'Add by email' to link existing account." });
    }

    const caregiver = await Caregiver.findOne({ user: caregiverUserId });
    if (!caregiver)
      return res.status(404).json({ error: "Caregiver not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });

    if (!caregiver.dependents.includes(newUser._id)) {
      caregiver.dependents.push(newUser._id);
      await caregiver.save();
    }

    res.status(201).json({
      message: "Dependent account created successfully",
      dependent: { _id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (err) {
    console.error("CREATE DEPENDENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// Caregiver sets theme (light/dark) for a dependent
const setDependentTheme = async (req, res) => {
  try {
    const { caregiverUserId, dependentId } = req.params;
    const { theme } = req.body; // "light" | "dark"

    if (!["light", "dark"].includes(theme)) {
      return res.status(400).json({ error: "Theme must be 'light' or 'dark'" });
    }

    const caregiver = await Caregiver.findOne({ user: caregiverUserId });
    if (!caregiver) return res.status(404).json({ error: "Caregiver not found" });

    const isDependent = caregiver.dependents.some(
      (d) => d.toString() === dependentId
    );
    if (!isDependent)
      return res.status(403).json({ error: "Not your dependent" });

    const dependent = await User.findByIdAndUpdate(
      dependentId,
      { themePreference: theme },
      { new: true }
    );
    if (!dependent) return res.status(404).json({ error: "Dependent not found" });

    res.json({ message: "Theme updated", themePreference: dependent.themePreference });
  } catch (err) {
    console.error("SET THEME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// Caregiver verifies or rejects a dependent's medication
const verifyMedication = async (req, res) => {
  try {
    const { medicationId } = req.params;
    const { caregiverUserId, action } = req.body; // action: "verify" | "reject"

    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'verify' or 'reject'" });
    }

    const medication = await Medication.findById(medicationId).populate("user");
    if (!medication) return res.status(404).json({ error: "Medication not found" });

    const caregiver = await Caregiver.findOne({ user: caregiverUserId });
    if (!caregiver) return res.status(404).json({ error: "Caregiver not found" });

    const isDependent = caregiver.dependents.some(
      (d) => d.toString() === medication.user._id.toString()
    );
    if (!isDependent)
      return res.status(403).json({ error: "Medication belongs to someone who is not your dependent" });

    const verificationStatus = action === "verify" ? "verified" : "rejected";
    const updated = await Medication.findByIdAndUpdate(
      medicationId,
      { verificationStatus, verifiedBy: caregiverUserId },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("VERIFY MEDICATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


const getDependents = async (req, res) => {
  try {
    const caregiver = await Caregiver
      .findOne({ user: req.params.userId })
      .populate("dependents", "name email themePreference");

    if (!caregiver) return res.json([]);

    res.json(caregiver.dependents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getDependentsMeds = async (req, res) => {
  try {
    const caregiver = await Caregiver
      .findOne({ user: req.params.userId })
      .populate("dependents");

    if (!caregiver) return res.json([]);

    const dependentIds = caregiver.dependents.map(d => d._id);

    const meds = await Medication.find({ user: { $in: dependentIds } })
      .populate("user", "name email");

    const result = meds.map(m => ({
      ...m.toObject(),
      dependentName: m.user?.name || "Dependent",
    }));

    res.json(result);
  } catch (err) {
    console.error("DEPENDENTS MEDS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get medications pending caregiver verification
const getPendingMedications = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.params.userId })
      .populate("dependents");
    if (!caregiver) return res.json([]);

    const dependentIds = caregiver.dependents.map((d) => d._id);

    const meds = await Medication.find({
      user: { $in: dependentIds },
      verificationStatus: "pending",
    }).populate("user", "name email");

    const result = meds.map((m) => ({
      ...m.toObject(),
      dependentName: m.user?.name || "Dependent",
    }));

    res.json(result);
  } catch (err) {
    console.error("PENDING MEDS ERROR:", err);
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
router.get("/:userId/pending-medications", getPendingMedications);
router.post("/add-dependent", addDependent);
router.post("/create-dependent", createDependent);
router.patch("/verify-medication/:medicationId", verifyMedication);
router.patch("/:caregiverUserId/dependent/:dependentId/theme", setDependentTheme);
export default router;