const mongoose=require("mongoose");
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User"},
      // targetRole: { type: String, enum: ["admin", "user"], required: true }, 
    message: { type: String, required: true },
    activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },  
    seen: { type: Boolean, default: false }, 
  },
  { timestamps: true }
);

const  Propertymodule = mongoose.model("Notification", notificationSchema);

module.exports = Propertymodule;
