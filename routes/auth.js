const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fetchUser = require("../middleware/auth");


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

    // Generate unique referral code
    let referralCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    let isUnique = false;
    while (!isUnique) {
      const checkCode = await User.findOne({ referralCode });
      if (!checkCode) {
        isUnique = true;
      } else {
        referralCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      }
    }

    // Handle referral
    let referredBy = "";
    if (req.body.referralCode) {
      const referrer = await User.findOne({ referralCode: req.body.referralCode });
      if (referrer) {
        referredBy = req.body.referralCode;
        // Give bonus points to referrer
        referrer.rewardPoints += 50; // 50 points for referral
        await referrer.save();
      }
    }

    // Create user
    const user = new User({
      name: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      cartData: cart,
      referralCode,
      referredBy,
      rewardPoints: referredBy ? 20 : 0, // Give 20 points to referred user
    });

    await user.save();

    // Generate JWT
    const data = { user: { id: user.id } };
    const token = jwt.sign(data, process.env.JWT_SECRET);

    res.json({ success: true, token, isAdmin: user.isAdmin });
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

    let isMatch = false;
    if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
      isMatch = await bcrypt.compare(req.body.password, user.password);
    } else {
      // Fallback for older users with plaintext passwords
      if (user.password === req.body.password) {
        isMatch = true;
        // Migrate their password to bcrypt hash
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        await user.save();
      }
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        errors: "Invalid email or password",
      });
    }

    const data = { user: { id: user.id } };
    const token = jwt.sign(data, process.env.JWT_SECRET);

    res.json({ success: true, token, isAdmin: user.isAdmin });
  } catch (error) {
    res.status(500).json({ success: false, errors: error.message });
  }
});

// GET user info
router.get("/me", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, errors: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, errors: error.message });
  }
});

module.exports = router;
