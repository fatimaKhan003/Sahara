import mongoose from "mongoose";

const medicationRequestSchema = new mongoose.Schema({
  dependent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  caregiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  medicines: [{ name: String, dose: String, schedule: Object, isActive: Boolean }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  deleteRequested: { type: Boolean, default: false },
  medicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Medication", default: null }, 
  type: { type: String, enum: ["add", "delete"], default: "add" }, 
}, { timestamps: true });

export default mongoose.model("MedicationRequest", medicationRequestSchema);
