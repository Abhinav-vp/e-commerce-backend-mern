const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const fetchUser = require("../middleware/auth");
const upload = require("../middleware/cloudinary"); // Import your new middleware
const fs = require("fs");
const path = require("path");
const { createThumbnailUrl, generateLocalThumbnail } = require("../utils/imageUtils");

// (Keep your existing verifyAdmin middleware here)
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

// --- Image Utilities are now imported from ../utils/imageUtils ---


// --- 1. GET ALL PRODUCTS (FOR ADMIN) ---
router.get("/products", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ id: -1 });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- 2. ADD PRODUCT ROUTE ---
// Notice the `upload.single('imageFile')` added to the route
router.post("/products/add", fetchUser, verifyAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, category, new_price, old_price, sub_images } = req.body;
    
    // Auto-generate the next available ID
    const lastProduct = await Product.findOne().sort({ id: -1 });
    const id = lastProduct ? lastProduct.id + 1 : 1;

    // If a file was uploaded, use the correctly built path.
    let originalImageUrl;
    if (req.file) {
      if (isCloudinaryConfigured) {
        originalImageUrl = req.file.path;
      } else {
        const port = process.env.PORT || 4000;
        const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
        originalImageUrl = `${baseUrl}/images/${req.file.filename}`;
      }
    } else {
      originalImageUrl = req.body.image;
    }

    if (!name) return res.status(400).json({ success: false, error: "Product Name is required" });
    if (!category) return res.status(400).json({ success: false, error: "Category is required" });
    if (!originalImageUrl) return res.status(400).json({ success: false, error: "Main image is required" });
    if (!new_price) return res.status(400).json({ success: false, error: "New Price is required" });
    if (!old_price) return res.status(400).json({ success: false, error: "Old Price is required" });

    const newPriceValue = parseFloat(new_price);
    const oldPriceValue = parseFloat(old_price);

    if (newPriceValue <= 0 || oldPriceValue <= 0) {
      return res.status(400).json({ success: false, error: "Prices must be greater than zero" });
    }

    if (newPriceValue > oldPriceValue) {
      return res.status(400).json({ success: false, error: "New Price cannot be higher than Old Price" });
    }

    // Generate the thumbnail URL using our helper function
    const thumbnailUrl = createThumbnailUrl(originalImageUrl);
    const subThumbnails = (sub_images || []).map(url => createThumbnailUrl(url));

    const newProduct = new Product({
      id,
      name,
      category,
      image: originalImageUrl, // Saves high quality (e.g. 2MB)
      thumbnail: thumbnailUrl, // Saves low quality (e.g. 15KB)
      sub_images: sub_images || [],
      sub_thumbnails: subThumbnails,
      new_price,
      old_price,
    });

    // Generate local thumbnail file if not on Cloudinary (await as it's now async)
    if (!isCloudinaryConfigured) {
      await generateLocalThumbnail(newProduct.image);
      for (const url of (newProduct.sub_images || [])) {
        await generateLocalThumbnail(url);
      }
    }

    await newProduct.save();
    res.json({ success: true, message: "Product added successfully", product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- 2. UPDATE PRODUCT ROUTE ---
router.put("/products/:id", fetchUser, verifyAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, category, new_price, old_price, sub_images } = req.body;
    const product = await Product.findOne({ id: Number(req.params.id) });

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    // Update text fields
    if (name) product.name = name;
    if (category) product.category = category;
    if (sub_images) {
      product.sub_images = sub_images;
      product.sub_thumbnails = sub_images.map(url => createThumbnailUrl(url));
    }

    // New price validation
    if (new_price || old_price) {
      const updatedNewPrice = new_price ? parseFloat(new_price) : product.new_price;
      const updatedOldPrice = old_price ? parseFloat(old_price) : product.old_price;

      if (updatedNewPrice <= 0 || updatedOldPrice <= 0) {
        return res.status(400).json({ success: false, error: "Prices must be greater than zero" });
      }

      if (updatedNewPrice > updatedOldPrice) {
        return res.status(400).json({ success: false, error: "New Price cannot be higher than Old Price" });
      }

      product.new_price = updatedNewPrice;
      product.old_price = updatedOldPrice;
    }

    // IMAGE UPDATE LOGIC
    if (req.file) {
      // New file uploaded: Create fresh URLs
      if (isCloudinaryConfigured) {
        product.image = req.file.path;
      } else {
        const port = process.env.PORT || 4000;
        const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
        product.image = `${baseUrl}/images/${req.file.filename}`;
      }
      product.thumbnail = createThumbnailUrl(product.image);
    } else if (req.body.image && !req.body.image.includes('w_300,q_60')) {
      // If a new URL is provided as a string and isn't already a thumbnail
      product.image = req.body.image;
      product.thumbnail = createThumbnailUrl(req.body.image);
    }

    // Generate local thumbnail file if not on Cloudinary (await as it's now async)
    if (!isCloudinaryConfigured) {
      await generateLocalThumbnail(product.image);
      for (const url of (product.sub_images || [])) {
        await generateLocalThumbnail(url);
      }
    }

    await product.save();
    res.json({ success: true, message: "Product updated successfully", product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// (Keep your existing delete, users, and orders routes below this...)

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

router.get("/users", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


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

// --- GET ALL ORDERS ---
router.get("/orders", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ date: -1 });
    res.json({ success: true, orders: orders.map(o => ({
      ...o._doc,
      totalAmount: o.amount, // normalize for frontend
      createdAt: o.date
    })) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- UPDATE ORDER STATUS ---
router.put("/orders/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    res.json({ success: true, message: "Order status updated", status: order.status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
