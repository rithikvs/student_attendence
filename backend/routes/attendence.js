const express = require("express");
const Attendance = require("../models/attendence");

const router = express.Router();

// CREATE ATTENDANCE
router.post("/", async (req, res) => {
  try {
    console.log('Creating attendance:', req.body);
    const record = await Attendance.create(req.body);
    res.json(record);
  } catch (err) {
    console.error('Error creating attendance:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  const records = await Attendance.find().populate("student");
  res.json(records);
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    console.log('Updating attendance:', req.params.id, req.body);
    const updated = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error('Error updating attendance:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ message: "Attendance Deleted" });
});

module.exports = router;
