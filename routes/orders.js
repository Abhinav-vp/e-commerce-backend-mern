const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const fetchUser = require("../middleware/auth");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    } else if (paymentMethod === "Stripe") {
      // Create Stripe checkout session
      const line_items = items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: item.new_price * 100, // Stripe expects amount in cents
        },
        quantity: item.quantity,
      }));

      // Add shipping if any (currently free)
      // For now, only products

      const session = await stripe.checkout.sessions.create({
        line_items,
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/verify?success=true&orderId=${newOrder._id}`,
        cancel_url: `${process.env.FRONTEND_URL}/verify?success=false&orderId=${newOrder._id}`,
      });

      newOrder.payment = false;
      await newOrder.save();
      res.json({ success: true, session_url: session.url });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Order Creation Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// POST Verify Stripe Payment
router.post("/verifyStripe", fetchUser, async (req, res) => {
  try {
    const { success, orderId } = req.body;
    if (success === "true") {
      await Order.findByIdAndUpdate(orderId, { payment: true, status: "Order Placed" });
      await User.findByIdAndUpdate(req.user.id, { cartData: {} });
      res.json({ success: true, message: "Payment Verified Successfully" });
    } else {
      await Order.findByIdAndDelete(orderId);
      res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.error("Stripe Verification Error:", error);
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
