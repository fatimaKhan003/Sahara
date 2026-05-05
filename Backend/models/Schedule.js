import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    times: {
      type: [String], // ["08:00", "20:00"], in 24 hour format
      required: true,
    },

    repeat: {
      type: String,
      enum: ["daily", "weekly", "twiceDaily"],
      default: "daily",
    },

    daysOfWeek: {
      type: [Number], // 0=Sunday … 6=Saturday
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
  { _id: false }, // no id field needed
);

export default scheduleSchema;
