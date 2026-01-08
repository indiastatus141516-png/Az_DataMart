const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists and is approved
    const user = await User.findOne({ userId: decoded.userId });
    if (!user || user.status !== "approved") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.user = user; // Store full user object
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const authProfile = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent blocked users from using profile endpoints
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.user = user; // Store full user object
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== role)
    return res.status(403).json({ message: `${role} access required` });
  next();
};

module.exports = auth;
module.exports.authProfile = authProfile;
module.exports.requireRole = requireRole;
