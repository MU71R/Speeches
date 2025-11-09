const mongoose = require("mongoose");
const letterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  decision: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AddDecision",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "in_progress"],
    default: "pending",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  letterType: {
    type: String,
    enum: ["رئاسة الوزراء", "رئاسة الجمهورية", "وزارة التعليم العالي", "عامة"],
    default: "عامة",
  },
  attachment: {
    type: String,
  },
  breeif: {
    type: String,
  },
signatureType: {
    type: String,
    enum: [ "الممسوحة ضوئيا", "حقيقية"],
  },

  approvals: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["supervisor", "UniversityPresident"] },
      approved: { type: Boolean, default: false },
      date: { type: Date, default: Date.now },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Letter", letterSchema);
