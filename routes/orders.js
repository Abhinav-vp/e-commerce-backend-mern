const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const fetchUser = require("../middleware/auth");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// // Initialize Razorpay
// // These will be taken from .env
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// POST Create Order (COD or Razorpay)
router.post("/place", fetchUser, async (req, res) => {
  try {
    const { items, amount, address, paymentMethod } = req.body;
    const userId = req.user.id;

    // Create a new order in DB
    const newOrder = new Order({
      userId,
      items,
      amount,
      address,
      paymentMethod,
      date: Date.now(),
    });

    if (paymentMethod === "COD") {
      await newOrder.save();
      // Clear cart
      await User.findByIdAndUpdate(userId, { cartData: {} });
      res.json({ success: true, message: "Order placed successfully" });
    } else if (paymentMethod === "Razorpay") {
      // Create Razorpay order
      const options = {
        amount: amount * 100, // in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      razorpay.orders.create(options, async (err, order) => {
        if (err) {
          console.error("Razorpay Order Error:", err);
          return res.status(500).json({ success: false, message: "Razorpay Error" });
        }
        // Save order with razorpay order id
        newOrder.payment = false; // payment yet to be verified
        await newOrder.save();
        res.json({ success: true, order, orderId: newOrder._id });
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Order Creation Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// POST Verify Razorpay Payment
router.post("/verifyRazorpay", fetchUser, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Update order status
      await Order.findByIdAndUpdate(orderId, { payment: true, status: "Order Placed" });
      // Clear cart
      await User.findByIdAndUpdate(req.user.id, { cartData: {} });
      res.json({ success: true, message: "Payment Verified Successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid Signature" });
    }
  } catch (error) {
    console.error("Razorpay Verification Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// GET User Orders
router.get("/userorders", fetchUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
