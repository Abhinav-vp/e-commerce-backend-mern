const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const fetchUser = require("../middleware/auth");
const upload = require("../middleware/cloudinary"); // Import your new middleware

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

// --- Check for Cloudinary configuration (mirroring index.js) ---
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

const createThumbnailUrl = (originalUrl) => {
  if (!originalUrl || !originalUrl.includes('res.cloudinary.com')) return originalUrl;

  // Use a more robust split to ensure we only target the transformation section
  const parts = originalUrl.split('/upload/');
  
  // Added f_auto (WebP conversion) and removed redundant h_300 to let it scale naturally
  return `${parts[0]}/upload/w_300,q_60,f_auto/${parts[1]}`;
};


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
    const { id, name, category, new_price, old_price, sub_images } = req.body;
    
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

    if (!id || !name || !category || !originalImageUrl || !new_price || !old_price) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const existingProduct = await Product.findOne({ id });
    if (existingProduct) {
      return res.status(400).json({ success: false, error: "Product with this ID already exists" });
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
    if (new_price) product.new_price = new_price;
    if (old_price) product.old_price = old_price;
    if (sub_images) {
      product.sub_images = sub_images;
      product.sub_thumbnails = sub_images.map(url => createThumbnailUrl(url));
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

router.get("/orders", fetchUser, verifyAdmin, async (req, res) => {
  try {
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

router.put("/orders/:id", fetchUser, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    res.json({ success: true, message: "Order status updated", status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
