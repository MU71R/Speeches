const cron = require("node-cron");
const Letter = require("../model/letters");
const Notification = require("../model/notifications");
const User = require("../model/user");
const { getIo } = require("../socket");

// مهمة يومية كل يوم الساعة 9 صباحًا
cron.schedule("0 9 * * *", async () => {
  console.log("🔔 Checking letters for upcoming expiration...");

  try {
    const today = new Date();
    const inThirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    // جلب كل الخطابات التي ستنتهي خلال 30 يوم
    const letters = await Letter.find({
      EndDate: { $gte: today, $lte: inThirtyDays },
    });

    if (!letters.length) return console.log("لا توجد خطابات منتهية قريباً.");

    // جلب كل المستخدمين حسب الدور مرة واحدة
    const [supervisors, admins, presidents] = await Promise.all([
      User.find({ role: "supervisor" }),
      User.find({ role: "admin" }),
      User.find({ role: "UniversityPresident" }),
    ]);

    for (const letter of letters) {
      const recipients = new Set();

      // إضافة صاحب الخطاب
      if (letter.user) recipients.add(letter.user.toString());

      // إضافة المشرفين
      supervisors.forEach((s) => recipients.add(s._id.toString()));

      // إضافة الادمن
      admins.forEach((a) => recipients.add(a._id.toString()));

      // إضافة رئيس الجامعة
      presidents.forEach((p) => recipients.add(p._id.toString()));

      // إرسال الإشعارات لكل مستخدم
      for (const recipientId of recipients) {
        const exists = await Notification.findOne({
          user: recipientId,
          letter: letter._id,
          message: `مدة الخطاب "${letter.title}" قاربت على الانتهاء.`,
        });
        if (exists) continue;

        const notif = new Notification({
          user: recipientId,
          message: `مدة الخطاب "${letter.title}" قاربت على الانتهاء.`,
          letter: letter._id,
        });

        await notif.save();
        console.log(`✅ Notification sent to user ${recipientId} for letter: ${letter.title}`);

        // إرسال عبر Socket.io
        try {
          const io = getIo();
          io.to(recipientId.toString()).emit("newNotification", notif);
        } catch (err) {
          console.warn("⚠️ Socket.io not initialized yet.");
        }
      }
    }
  } catch (err) {
    console.error("❌ Error in letter expiration check:", err);
  }
});
