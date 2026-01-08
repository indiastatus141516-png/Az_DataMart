const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");
const Counter = require("../models/Counter");

exports.register = async (req, res) => {
  try {
    const { email, password, profile } = req.body;

    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Atomically increment a counter to generate sequential user IDs: user01, user02, ...
    const seqDoc = await Counter.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const seq = seqDoc.seq || 1;
    // Fixed 5-digit zero-padding: user00001 ... user10000
    const userId = `user${seq.toString().padStart(5, "0")}`;

    const user = new User({
      userId,
      email,
      password: hashedPassword,
      profile: profile || {},
      status: "pending",
    });

    await user.save();

    // Admin will check pending registrations manually

    res
      .status(201)
      .json({ message: "Registered successfully. Awaiting admin approval." });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.status === "blocked") {
      return res
        .status(403)
        .json({ message: "Account is blocked. Contact admin." });
    }

    if (user.status !== "approved") {
      return res.status(403).json({ message: "Account not approved yet" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Create refresh token (rotate on login)
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const refreshToken = jwt.sign({ userId: user.userId }, refreshSecret, {
      expiresIn: "7d",
    });

    // Hash refresh token before storing and save hash on user
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    // Send refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      token,
      user: { userId: user.userId, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Return id and role for current user after verifying access token
exports.me = async (req, res) => {
  try {
    // req.user is set by auth middleware
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ id: req.user.userId, role: req.user.role });
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Refresh access token using httpOnly refresh token cookie
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: "No refresh token provided" });

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, refreshSecret);
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
1
    // Check token against blacklist
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const revoked = await RevokedToken.findOne({ hash: tokenHash });
    if (revoked)
      return res.status(401).json({ message: "Refresh token revoked" });

    const user = await User.findOne({ userId: decoded.userId }).select(
      "+refreshTokenHash"
    );
    if (!user || user.status !== "approved" || !user.refreshTokenHash) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (user.refreshTokenHash !== tokenHash) {
      return res.status(401).json({ message: "Refresh token does not match" });
    }

    // Issue new access token and rotate refresh token
    const newAccessToken = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign({ userId: user.userId }, refreshSecret, {
      expiresIn: "7d",
    });

    // Blacklist old refresh token hash until it naturally expires
    const expiresAt = decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      await RevokedToken.create({ hash: tokenHash, expiresAt });
    } catch (e) {
      // ignore duplicate key errors
    }

    const newHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    user.refreshTokenHash = newHash;
    await user.save();

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: newAccessToken,
      user: { userId: user.userId, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout and clear refresh token cookie
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const refreshSecret =
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        const decoded = jwt.verify(token, refreshSecret);
        const tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");
        const expiresAt = decoded.exp
          ? new Date(decoded.exp * 1000)
          : new Date();

        // Add to revoked tokens so this exact token cannot be used again
        try {
          await RevokedToken.create({ hash: tokenHash, expiresAt });
        } catch (e) {
          // ignore duplicate key
        }

        // If the user's stored refreshTokenHash matches, clear it
        const user = await User.findOne({ userId: decoded.userId }).select(
          "+refreshTokenHash"
        );
        if (user && user.refreshTokenHash === tokenHash) {
          user.refreshTokenHash = undefined;
          await user.save();
        }
      } catch (e) {
        // token could be invalid; still clear cookie
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
