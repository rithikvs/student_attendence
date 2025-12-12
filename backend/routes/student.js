const express = require("express");
const Student = require('../models/student');

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

// UPDATE
router.put("/:id", async (req, res) => {
  const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// DELETE
router.delete("/:id", async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted Successfully" });
});

module.exports = router;
