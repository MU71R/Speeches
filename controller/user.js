const usermodel = require("../model/user");
const sectormodel = require("../model/sector");
const bcrypt = require("bcryptjs");
const adduser = async (req, res) => {
  try {
    const { username, fullname, password, role, sector } = req.body;
        if (typeof sector === "string") {
      sector = sector.split(",").map(s => s.trim());
    }
    const requirefields = {
      username,
      fullname,
      password,
      role,
      sector,
    };
    const errors = {};
    for (const key in requirefields) {
      if (!requirefields[key]) {
        errors[key] = `${key} مطلوب.`;
      }
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }
    const existingUser = await usermodel.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "اسم المستخدم موجود بالفعل." });
    }
    const newDepartment = await usermodel.create({
      username,
      fullname,
      password,
      role,
      sector,
      status: "active",
    });
    res.status(201).json({ success: true, data: newDepartment }).select("-password");
  } catch (error) {
    console.error("خطأ في انشاء قسم", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};
const addsector = async (req, res) => {
  try {
    const {sector}  = req.body;
    if (!sector) {
      return res
        .status(400)
        .json({ success: false, message: "اسم القطاع مطلوب." });
    }
    const existingSector = await sectormodel.findOne({ sector });
    if (existingSector) {
      return res
        .status(400)
        .json({ success: false, message: "اسم القطاع موجود بالفعل." });
    }
    const newSector = await sectormodel.create({
      sector,
    });
    res.status(201).json({ success: true, data: newSector });
  } catch (error) {
    console.error("خطأ في انشاء قطاع", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};
const getallusers = async (req, res) => {
  try {
    const users = await usermodel.find().populate("sector").select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("خطأ في جلب المستخدمين", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};
const getuserbyid = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usermodel.findOne({ _id: id }).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("خطأ في جلب المستخدم", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};
const updatestatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = await usermodel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود" });
    }
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "حالة المستخدم يجب ان تكون active او inactive",
      });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("خطأ في تحديث حالة المستخدم", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};
const stats = async (req, res) => {
  try {
    const totalUsers = await usermodel.countDocuments();
    const activeUsers = await usermodel.countDocuments({ status: "active" });
    const inactiveUsers = await usermodel.countDocuments({
      status: "inactive",
    });
    res.status(200).json({
      success: true,
      data: { totalUsers, activeUsers, inactiveUsers },
    });
  } catch (error) {
    console.error("خطأ في جلب الاحصائيات", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};

// get all sectors
const getallsectors = async (req, res) => {
  try {
    const sectors = await sectormodel.find();
    res.status(200).json({ success: true, data: sectors });
  } catch (error) {
    console.error("خطأ في جلب القطاعات", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};

// delete user
const deleteuser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usermodel.findByIdAndDelete(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("خطأ في حذف المستخدم", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};

// update user
const updateuser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateuser = req.body;
      if (updateuser.password) {
      updateuser.password = await bcrypt.hash(updateuser.password, 10);
    }
    const user = await usermodel.findByIdAndUpdate(id, updateuser, {
      new: true,
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("خطأ في تحديث المستخدم", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};

// delete sector
const deletesector = async (req, res) => {
  try {
    const { id } = req.params;
    const sector = await sectormodel.findByIdAndDelete(id);
    if (!sector) {
      return res
        .status(404)
        .json({ success: false, message: "القطاع غير موجود" });
    }
    res.status(200).json({ success: true, data: sector });
  } catch (error) {
    console.error("خطأ في حذف القطاع", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};

// update sector
const updatesector = async (req, res) => {
  try {
    const { id } = req.params;
    const updatesector = req.body;
    const sector = await sectormodel.findByIdAndUpdate(id, updatesector, {
      new: true,
    });
    if (!sector) {
      return res
        .status(404)
        .json({ success: false, message: "القطاع غير موجود" });
    }
    res.status(200).json({ success: true, data: sector });
  } catch (error) {
    console.error("خطأ في تحديث القطاع", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم الداخلي",
      error: error.message,
    });
  }
};
const filterBySector = async (req, res) => {
  try {
    const { sector } = req.query;
    const users = await usermodel.find({
      sector: { $regex: sector, $options: "i" },
    });
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "لا يوجد مستخدمين يطابقون هذه التصفية",
      });
    }
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("خطأ اثناء عملية التصفية");
    res.status(500).json({
      success: false,
      message: "خطأ فى الخادم الداخلى",
      error: error.message,
    });
  }
};
const search = async (req, res) => {
  const { q } = req.query;
  try {
    const users = await usermodel.find({
      $or: [
        { fullname: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { sector: { $regex: q, $options: "i" } },
      ],
    });
    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: "لا يوجد مستحدمون يطابقون هذا البحث",
      });
    }
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("خطأ اثناء عملية البحث", error);
    res.status(500).json({
      success: false,
      message: "خطأ فى الخادم الداخلى",
      error: error.message,
    });
  }
};
const sort = async (req, res) => {
  const { sort, sortBy } = req.query;

  try {
    const users = await usermodel
      .find()
      .sort({ [sortBy]: sort === "asc" ? 1 : -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("خطأ اثناء عملية الترتيب", error);
    res.status(500).json({
      success: false,
      message: "خطأ فى الخادم الداخلى",
      error: error.message,
    });
  }
};

const getsupervisors = async (req, res) => {
  try {
    const { sectorId } = req.params;
    if (!sectorId) return res.status(400).json({ message: 'sectorId is required' });

    const supervisors = await usermodel.find({ role: 'supervisor', sector: sectorId })
      .populate('sector', 'name');

    res.json(supervisors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  adduser,
  addsector,
  getallusers,
  getuserbyid,
  stats,
  updatestatus,
  getallsectors,
  deleteuser,
  updateuser,
  deletesector,
  updatesector,
  filterBySector,
  search,
  sort,
  getsupervisors,
};
