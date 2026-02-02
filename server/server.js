const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
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
// Configure CORS to accept multiple known origins (supports comma-separated CLIENT_URL)
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());
const corsOptions = {
  origin: function (origin, callback) {
    // allow non-browser requests (curl, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error("CORS policy: origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Client-Id",
  ],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// allow preflight for all routes
app.options("/", cors(corsOptions));

// Increase payload size limit to handle large JSON requests
app.use(express.json({ limit: "30mb" })); // Accept JSON up to 10MB
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// 👇 Root Route for testing deployment
app.get("/", (req, res) => {
  res.send("Backend API is running 🚀");
});

// ---------------------
// MongoDB connection
// ---------------------
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // ---------------------
    // Create default admin user if not exists
    // ---------------------
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
        "Default admin user created: email: admin@datamartx.com, password: admin123"
      );
    }

    // ---------------------
    // Routes
    // ---------------------
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/admin", auth, require("./routes/admin"));
    app.use("/api/data", auth, require("./routes/data"));
    app.use("/api/purchase", auth, require("./routes/purchase"));
    app.use("/api/profile", require("./routes/profile"));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
