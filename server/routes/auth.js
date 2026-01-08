const express = require("express");
const {
  register,
  login,
  refreshToken,
  logout,
  me,
} = require("../controllers/authController");
const auth = require("../middleware/auth");

const router = express.Router();

// Register user
router.post("/register", register);

// Login user
router.post("/login", login);

// Refresh access token using httpOnly cookie
router.post("/refresh", refreshToken);

// Logout (clears cookie)
router.post("/logout", logout);

// Get current user id and role (verify token)
router.get("/me", auth, me);

module.exports = router;
