const jwt = require("jsonwebtoken");
const { promisify } = require("util");

// check token function
async function verifyTokenMiddleware(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: "You must be logged in" });
  }

  try {
    const decoded = await promisify(jwt.verify)(
      authorization,
      process.env.JWT_SECRET
    );

    req.user = {
      _id: decoded.userId,
      role: decoded.role,
      name: decoded.username,
      sector: decoded.sector,
      assignedDecision: decoded.assignedDecision,
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

// check if user is admin
function isAdmin(req, res, next) {
  if (req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admins only." });
}

// check if user is the owner of the resource or admin
function authorizeOwnerOrAdmin(req, res, next) {
  const requestedId = req.params.id || req.params.userId || req.params.user || null;
  const loggedInUserId = req.user._id.toString();
  if (!requestedId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (req.user.role === "admin" || loggedInUserId === requestedId) {
    return next();
  }

  return res.status(403).json({ message: "Access denied." });
}
module.exports = { verifyTokenMiddleware, isAdmin, authorizeOwnerOrAdmin };