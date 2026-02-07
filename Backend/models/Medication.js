import mongoose from "mongoose";
import scheduleSchema from "./Schedule.js";

const medicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    dose: { type: String, required: true },

    schedule: {
      type: scheduleSchema,
      required: true,
    },

    doseLogs: [
      {
        scheduledAt: Date,
        takenAt: Date,
        status: {
          type: String,
          enum: ["pending", "taken", "missed"],
          default: "pending",
        },
      },
    ],

    type: { type: String },

    isActive: { type: Boolean, default: true },

    imageUri: { type: String },
  },
  { timestamps: true },
);

const Medication = mongoose.model("Medication", medicationSchema);

export default Medication;
