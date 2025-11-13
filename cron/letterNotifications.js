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
    const letters = await Letter.find({
      EndDate: { $gte: today },
    });

    if (!letters.length) return console.log("لا توجد خطابات منتهية قريباً.");

    const [supervisors, admins, presidents] = await Promise.all([
      User.find({ role: "supervisor" }),
      User.find({ role: "admin" }),
      User.find({ role: "UniversityPresident" }),
    ]);

    for (const letter of letters) {
      const diffTime = letter.EndDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // إرسال فقط إذا الفارق <= 30 يوم وفرق الأيام مضاعف 5
      if (diffDays > 30 || diffDays % 5 !== 0) continue;

      const recipients = new Set();

      if (letter.user) recipients.add(letter.user.toString());
      supervisors.forEach((s) => recipients.add(s._id.toString()));
      admins.forEach((a) => recipients.add(a._id.toString()));
      presidents.forEach((p) => recipients.add(p._id.toString()));

      for (const recipientId of recipients) {
        const exists = await Notification.findOne({
          user: recipientId,
          letter: letter._id,
          message: `مدة الخطاب "${letter.title}" قاربت على الانتهاء.`,
        });
        if (exists) continue;

        const notif = new Notification({
          user: recipientId,
          message: `مدة الخطاب "${letter.title}" قاربت على الانتهاء. باقي ${diffDays} يوم.`,
          letter: letter._id,
        });

        await notif.save();
        console.log(`✅ Notification sent to user ${recipientId} for letter: ${letter.title}`);

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

