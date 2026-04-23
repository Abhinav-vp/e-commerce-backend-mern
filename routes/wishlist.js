const express = require("express");
const router = express.Router();
const User = require("../models/User");
const fetchUser = require("../middleware/auth");

// POST toggle item in wishlist
router.post("/toggle", fetchUser, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, message: "itemId is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let wishlist = user.wishlist || [];
    const index = wishlist.indexOf(Number(itemId));

    if (index === -1) {
      wishlist.push(Number(itemId));
    } else {
      wishlist.splice(index, 1);
    }

    user.wishlist = wishlist;
    await user.save();

    res.json({ success: true, wishlist: user.wishlist, message: index === -1 ? "Added to wishlist" : "Removed from wishlist" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET user's wishlist
router.get("/", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json(user.wishlist || []);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
