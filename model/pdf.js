const mongoose = require("mongoose");
const pdfSchema = new mongoose.Schema(
    {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User",},
    letterId: { type: mongoose.Schema.Types.ObjectId, ref: "Letter",},
    pdfurl: { type: String, required: true, },
    createdAt: { type: Date, default: Date.now, },
  },
  { timestamps: true }
);
module.exports = mongoose.model("PDF", pdfSchema);