import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    dose: { type: String, required: true },         
    frequency: { type: String, required: true },    
    time: { type: String, required:true },                          
    type: { type: String }, 

    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "verified", // For users without caregiver, meds are auto-verified
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    imageUri: { type: String },             

  },
  { timestamps: true } 
);

const Medication = mongoose.model("Medication", medicationSchema);

export default Medication;
