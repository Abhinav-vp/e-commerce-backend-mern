const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const fetchUser = require("../middleware/auth");

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res
        .status(403)
        .json({ success: false, error: "Admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== PRODUCT MANAGEMENT =====

// GET all products (admin view with all details)
router.get("/products", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const products = await Product.find({});
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADD new product
router.post("/products/add", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { id, name, category, image, new_price, old_price } = req.body;

    // Validate required fields
    if (!id || !name || !category || !image || !new_price || !old_price) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({ id });
    if (existingProduct) {
      return res
        .status(400)
        .json({ success: false, error: "Product with this ID already exists" });
    }

    const newProduct = new Product({
      id,
      name,
      category,
      image,
      new_price,
      old_price,
    });

    await newProduct.save();
    res.json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// EDIT product
router.put("/products/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { name, category, image, new_price, old_price } = req.body;
    const product = await Product.findOne({ id: Number(req.params.id) });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    if (name) product.name = name;
    if (category) product.category = category;
    if (image) product.image = image;
    if (new_price) product.new_price = new_price;
    if (old_price) product.old_price = old_price;

    await product.save();
    res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE product
router.delete("/products/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      id: Number(req.params.id),
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== USER MANAGEMENT =====

// GET all users
router.get("/users", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET user by ID
router.get("/users/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE user role (make admin)
router.put("/users/:id/role", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { isAdmin } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, message: "User role updated", user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE user
router.delete("/users/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ORDER MANAGEMENT (MOCK) =====

// GET all orders (mock data - in real app, need Order model)
router.get("/orders", fetchUser, verifyAdmin, async (req, res) => {
  try {
    // TODO: Replace with real Order model once implemented
    const orders = [
      {
        _id: "order_1",
        userId: "user_1",
        products: [
          { id: 1, quantity: 2 },
          { id: 3, quantity: 1 },
        ],
        totalAmount: 235.0,
        status: "pending",
        createdAt: new Date(),
      },
      {
        _id: "order_2",
        userId: "user_2",
        products: [{ id: 5, quantity: 1 }],
        totalAmount: 85.0,
        status: "completed",
        createdAt: new Date(),
      },
    ];

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE order status
router.put("/orders/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    // TODO: Update with real Order model
    res.json({ success: true, message: "Order status updated", status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
