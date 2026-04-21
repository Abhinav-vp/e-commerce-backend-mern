const express = require("express");
const router = express.Router();
const User = require("../models/User");
const fetchUser = require("../middleware/auth");

// POST add item to cart
router.post("/add", fetchUser, async (req, res) => {
  try {
    const userData = await User.findById(req.user.id);
    const cartData = userData.cartData || {};
    const { itemId, size, quantity } = req.body;
    const cartKey = size ? `${itemId}_${size}` : itemId;
    const addQuantity = Number(quantity) || 1;

    cartData[cartKey] = (cartData[cartKey] || 0) + addQuantity;

    await User.findByIdAndUpdate(req.user.id, { cartData });
    res.json({ success: true, message: "Item added to cart" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST remove item from cart
router.post("/remove", fetchUser, async (req, res) => {
  try {
    const userData = await User.findById(req.user.id);
    const cartData = userData.cartData || {};
    const { itemId, size } = req.body;
    const cartKey = size ? `${itemId}_${size}` : itemId;

    if (cartData[cartKey] && cartData[cartKey] > 0) {
      cartData[cartKey] -= 1;
      if (cartData[cartKey] === 0) {
        delete cartData[cartKey];
      }
    }

    await User.findByIdAndUpdate(req.user.id, { cartData });
    res.json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET user's cart
router.get("/", fetchUser, async (req, res) => {
  try {
    const userData = await User.findById(req.user.id);
    res.json(userData.cartData || {});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
