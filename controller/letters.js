const LetterModel = require("../model/letters");
const adddecision = require("../model/add-decision");
const path = require("path");
const { formatEgyptTime } = require("../utils/getEgyptTime");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const QRCode = require("qrcode");
const {  getImageBuffer,
  getUniqueFilePath,
  formatDate,
  writeField,
  reverseNumbersInString, } = require("../utils/helperfunction");
const addLetter = async (req, res) => {
  try {
    const { title, description, decision, date } = req.body;

    if (!title || !description || !decision || !date) {
      return res.status(400).json({
        success: false,
        message: "كل الحقول مطلوبة",
      });
    }

    const decisionData = await adddecision.findById(decision);
    if (!decisionData) {
      return res.status(404).json({
        success: false,
        message: "القرار غير موجود",
      });
    }

    const status = decisionData.supervisor ? "in_progress" : "pending";

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "تاريخ غير صالح",
      });
    }

    const newLetter = new LetterModel({
      title,
      description,
      decision,
      date: parsedDate,
      status,
      user: req.user._id,
      letterType: "عامة",
    });

    await newLetter.save();

    res.status(201).json({
      success: true,
      message: "تم إضافة الخطاب بنجاح",
      data: {
        ...newLetter._doc,
        formattedDate: formatEgyptTime(newLetter.date),
      },
    });
  } catch (error) {
    console.error(" خطأ أثناء إضافة الخطاب:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getallletters = async (req, res) => {
  try {
    const user = req.user; // المستخدم الحالي بعد الـ auth middleware
    const letters = await LetterModel.find()
      .populate({
        path: "decision",
        populate: { path: "sector" },
      })
      .populate("user")
      .sort({ createdAt: -1 });

    // لو المستخدم أدمن أو رئيس الجامعة يشوف الكل
    if (user.role === "admin" || user.role === "president") {
      return res.status(200).json({ success: true, data: letters });
    }
    console.log({
      userSector: user?.sector,
      userDecision: user?.assignedDecision,
      letterSector: letters[0]?.decision?.sector,
      letterDecision: letters[0]?.decision?._id,
    });

    //  فلترة حسب القطاع ونوع القرار
    const filteredLetters = letters.filter((letter) => {
      const decision = letter.decision;

      // تحويل الـ IDs لسلاسل نصية للمقارنة المضمونة
      const letterSectorId =
        typeof decision?.sector === "object"
          ? decision?.sector?._id?.toString()
          : decision?.sector?.toString();

      const userSectorId =
        typeof user?.sector === "object"
          ? user?.sector?._id?.toString()
          : user?.sector?.toString();

      const letterDecisionId =
        typeof decision === "object"
          ? decision?._id?.toString()
          : decision?.toString();

      const userDecisionId =
        typeof user?.assignedDecision === "object"
          ? user?.assignedDecision?._id?.toString()
          : user?.assignedDecision?.toString();

      // شرط 1: لو المستخدم عنده نوع قرار محدد → لازم يطابق
      if (userDecisionId && letterDecisionId !== userDecisionId) {
        return false;
      }

      // شرط 2: لو المستخدم عنده قطاع محدد → لازم القطاع يطابق
      if (userSectorId && letterSectorId !== userSectorId) {
        return false;
      }

      return true;
    });

    res.status(200).json({
      success: true,
      data: filteredLetters,
      formattedDate: formatEgyptTime(filteredLetters.date),
    });
  } catch (error) {
    console.error("❌ Error in getAllLetters:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getletterbyid = async (req, res) => {
  const { id } = req.params;
  const letter = await LetterModel.findById(id)
    .populate("decision")
    .populate("user");
  if (!letter) {
    return res
      .status(404)
      .json({ success: false, message: "الخطاب غير موجود" });
  }
  res.status(200).json({ success: true, data: letter });
};
const deletletter = async (req, res) => {
  const { id } = req.params;
  const letter = await LetterModel.findByIdAndDelete(id);
  if (!letter) {
    return res
      .status(404)
      .json({ success: false, message: "الخطاب غير موجود" });
  }
  res.status(200).json({ success: true, message: "تم حذف الخطاب بنجاح" });
};
const updateletter = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const letter = await LetterModel.findByIdAndUpdate(id, data, { new: true });
  if (!letter) {
    return res
      .status(404)
      .json({ success: false, message: "الخطاب غير موجود" });
  }
  res.status(200).json({ success: true, data: letter });
};
const updatestatusbysupervisor = async (req, res) => {
  if (req.user.role !== "supervisor") {
    return res
      .status(403)
      .json({ success: false, message: "ليس لديك صلاحية لتحديث حالة الخطاب" });
  }
  const { id } = req.params;
  const { status } = req.body;
  if (!["pending", "approved", "rejected", "in_progress"].includes(status)) {
    return res.status(400).json({
      success: false,
      message:
        "حالة الخطاب يجب ان تكون pending او approved او rejected او in_progress",
    });
  }
  const letter = await LetterModel.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
  if (!letter) {
    return res
      .status(404)
      .json({ success: false, message: "الخطاب غير موجود" });
  }
  if (status !== "in_progress") {
    return res.status(400).json({
      success: false,
      message: "حالة الخطاب يجب ان تكون in_progress",
    });
  }
  res.status(200).json({ success: true, data: letter });
};
const updatestatusbyuniversitypresident = async (req, res) => {
  try {
    if (req.user.role !== "UniversityPresident") {
      return res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية لتحديث حالة الخطاب",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected", "in_progress"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "حالة الخطاب يجب أن تكون pending أو approved أو rejected أو in_progress",
      });
    }

    const letter = await LetterModel.findByIdAndUpdate(id, { status }, { new: true });

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: "الخطاب غير موجود",
      });
    }

    // ✅ لو الحالة approved → لا تنشئ PDF الآن
    if (status === "approved") {
      return res.status(200).json({
        success: true,
        message:
          "تمت الموافقة على الخطاب. برجاء اختيار نوع الطباعة (scan أو real) لاحقًا.",
        data: letter,
      });
    }

    // باقي الحالات (مرفوض، قيد التنفيذ، إلخ)
    res.status(200).json({
      success: true,
      message: `تم تحديث حالة الخطاب إلى ${status} بنجاح.`,
      data: letter,
    });
  } catch (error) {
    console.error("خطأ في updatestatusbyuniversitypresident:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const printLetterByType = async (req, res) => {
  try {
    const { id } = req.params;
    const { signatureType } = req.body;

    if (!["الممسوحة ضوئيا", "حقيقية"].includes(signatureType)) {
      return res.status(400).json({
        success: false,
        message: "نوع الطباعة يجب أن يكون scan أو real فقط.",
      });
    }

    const letter = await LetterModel.findById(id);
    if (!letter) {
      return res.status(404).json({ success: false, message: "الخطاب غير موجود" });
    }

    // توليد PDF بناءً على نوع التوقيع
    letter.signatureType = signatureType;
    const pdfPath = await generateLetterPDF(letter);
    const pdfUrl = `${req.protocol}://${req.get("host")}/generated-files/${path.basename(pdfPath)}`;

    res.status(200).json({
      success: true,
      message: `تم إنشاء ملف PDF بنجاح بنوع الطباعة: ${signatureType}`,
      data: { pdfUrl },
    });
  } catch (error) {
    console.error("خطأ أثناء توليد PDF:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUserArchivedLetters = async (req, res) => {
  try {
    const letters = await LetterModel.find({
      user: req.user._id,
      status: "approved",
    })
      .populate("decision")
      .populate("user");

    res.status(200).json({
      success: true,
      data: letters,
      message: "تم جلب الخطابات المؤرشفة الخاصة بك بنجاح",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllArchivedLetters = async (req, res) => {
  try {
    const letters = await LetterModel.find({
      status: "approved",
      user: { $ne: req.user._id },
    })
      .populate("decision")
      .populate("user");
    res.status(200).json({
      success: true,
      data: letters,
      message: "تم جلب كل الخطابات المؤرشفة ",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const getArchivedLettersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const letters = await LetterModel.find({
      status: "approved",
      letterType: type,
    })
      .populate("decision")
      .populate("user");

    res.status(200).json({ success: true, data: letters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


const addarchivegeneralletters = async (req, res) => {
  try {
    const { title, date, breeif } = req.body;

    if (!title || !breeif) {
      return res
        .status(400)
        .json({ success: false, message: "المعلومات غير كافية" });
    }

    const upload = req.file;

    const letterData = {
      status: "approved",
      title,
      breeif,
      date,
      user: req.user._id,
    };

    if (upload) {
      // نحفظ المسار النسبي فقط (من uploads/)
      letterData.attachment = path.join("uploads", upload.filename);
    }

    const letters = await LetterModel.create(letterData);

    res.status(201).json({ success: true, data: letters });
  } catch (error) {
    console.error("Error adding general letter:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const getsupervisorletters = async (req, res) => {
  try {
    const letters = await LetterModel.find({ status: "in_progress" })
      .populate("decision")
      .populate("user");
    res.status(200).json({ success: true, data: letters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const getuniversitypresidentletters = async (req, res) => {
  try {
    const letters = await LetterModel.find({ status: "pending" })
      .populate("decision")
      .populate("user");
    res.status(200).json({ success: true, data: letters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

const generateLetterPDF = async (letter) => {
  const pdfPath = getUniqueFilePath(
    path.join(__dirname, "../generated-files"),
    `Letter_${letter.id}`,
    ".pdf"
  );

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    bufferPages: true,
  });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // ✅ تحميل الخطوط
  const regularFont = path.join(__dirname, "../fonts/Arial.ttf");
  const boldFont = path.join(__dirname, "../fonts/arialbd.ttf");

  if (fs.existsSync(regularFont)) doc.registerFont("Arial", regularFont);
  if (fs.existsSync(boldFont)) doc.registerFont("arialbd", boldFont);

  doc.font("Arial"); // الخط الأساسي

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // ✅ دالة لتحويل الأرقام العربية فقط
  const toArabicNumbers = (text) => {
    if (!text) return "";
    return text.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  };

  // =====================================================
  // 🟩 حالة التوقيع الممسوح ضوئياً (scan)
  // =====================================================
  if (
    letter.signatureType === "الممسوحة ضوئياً" ||
    letter.signatureType === "الممسوحة ضوئيا"
  ) {
// === الهيدر ===
const headerPath = path.join(__dirname, "../assets/header.png");
let contentStartY = 150; // موقع افتراضي للنص لو مفيش صورة

if (fs.existsSync(headerPath)) {
  const headerWidth = pageWidth - 140;
  const headerX = (pageWidth - headerWidth) / 2;
  const headerY = 50; // موقع الهيدر من فوق
  const headerHeight = 100; // ارتفاع الصورة التقريبي

  // نرسم الصورة
  doc.image(headerPath, headerX, headerY, { width: headerWidth, height: headerHeight });

  // نحدد بداية النص بعد الصورة بـ 30 نقطة زيادة مثلاً
  contentStartY = headerY + headerHeight + 30;
}

// === محتوى الخطاب يبدأ بعد الصورة مباشرة ===
doc.y = contentStartY;
doc.fontSize(12).text(
  toArabicNumbers(reverseNumbersInString(letter.description)),
  70,
  doc.y,
  {
    align: "right",
    width: pageWidth - 140,
    features: ["rtla"],
    lineGap: 6,
  }
);


    // === QR Code ===
    const qrData = `https://verify.qena.edu.eg/check?id=${letter._id}`;
    const qrBuf = await QRCode.toBuffer(qrData, { width: 100 });
    const qrX = pageWidth - 150;
    const qrY = pageHeight - 180;
    doc.image(qrBuf, qrX, qrY, { width: 70 });

    doc.fontSize(9).text(
      "للتأكد من صحة المعاملة فضلاً امسح الكود",
      qrX - 10,
      qrY + 75,
      {
        align: "center",
        width: 100,
        features: ["rtla"],
      }
    );

    // === توقيع رئيس الجامعة ===
    const leftX = 80;
    let footerY = pageHeight - 200;

    // "الأستاذ الدكتور"
    doc.font("Arial")
      .fontSize(16)
      .fillColor("#000000")
      .text("الأستاذ الدكتور", leftX, footerY, {
        align: "left",
        width: pageWidth - leftX - 70,
        features: ["rtla"],
      });

    footerY += 30;

    // "أحمد عكاوي" - بخط كبير وغامق وشمال شوية
    doc.font("arialbd")
      .fontSize(30)
      .fillColor("#000000")
      .text("أحمد عكاوي", leftX - 15, footerY, {
        align: "left",
        width: pageWidth - leftX - 70,
        features: ["rtla"],
      });

    footerY += 30;

    // صورة التوقيع
    const signaturePath = path.join(__dirname, "../assets/singnature.png");
    if (fs.existsSync(signaturePath)) {
      doc.image(signaturePath, leftX-15, footerY, { width: 100 ,height:50});
      footerY += 30;
    }

    footerY += 20;

    // "رئيس الجامعة"
    doc.font("Arial")
      .fontSize(18)
      .fillColor("#000000")
      .text("رئيس الجامعة", leftX, footerY, {
        align: "left",
        width: pageWidth - leftX - 70,
        features: ["rtla"],
      });
  }

// =====================================================
// 🟨 في حالة التوقيع الحقيقي (real)
// =====================================================
else {
  // نحدد المساحة الآمنة داخل التيمبلت الجاهز
  const topMargin = 170; // بداية النص بعد الهيدر في التيمبلت
  const bottomMargin = 200; // نهاية النص قبل التوقيع
  const availableHeight = pageHeight - topMargin - bottomMargin;

  // تعيين موضع الكتابة من فوق
  doc.y = topMargin;

  // كتابة النص داخل المنطقة المحددة
  doc.font("Arial")
    .fontSize(12)
    .fillColor("#000000")
    .text(
      toArabicNumbers(reverseNumbersInString(letter.description)),
      70,
      doc.y,
      {
        align: "right",
        width: pageWidth - 140,
        height: availableHeight,
        features: ["rtla"],
      }
    );
}

// =====================================================
// إنهاء الملف
// =====================================================
doc.end();

await new Promise((resolve, reject) => {
  stream.on("finish", resolve);
  stream.on("error", reject);
});

return pdfPath;
};
module.exports = {
  addLetter,
  getallletters,
  getletterbyid,
  deletletter,
  updateletter,
  updatestatusbysupervisor,
  updatestatusbyuniversitypresident,
  getUserArchivedLetters,
  getArchivedLettersByType,
  addarchivegeneralletters,
  getAllArchivedLetters,
  getsupervisorletters,
  getuniversitypresidentletters,
  generateLetterPDF,
printLetterByType,
};
