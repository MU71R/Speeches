const express = require("express");
const router = express.Router();
const Notification = require("../model/notifications");
const { verifyTokenMiddleware } = require("../middleware/auth");

// جلب الإشعارات الخاصة بالمستخدم الحالي
router.get("/", verifyTokenMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تعليم كل الإشعارات كمقروءة
router.put("/markAllRead", verifyTokenMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { seen: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تعليم إشعار محدد كمقروء
router.post("/:id", verifyTokenMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { seen: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف إشعار معين
// حذف إشعار واحد
// حذف جميع الإشعارات الخاصة بالمستخدم الحالي
router.delete("/clearAll", verifyTokenMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف إشعار معين
router.delete("/:id", verifyTokenMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
