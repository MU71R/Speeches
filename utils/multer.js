const multer = require("multer");
const path = require("path");
const fs = require("fs");

// إنشاء مجلد uploads لو مش موجود
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد مكان الحفظ واسم الملف
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // يحفظ داخل uploads/
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

module.exports = upload;
