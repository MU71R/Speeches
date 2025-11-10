const mongoose = require("mongoose");
const pdfSchema = new mongoose.Schema(
    {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User",},
    pdfurl: { type: String, required: true, },
    createdAt: { type: Date, default: Date.now, },
  },
  { timestamps: true }
);
module.exports = mongoose.model("PDF", pdfSchema);