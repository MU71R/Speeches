const LetterModel = require("../model/letters");
const adddecision = require("../model/add-decision");
const path = require("path");
const { formatEgyptTime } = require("../utils/getEgyptTime");
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
  if (req.user.role !== "UniversityPresident") {
    return res.status(403).json({
      success: false,
      message: "ليس لديك صلاحية لتحديث حالة الخطاب",
    });
  }
  if (status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "حالة الخطاب يجب ان تكون pending",
    });
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
  res.status(200).json({ success: true, data: letter });
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
};
