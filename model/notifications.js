const mongoose=require("mongoose");
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User"},
    message: { type: String, required: true },
    letter: { type: mongoose.Schema.Types.ObjectId, ref: "Letter" },  
    seen: { type: Boolean, default: false }, 
  },
  { timestamps: true }
);

const  Propertymodule = mongoose.model("Notification", notificationSchema);

module.exports = Propertymodule;
