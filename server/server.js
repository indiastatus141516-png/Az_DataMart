const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

// Load environment variables
dotenv.config();

// Disable mongoose debug mode to avoid cluttering logs
mongoose.set("debug", false);

const app = express();

// ---------------------
// Middleware
// ---------------------
app.use(cookieParser());
app.set("trust proxy", true);

// Fully open CORS (no restrictions)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Client-Id",
  );
  next();
});

app.options("*", (req, res) => {
  res.sendStatus(204);
});

// Increase payload size limit to handle large JSON requests
app.use(express.json({ limit: "30mb" })); // Accept JSON up to 10MB
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// 👇 Root Route for testing deployment
app.get("/", (req, res) => {
  res.send("Backend API is running 🚀");
});

// ---------------------
// MongoDB connection
// ---------------------
const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }
  await mongoose.connect(process.env.MONGODB_URI);
};

const dbInitPromise = connectDatabase()
  .then(async () => {
    console.log("MongoDB connected");

    const User = require("./models/User");
    const bcrypt = require("bcryptjs");
    const auth = require("./middleware/auth");

    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const adminUser = new User({
        userId: "admin001",
        email: "admin@datamartx.com",
        password: hashedPassword,
        status: "approved",
        role: "admin",
        requestedAt: new Date(),
      });
      await adminUser.save();
      console.log(
        "Default admin user created: email: admin@datamartx.com, password: admin123",
      );
    }

    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/admin", auth, require("./routes/admin"));
    app.use("/api/data", auth, require("./routes/data"));
    app.use("/api/purchase", auth, require("./routes/purchase"));
    app.use("/api/profile", require("./routes/profile"));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.use(async (req, res, next) => {
  if (req.path === "/" || req.path === "/favicon.ico") return next();
  try {
    await dbInitPromise;
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database is not connected");
    }
    next();
  } catch (err) {
    console.error("DB unavailable", err);
    res.status(500).json({ message: "Database unavailable" });
  }
});

module.exports = app;
