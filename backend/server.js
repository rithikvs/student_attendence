require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const studentRoutes = require("./routes/student");
const attendanceRoutes = require("./routes/attendence");
const authRoutes = require("./routes/auth");

const app = express();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

connectDB();

// CORS configuration to allow Vercel frontend
const corsOptions = {
  origin: [
    'http://localhost:3002',
    'https://student-attendence-three.vercel.app',
    /\.vercel\.app$/  // Allow all Vercel preview deployments
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/student", studentRoutes);
app.use("/attendence", attendanceRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
