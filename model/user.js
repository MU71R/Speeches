const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  fullname: {
    type: String,
    required: function () {
      return this.username;
    },
  },
  password: {
    type: String,
    required: function () {
              return this.username;
      },

  },
  role: {
    type: String,
    enum: ["preparer", "admin" ,"supervisor" ,"UniversityPresident" ],
  },
  sector: [{
    ref: "Sector",
    type: mongoose.Schema.Types.ObjectId,
  }],
  status: {
    type: String,
    enum: ["active", "inactive "],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
module.exports = mongoose.model("User", userSchema);
