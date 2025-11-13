const multer = require("multer");
const path = require("path");
const fs = require("fs");
const LetterModel = require("../model/letters"); // موديل الخطابات

// مجلد التخزين النهائي
const generatedDir = path.join(__dirname, "../generated-files");
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

// إعداد multer لتخزين الملف مباشرة باسم الخطاب
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, generatedDir);
  },
  filename: async (req, file, cb) => {
    try {
      const letterId = req.params.id;
      const letter = await LetterModel.findById(letterId);
      const safeTitle = letter.title
        ? letter.title.replace(/[<>:"/\\|?*]+/g, "_")
        : `letter_${letterId}`;

      const finalPath = path.join(generatedDir, `${safeTitle}.pdf`);

      // لو الملف موجود مسبقاً → اعمله overwrite
      if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
      }

      cb(null, `${safeTitle}.pdf`);
    } catch (err) {
      cb(err);
    }
  },
});

const upload = multer({ storage });

module.exports = upload;
