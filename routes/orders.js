const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const fetchUser = require("../middleware/auth");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Lazy-initialize Razorpay (avoids crash when env vars are missing)
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// POST Create Order (COD or Razorpay)
router.post("/place", fetchUser, async (req, res) => {
  try {
    const { items, amount, address, paymentMethod, promoCode } = req.body;
    const userId = req.user.id;

    // Validate order has items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty. Please add items before placing an order." });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid order amount." });
    }

    // Server-side promo code validation & discount calculation
    let discount = 0;
    let appliedPromoCode = null;

    if (promoCode) {
      const PromoCode = require("../models/PromoCode");
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase().trim() });

      if (promo && promo.isActive) {
        const notExpired = !promo.expiresAt || new Date() <= promo.expiresAt;
        const withinUsageLimit = promo.maxUses === 0 || promo.usedCount < promo.maxUses;
        const meetsMinimum = amount >= promo.minOrderAmount;

        if (notExpired && withinUsageLimit && meetsMinimum) {
          if (promo.discountType === "percentage") {
            discount = Math.round((amount * promo.discountValue) / 100 * 100) / 100;
          } else {
            discount = Math.min(promo.discountValue, amount);
          }
          appliedPromoCode = promo.code;
          // Increment usage count
          promo.usedCount += 1;
          await promo.save();
        }
      }
    }

    const finalAmount = Math.max(0, amount - discount);

    // Create a new order in DB
    const newOrder = new Order({
      userId,
      items,
      amount: finalAmount,
      address,
      paymentMethod,
      promoCode: appliedPromoCode,
      discount,
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
        amount: Math.round(finalAmount * 100), // in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      getRazorpay().orders.create(options, async (err, order) => {
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

// GET Track Order Details (Enhanced simulated Google Tracking)
router.get("/track/:orderId", fetchUser, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Define coordinates for simulation (London area or any set coordinates)
    const warehouseCoords = { lat: 51.5074, lng: -0.1278 };
    const deliveryCoords = { lat: 51.6500, lng: 0.1000 };

    // Generate a simple linear route between warehouse and delivery
    const generateRoutePoints = (start, end, steps = 20) => {
      const points = [];
      for (let i = 0; i <= steps; i++) {
        points.push({
          lat: start.lat + (end.lat - start.lat) * (i / steps),
          lng: start.lng + (end.lng - start.lng) * (i / steps),
        });
      }
      return points;
    };

    const routePoints = generateRoutePoints(warehouseCoords, deliveryCoords);

    // Determine current driver index based on status
    let driverIndex = 0;
    if (order.status === "Processing") driverIndex = 5;
    if (order.status === "Shipped") driverIndex = 12;
    if (order.status === "Out for Delivery") driverIndex = 18;
    if (order.status === "Delivered") driverIndex = 20;

    // Mock tracking milestones based on order status and date
    const milestones = [
      { status: "Order Placed", time: new Date(order.date).toLocaleString(), location: "System", completed: true },
      { status: "Processing", time: new Date(order.date + 3600000).toLocaleString(), location: "Warehouse A", completed: ["Processing", "Shipped", "Out for Delivery", "Delivered"].includes(order.status) },
      { status: "Shipped", time: new Date(order.date + 86400000).toLocaleString(), location: "Distribution Center", completed: ["Shipped", "Out for Delivery", "Delivered"].includes(order.status) },
      { status: "Out for Delivery", time: new Date(order.date + 172800000).toLocaleString(), location: "Local Hub", completed: ["Out for Delivery", "Delivered"].includes(order.status) },
      { status: "Delivered", time: new Date(order.date + 200000000).toLocaleString(), location: order.address.city || "Delivery Address", completed: order.status === "Delivered" },
    ];

    res.json({
      success: true,
      status: order.status,
      milestones,
      routePoints,
      currentLocation: routePoints[driverIndex],
      destination: deliveryCoords,
      origin: warehouseCoords,
      orderId: order._id,
      amount: order.amount,
      address: order.address,
      estimatedArrival: new Date(order.date + 200000000).toLocaleString(),
    });
  } catch (error) {
    console.error("Tracking Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;

