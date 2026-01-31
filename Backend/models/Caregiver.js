// models/Caregiver.js
import mongoose from "mongoose";

const caregiverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // ONE caregiver profile per user
  },

  dependents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
}, { timestamps: true });

export default mongoose.model("Caregiver", caregiverSchema);
