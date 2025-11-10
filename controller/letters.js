const LetterModel = require("../model/letters");
const adddecision = require("../model/add-decision");
const pdfmodel = require("../model/pdf");
const User = require("../model/user");
const Notification = require("../model/notifications");
const path = require("path");
const { formatEgyptTime } = require("../utils/getEgyptTime");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const QRCode = require("qrcode");
const {
  getUniqueFilePath,
  formatDate,
  fixBracketsRTL,
  getNextTransactionNumber,
} = require("../utils/helperfunction");
const addLetter = async (req, res) => {
  try {
    const {
      title,
      description,
      Rationale,
      decision,
      date,
      StartDate,
      EndDate,
    } = req.body;

    if (!title || !description || !Rationale || !decision || !date) {
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
      Rationale,
      decision,
      date: parsedDate,
      status,
      user: req.user._id,
      letterType: "عامة",
      StartDate,
      EndDate,
      durationDays: EndDate - StartDate,
    });

    await newLetter.save();

    // إرسال إشعار إلى المراجع
    const supervisor = await User.findOne({ role: "supervisor" });
    if (supervisor) {
      const notification = new Notification({
        recipient: supervisor._id,
        message: `تم إضافة خطاب جديد: ${title}`,
        letterId: newLetter._id,
      });
      await notification.save();
    }

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
  try {
    // التأكد من أن المستخدم هو المراجع
    if (req.user.role !== "supervisor") {
      return res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية لتحديث حالة الخطاب",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // التحقق من أن الحالة صالحة
    if (!["pending", "approved", "rejected", "in_progress"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "حالة الخطاب يجب أن تكون pending أو approved أو rejected أو in_progress",
      });
    }

    // جلب الخطاب أولاً لتحديثه
    const letter = await LetterModel.findById(id);

    if (!letter) {
      return res
        .status(404)
        .json({ success: false, message: "الخطاب غير موجود" });
    }
    if (status === "rejected") {
      const { reasonForRejection } = req.body;
      letter.reasonForRejection = reasonForRejection || "لم يتم ذكر سبب";
      letter.status = "rejected";

      await letter.save();

      return res.status(200).json({
        success: true,
        message: `تم رفض الخطاب بنجاح.`,
        data: letter,
      });
    }
    // تحديث الحالة حسب قواعد المراجع
    letter.status = "pending"; // المراجع يحول فقط إلى pending
    letter.approvals = letter.approvals || [];

    // إضافة موافقة المراجع إذا لم تكن موجودة مسبقاً
    const alreadyApproved = letter.approvals.some(
      (a) =>
        a.userId.toString() === req.user._id.toString() &&
        a.role === "supervisor"
    );

    if (!alreadyApproved) {
      letter.approvals.push({
        userId: req.user._id,
        role: "supervisor",
        approved: true,
        date: new Date(),
      });
    }

    await letter.save();

    res.status(200).json({
      success: true,
      message: `تم تحديث حالة الخطاب إلى ${letter.status} وموافقة المراجع مسجلة`,
      data: letter,
    });
  } catch (error) {
    console.error("خطأ أثناء تحديث حالة الخطاب:", error);
    res
      .status(500)
      .json({ success: false, message: "حدث خطأ أثناء تحديث الخطاب" });
  }
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

    const validStatuses = ["pending", "approved", "rejected", "in_progress"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `حالة الخطاب يجب أن تكون واحدة من: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    const letter = await LetterModel.findById(id);

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: "الخطاب غير موجود",
      });
    }

    if (status === "rejected") {
      const { reasonForRejection } = req.body;
      activity.reasonForRejection = reasonForRejection || "لم يتم ذكر سبب";
      await activity.save();
    }
    if (status === "approved") {
      letter.transactionNumber = await getNextTransactionNumber();
      // تحديث حالة الخطاب وإضافة موافقة الرئيس
      letter.status = "approved";
      letter.approvals = letter.approvals || [];
      letter.approvals.push({
        userId: req.user._id,
        role: "UniversityPresident",
        approved: true,
        date: new Date(),
      });
      letter.reviewerApproved = true;

      await letter.save();

      return res.status(200).json({
        success: true,
        message: `تم تحديث حالة الخطاب إلى ${status} بنجاح.`,
        data: letter,
      });
    } else {
      // تحديث الحالات الأخرى
      letter.status = status;
      await letter.save();

      return res.status(200).json({
        success: true,
        message: `تم تحديث حالة الخطاب إلى ${status} بنجاح.`,
        data: letter,
      });
    }
  } catch (error) {
    console.error("خطأ في updatestatusbyuniversitypresident:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
const viewPDF = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../generated-files/", filename);
    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: "خطأ في عرض الملف" });
  }
};
const getAllPDFs = async (req, res) => {
  try {
    const pdfFiles = await pdfmodel
      .find({})
      .populate("userId", "fullname name role");
    res.status(200).json({ success: true, pdfFiles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "حدث خطأ داخلي" });
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
      return res
        .status(404)
        .json({ success: false, message: "الخطاب غير موجود" });
    }

    // توليد PDF بناءً على نوع التوقيع
    letter.signatureType = signatureType;
    const pdfPath = await generateLetterPDF(letter);
    const pdfUrl = `${req.protocol}://${req.get(
      "host"
    )}/generated-files/${path.basename(pdfPath)}`;

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

// جلب كل القرارات التي راجعها المراجع وتمت الموافقة عليها من رئيس الجامعة
const getReviewerArchives = async (req, res) => {
  try {
    const reviewerId = req.user._id;

    // جلب كل الخطابات اللي وافق عليها المراجع وتمت الموافقة من رئيس الجامعة
    const letters = await LetterModel.find({
      approvals: {
        $all: [
          {
            $elemMatch: {
              userId: reviewerId,
              role: "supervisor",
              approved: true,
            },
          },
          { $elemMatch: { role: "UniversityPresident", approved: true } },
        ],
      },
    })
      .populate("user", "fullname") // بيانات صاحب القرار
      .populate("decision")
      .sort({ date: -1 });

    res.json({ success: true, data: letters });
  } catch (err) {
    console.error("خطأ أثناء جلب أرشيف المراجعين:", err);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الأرشيف" });
  }
};
const addarchivegeneralletters = async (req, res) => {
  try {
    const { title, date, breeif, letterType } = req.body;

    if (!title || !breeif || !letterType) {
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
      letterType,
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
};

const generateLetterPDF = async (letter) => {
  // ✅ استخدم اسم فريد دائمًا لتفادي قفل الملف
  const safeTitle = letter.title.replace(/[<>:"/\\|?*]+/g, "_"); // تأمين الاسم
  const uniquePath = getUniqueFilePath(
    path.join(__dirname, "../generated-files"),
    safeTitle,
    ".pdf"
  );

  const fileName = path.basename(uniquePath);
  const localPath = uniquePath;

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    bufferPages: true,
    autoFirstPage: false,
  });

  const stream = fs.createWriteStream(localPath);
  doc.pipe(stream);

  const regularFont = path.join(__dirname, "../fonts/Arial.ttf");
  if (fs.existsSync(regularFont)) doc.registerFont("Arial", regularFont);

  const pageWidth = 595;
  const pageHeight = 842;

  const isScannedSignature =
    letter.signatureType === "الممسوحة ضوئياً" ||
    letter.signatureType === "الممسوحة ضوئيا";

  const qrData = `https://verify.qena.edu.eg/check?id=${letter._id}`;
  const qrBuffer = await QRCode.toBuffer(qrData, { width: 100 });

  const setBaseFont = (size = 14) => {
    doc.font("Arial").fontSize(size).fillColor("#000000");
  };

  const drawHeader = () => {
    if (!isScannedSignature) return;
    const headerPath = path.join(__dirname, "../assets/header.png");
    if (fs.existsSync(headerPath)) {
      const headerWidth = pageWidth - 140;
      const headerX = (pageWidth - headerWidth) / 2;
      const headerY = 50;
      doc.image(headerPath, headerX, headerY, {
        width: headerWidth,
        height: 100,
      });
    }
  };

  const toArabicNumerals = (num) => {
    const arabic = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(num)
      .split("")
      .map((d) => arabic[d])
      .join("");
  };

  const drawFooter = (isScan = false) => {
    const qrX = pageWidth - 150;
    const qrY = pageHeight - 180;

    doc.image(qrBuffer, qrX, qrY, { width: 70 });
    setBaseFont(7);
    doc.text("للتأكد من صحة المعاملة فضلاً امسح الكود", qrX - 20, qrY + 75, {
      align: "center",
      width: 100,
      features: ["rtla"],
    });
    setBaseFont(10);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const arabicDate = `${month}/${day}/${year}`;

    const infoX = qrX - 130;
    let infoY = qrY + 15;
    const currentPageNumber = doc.bufferedPageRange().count;
    const arabicPageNumber = toArabicNumerals(currentPageNumber);
    const transactionNumber = letter.transactionNumber || 1;
    const arabicTransactionNumber = toArabicNumerals(transactionNumber);

    doc.text(`رقم المعاملة: ${arabicTransactionNumber}`, infoX, infoY, {
      align: "right",
      width: 130,
      features: ["rtla"],
    });
    infoY += 18;
    doc.text(`تاريخ المعاملة: ${formatDate(arabicDate)}`, infoX, infoY, {
      align: "right",
      width: 130,
      features: ["rtla"],
    });
    infoY += 18;
    doc.text(`رقم الصفحة: ${arabicPageNumber}`, infoX, infoY, {
      align: "right",
      width: 130,
      features: ["rtla"],
    });

    if (isScan) {
      const leftX = 80;
      let footerY = pageHeight - 200;
      setBaseFont(14);
      doc.text("الأستاذ الدكتور", leftX, footerY, {
        align: "left",
        width: pageWidth - leftX - 70,
        features: ["rtla"],
      });
      footerY += 30;
      setBaseFont(22);
      doc.text("أحمد عكاوي", leftX - 10, footerY, {
        align: "left",
        width: pageWidth - leftX - 70,
        features: ["rtla"],
      });
      footerY += 30;
      const signaturePath = path.join(__dirname, "../assets/singnature.png");
      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, leftX - 15, footerY, {
          width: 100,
          height: 50,
        });
      }
      footerY += 50;
      setBaseFont(14);
      doc.text("رئيس الجامعة", leftX, footerY, {
        align: "left",
        width: pageWidth - leftX - 70,
        features: ["rtla"],
      });
    }
  };

  const addNewPage = () => {
    doc.addPage();
    setBaseFont();
    drawHeader();
    drawFooter(isScannedSignature);
  };

  doc.addPage();
  setBaseFont();
  drawHeader();
  drawFooter(isScannedSignature);

  const topMargin = 170;
  const bottomMargin = 250;
  const contentWidth = pageWidth - 140;
  const maxContentHeight = pageHeight - topMargin - bottomMargin;

  function flipAllNumbers(text) {
    let result = text.replace(/([٠-٩]+)\/([٠-٩]+)\/([٠-٩]+)/g, "$3/$2/$1");
    result = result.replace(/[٠-٩]+/g, (match) =>
      match.split("").reverse().join("")
    );
    return result;
  }
  let currentY = topMargin;
  // ✅ طباعة عنوان "رئيس الجامعة"
  setBaseFont(16, true); // bold
  doc.text("رئيس الجامعة:-", 70, currentY, {
    align: "right",
    width: contentWidth,
    features: ["rtla"],
    underline: true,
  });
  currentY = doc.y + 20;

  // ✅ طباعة rationale
  setBaseFont(14);
  const rationaleText = flipAllNumbers(fixBracketsRTL(letter.Rationale || ""));
  doc.text(rationaleText, 70, currentY, {
    align: "right",
    width: contentWidth,
    features: ["rtla"],
    lineGap: 6,
  });
  currentY = doc.y + 30;

  // ✅ طباعة كلمة "قرر" في المنتصف
  setBaseFont(16, true);
  doc.text(fixBracketsRTL("(قرر)"), 0, currentY, {
    align: "center",
    width: doc.page.width,
  });
  currentY = doc.y + 30;

  // ✅ بعد كده يبدأ كتابة description زي الكود بتاعك
  const fullText = flipAllNumbers(fixBracketsRTL(letter.description || ""));
  setBaseFont(14);
  const lines = [];
  const paragraphs = fullText.split("\n");

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const testWidth = doc.widthOfString(testLine, { features: ["rtla"] });
      if (testWidth > contentWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else currentLine = testLine;
    }
    if (currentLine) lines.push(currentLine);
  }

  for (const line of lines) {
    const lineHeight = doc.heightOfString(line || " ", {
      width: contentWidth,
      features: ["rtla"],
      lineGap: 6,
    });
    if (currentY + lineHeight > topMargin + maxContentHeight) {
      addNewPage();
      currentY = topMargin;
    }
    setBaseFont(14);
    doc.text(line || " ", 70, currentY, {
      align: "right",
      width: contentWidth,
      features: ["rtla"],
      lineGap: 6,
    });
    currentY = doc.y;
  }

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  // ✅ توليد رابط HTTP يمكن فتحه في المتصفح
  const publicUrl = `http://localhost:3000/generated-files/${fileName}`;

  // ✅ حفظ الرابط في قاعدة البيانات
  await pdfmodel.create({
    pdfurl: publicUrl,
    userId: letter.user,
  });
  return publicUrl;
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
  getReviewerArchives,
  addarchivegeneralletters,
  getAllArchivedLetters,
  getsupervisorletters,
  getuniversitypresidentletters,
  generateLetterPDF,
  printLetterByType,
  viewPDF,
  getAllPDFs,
};
