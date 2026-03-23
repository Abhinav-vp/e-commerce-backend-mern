const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// POST signup
router.post("/signup", async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        errors: "An account with this email already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create cart data object (empty)
    const cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }

    // Create user
    const user = new User({
      name: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      cartData: cart,
    });

    await user.save();

    // Generate JWT
    const data = { user: { id: user.id } };
    const token = jwt.sign(data, process.env.JWT_SECRET);

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, errors: error.message });
  }
});

// POST login
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({
        success: false,
        errors: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        errors: "Invalid email or password",
      });
    }

    const data = { user: { id: user.id } };
    const token = jwt.sign(data, process.env.JWT_SECRET);

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, errors: error.message });
  }
});

module.exports = router;
