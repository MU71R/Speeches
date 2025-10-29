const LetterModel = require("../model/letters");
const adddecision = require("../model/add-decision");

const addLetter = async (req, res) => {
  try {
    const { title, description, decision, date } = req.body;
    if (!title || !description || !decision || !date) {
      return res
        .status(400)
        .json({ success: false, message: "كل الحقول مطلوبة" });
    }
    const decisionData = await adddecision.findById(decision);
    if (!decisionData) {
      return res
        .status(404)
        .json({ success: false, message: "القرار غير موجود" });
    }
    const status = decisionData.supervisor !== null ? "in_progress" : "pending";
    const newLetter = new LetterModel({
      title,
      description,
      decision,
      date,
      status,
      user: req.user._id,
    });
    await newLetter.save();
    res.status(201).json({
      success: true,
      message: "تم إضافة الخطاب بنجاح",
      data: newLetter,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const getallletters = async (req, res) => {
  try {
    const letters = await LetterModel.find()
      .populate("decision")
      .populate("user");
    res.status(200).json({ success: true, data: letters });
  } catch (error) {
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
      user: { $ne: req.user._id }
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
module.exports = {
  addLetter,
  getallletters,
  getletterbyid,
  deletletter,
  updateletter,
  updatestatusbysupervisor,
  updatestatusbyuniversitypresident,
  getUserArchivedLetters,
  getAllArchivedLetters,
  getsupervisorletters,
  getuniversitypresidentletters
};
