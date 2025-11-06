const  User  = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const loginController = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ success: false, message: "اسم المستخدم غير صحيح أو كلمة المرور غير صحيح" });
        }
        if (user.status === "inactive") {
            return res.status(403).json({ success: false, message: "المستخدم غير نشط. يرجى الاتصال بالمسؤول." });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "كلمة المرور غير صحيح" });
        }
        const token = jwt.sign({ userId: user._id, name: user.username, role: user.role, sector: user.sector, assignedDecision: user.assignedDecision }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ success: true, token, user });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "حدث خطأ داخلي في الخادم" });
    }
};
module.exports = { loginController };
