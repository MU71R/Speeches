const mongoose = require("mongoose");
const adddecisionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  sector: {
    ref: "Sector",
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  supervisor: {
    ref: "User",
    type: mongoose.Schema.Types.ObjectId,
  },
  isPresidentDecision: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AddDecision", adddecisionSchema);

  