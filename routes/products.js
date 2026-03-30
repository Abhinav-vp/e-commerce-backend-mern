const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const fs = require("fs");
const path = require("path");

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/popular", async (req, res) => {
  try {
    const products = await Product.find({ category: "women" }).limit(4);
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/newcollections", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ id: -1 }).limit(8);
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/category/:category", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const upload = require("../middleware/cloudinary"); 

// --- Check for Cloudinary configuration (mirroring index.js) ---
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

// --- Helper must be at the top ---
const createThumbnailUrl = (url) => {
  if (!url) return url;
  
  // Cloudinary Transformation Rule
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      // Use w_300, q_auto, f_auto for optimized thumbnails
      return `${parts[0]}/upload/w_300,q_auto,f_auto/${parts[1]}`;
    }
  }

  // Local Thumbnail Rule (Mapping /images/ to /thumbnails/)
  if (url.includes('/images/')) {
    return url.replace('/images/', '/thumbnails/').replace(/([^/]+)$/, 'thumb_$1');
  }

  return url;
};

// Helper to generate a local thumbnail file by copying the original
const generateLocalThumbnail = (imageUrl) => {
  if (!imageUrl || imageUrl.includes('res.cloudinary.com')) return;
  if (!imageUrl.includes('/images/')) return;

  try {
    // Convert URL back to filesystem path
    const filename = imageUrl.split('/images/')[1];
    if (!filename) return;

    // Use paths relative to backend root
    const uploadDir = path.join(__dirname, "..", "upload", "images");
    const thumbnailDir = path.join(__dirname, "..", "upload", "thumbnails");

    const originalPath = path.join(uploadDir, filename);
    const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);

    if (fs.existsSync(originalPath) && !fs.existsSync(thumbnailPath)) {
      fs.copyFileSync(originalPath, thumbnailPath);
      console.log(`✅ Thumbnail generated locally: ${thumbnailPath}`);
    }
  } catch (error) {
    console.error("❌ Error generating thumbnail:", error.message);
  }
};

router.post("/add", upload.single('imageFile'), async (req, res) => {
  try {
    const lastProduct = await Product.findOne().sort({ id: -1 });
    const id = lastProduct ? lastProduct.id + 1 : 1;

    // Use the uploaded file path OR the string URL from the body
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

    if (!originalImageUrl) {
      return res.status(400).json({ success: false, error: "Image is required" });
    }

    const product = new Product({
      id,
      name: req.body.name,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
      image: originalImageUrl,             // HIGH QUALITY
      thumbnail: createThumbnailUrl(originalImageUrl), // LOW QUALITY (Required by Schema)
    });

    // Generate local thumbnail file if not on Cloudinary
    if (!isCloudinaryConfigured) {
      generateLocalThumbnail(product.image);
    }

    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE remove a product
router.delete("/remove", async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true, message: "Product removed" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
