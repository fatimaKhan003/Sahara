import mongoose from "mongoose";

const themeRequestSchema = new mongoose.Schema(
  {
    dependent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    caregiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requestedTheme: { type: String, enum: ["light", "dark"] },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ThemeRequest", themeRequestSchema);