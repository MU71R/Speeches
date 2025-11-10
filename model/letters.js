const mongoose = require("mongoose");
const letterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  Rationale: {
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
    enum: ["الممسوحة ضوئيا", "حقيقية"],
  },
  approvals: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["supervisor", "UniversityPresident"] },
      approved: { type: Boolean, default: false },
      date: { type: Date, default: Date.now },
    },
  ],
  StartDate: {
    type: Date,
  },
  EndDate: {
    type: Date,
  },
  // schema
  transactionNumber: { type: Number, unique: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
letterSchema.virtual("durationDays").get(function () {
  if (!this.startDate || !this.endDate) return 0;
  const diff = this.endDate - this.startDate;
  return Math.ceil(diff / (1000 * 60 * 60 * 24)); // يحول من ميلي ثانية إلى يوم
});

// تضمين القيم الافتراضية في JSON
letterSchema.set("toJSON", { virtuals: true });
letterSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Letter", letterSchema);
