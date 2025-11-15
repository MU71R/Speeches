const multer = require("multer");
const path = require("path");
const fs = require("fs");
const LetterModel = require("../model/letters");

const generatedDir = path.join(__dirname, "../generated-files");
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

const storageGenerated = multer.diskStorage({
  destination: (req, file, cb) => cb(null, generatedDir),
  filename: async (req, file, cb) => {
    try {
      const letterId = req.params.id;
      const letter = await LetterModel.findById(letterId).catch(() => null);

      const title = letter?.title || "";
      const safeTitle = title
        ? title.replace(/[<>:"/\\|?*]+/g, "_")
        : `letter_${letterId || Date.now()}`;

      const finalPath = path.join(generatedDir, `${safeTitle}.pdf`);
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);

      cb(null, `${safeTitle}.pdf`);
    } catch (err) {
      cb(err);
    }
  },
});

const uploadToGenerated = multer({ storage: storageGenerated });

module.exports = {
  uploadToGenerated,
};
