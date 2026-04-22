const express = require("express");
const router = express.Router();
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");
const fetchUser = require("../middleware/auth");

// ---- Admin middleware (same pattern as admin.js) ----
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== PUBLIC: Validate a promo code =====
router.post("/validate", fetchUser, async (req, res) => {
  try {
    const { code, subtotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Promo code is required" });
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() });

    if (!promo) {
      return res.status(404).json({ success: false, message: "Invalid promo code" });
    }

    if (!promo.isActive) {
      return res.status(400).json({ success: false, message: "This promo code is no longer active" });
    }

    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return res.status(400).json({ success: false, message: "This promo code has expired" });
    }

    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ success: false, message: "This promo code has reached its usage limit" });
    }

    if (subtotal < promo.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${promo.minOrderAmount} required for this code`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = Math.round((subtotal * promo.discountValue) / 100 * 100) / 100;
    } else {
      discount = Math.min(promo.discountValue, subtotal);
    }

    res.json({
      success: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discount,
      message: `Promo code applied! You save $${discount.toFixed(2)}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== ADMIN: Get all promo codes =====
router.get("/admin/all", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const promos = await PromoCode.find({}).sort({ createdAt: -1 });
    res.json({ success: true, promos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ADMIN: Create promo code =====
router.post("/admin/create", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, error: "Code, discount type, and discount value are required" });
    }

    if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
      return res.status(400).json({ success: false, error: "Percentage discount must be between 1 and 100" });
    }

    if (discountType === "fixed" && discountValue <= 0) {
      return res.status(400).json({ success: false, error: "Fixed discount must be greater than 0" });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, error: "A promo code with this code already exists" });
    }

    const promo = new PromoCode({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxUses: maxUses || 0,
      expiresAt: expiresAt || null,
    });

    await promo.save();
    res.json({ success: true, message: "Promo code created successfully", promo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ADMIN: Update promo code =====
router.put("/admin/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, isActive } = req.body;

    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, error: "Promo code not found" });
    }

    if (code) promo.code = code.toUpperCase().trim();
    if (discountType) promo.discountType = discountType;
    if (discountValue !== undefined) promo.discountValue = discountValue;
    if (minOrderAmount !== undefined) promo.minOrderAmount = minOrderAmount;
    if (maxUses !== undefined) promo.maxUses = maxUses;
    if (expiresAt !== undefined) promo.expiresAt = expiresAt || null;
    if (isActive !== undefined) promo.isActive = isActive;

    await promo.save();
    res.json({ success: true, message: "Promo code updated successfully", promo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ADMIN: Delete promo code =====
router.delete("/admin/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, error: "Promo code not found" });
    }
    res.json({ success: true, message: "Promo code deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
