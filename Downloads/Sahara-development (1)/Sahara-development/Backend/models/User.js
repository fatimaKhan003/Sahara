import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  themePreference: { type: String, enum: ["light", "dark"], default: "light" },
});

export default mongoose.model("User", userSchema);
