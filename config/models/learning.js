const mongoose = require("mongoose");

const learningSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    courseId: {
      type: Number,
      required: true,
    },
    courseName: String,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    modulesCompleted: {
      type: Number,
      default: 0,
    },
    totalModules: {
      type: Number,
      default: 0,
    },
    assessmentScores: [
      {
        moduleId: Number,
        score: Number,
        date: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Learning", learningSchema);
