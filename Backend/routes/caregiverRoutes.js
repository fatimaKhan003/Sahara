// controllers/caregiverController.js
import Caregiver from "../models/Caregiver.js";
import User from "../models/User.js"; 
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


const getDependents = async (req, res) => {
  try {
    const caregiver = await Caregiver
      .findOne({ user: req.params.userId })
      .populate("dependents", "name email");

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
export default router;