import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    times: {
      type: [String], 
      required: true,
    },

    repeat: {
      type: String,
      enum: ["daily", "weekly", "twiceDaily","threeTimesDaily"],
      default: "daily",
    },

    daysOfWeek: {
      type: [Number], 
      default: [],
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
    },
  },
  { _id: false }, 
);

export default scheduleSchema;
