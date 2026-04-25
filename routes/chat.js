const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const fetchUser = require("../middleware/auth");

// Get chat history for the logged-in user
router.get("/history", fetchUser, async (req, res) => {
  try {
    const userId = req.user.id;
    // Find all messages where sender or receiver is the user
    // We assume user <-> admin communication
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).sort({ timestamp: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, errors: error.message });
  }
});

// Admin: Get chat history for a specific user
router.get("/admin/history/:userId", fetchUser, async (req, res) => {
  try {
    // Basic check: current user should be admin (middleware handles token, we check role here or in route)
    // Normally we'd have an isAdmin check in a separate middleware
    const messages = await Message.find({
      $or: [
        { senderId: req.params.userId },
        { receiverId: req.params.userId }
      ]
    }).sort({ timestamp: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, errors: error.message });
  }
});

// Admin: Get all user IDs who have chatted
router.get("/admin/users", fetchUser, async (req, res) => {
  try {
    const userIds = await Message.distinct("senderId", { isAdmin: false });
    // We could also join with User model to get names, but for simplicity we'll return IDs first
    // and let frontend handle basic info if needed or fetch per user.
    res.json({ success: true, userIds });
  } catch (error) {
    res.status(500).json({ success: false, errors: error.message });
  }
});

module.exports = router;
