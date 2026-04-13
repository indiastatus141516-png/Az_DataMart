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
// Fully open CORS (no restrictions)
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
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
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
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
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
};

const dbInitPromise = connectDatabase()
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const ensureDatabaseConnected = async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  try {
    await connectDatabase();
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).json({ message: "Database unavailable" });
  }
};

app.use("/api", ensureDatabaseConnected);

const auth = require("./middleware/auth");
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", auth, require("./routes/admin"));
app.use("/api/data", auth, require("./routes/data"));
app.use("/api/purchase", auth, require("./routes/purchase"));
app.use("/api/profile", require("./routes/profile"));

// global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Server error" });
});

module.exports = app;
