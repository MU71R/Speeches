const express = require("express");
const router = express.Router();
const Notification = require("../model/notifications");
const { verifyTokenMiddleware } = require("../middleware/auth");

// تعليم الكل كمقروء
router.put("/markAllRead", verifyTokenMiddleware, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      await Notification.updateMany(
        { targetRole: "admin" },
        { seen: true }
      );
    } else {
      await Notification.updateMany(
        { user: req.user._id },
        { seen: true }
      );
    }
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// مسح كل الإشعارات
router.delete("/clearAll", verifyTokenMiddleware, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      await Notification.deleteMany({ targetRole: "admin" });
    } else {
      await Notification.deleteMany({ user: req.user._id });
    }
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب الإشعارات بناءً على الدور
router.get("/", verifyTokenMiddleware, async (req, res) => {
  try {
    let notifications;

    if (req.user.role === "admin") {
      //   المشرف يشوف الإشعارات الخاصة بإضافة النشاط فقط + اللي لسه ما اتقرتش
      notifications = await Notification.find({
        targetRole: "admin",
        seen: false, // فلتر الإشعارات غير المقروءة فقط
      }).sort({ createdAt: -1 });
    } else {
      // المستخدم يشوف إشعاراته الخاصة (اللي لسه ما اتقرتش)
      notifications = await Notification.find({
        user: req.user._id,
        seen: false, // هنا كمان
      }).sort({ createdAt: -1 });
    }

    res.json(notifications);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ message: err.message });
  }
});


// تعليم إشعار كمقروء
router.post("/:id", verifyTokenMiddleware, async (req, res) => {
  try {
    let notification;
    if(req.user.role === "admin") {
      notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { seen: true },
        { new: true }
      );
    } else {
      notification = await Notification.findOneAndUpdate(
  { _id: req.params.id, user: req.user._id },
  { seen: true },
  { new: true }
);

    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// حذف إشعار معين
router.delete("/:id", verifyTokenMiddleware, async (req, res) => {
  try {
    let notification;
    if (req.user.role === "admin") {
      notification = await Notification.findByIdAndDelete(req.params.id);
    } else {
      notification = await Notification.findOneAndDelete(
        { _id: req.params.id, user: req.user._id }
      );
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
