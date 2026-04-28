// routes/s3Products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const upload = require('../middleware/s3Upload');

/**
 * @route POST /api/s3/upload
 * @desc Upload product image to S3 and save product data to MongoDB
 * @access Public (or as per your auth logic)
 */
router.post('/upload', upload.single('imageFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { name, category, new_price, old_price, description } = req.body;

    // Basic validation
    if (!name || !new_price) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }
    
    // Get next ID (Incrementing logic as used in existing code)
    const lastProduct = await Product.findOne().sort({ id: -1 });
    const id = lastProduct ? lastProduct.id + 1 : 1;

    const product = new Product({
      id,
      name,
      category: category || 'men', 
      new_price: parseFloat(new_price),
      old_price: old_price ? parseFloat(old_price) : parseFloat(new_price),
      image: req.file.location, // S3 URL returned by multer-s3
      description: description || '',
      thumbnail: req.file.location, // Using S3 URL as thumbnail for now
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created and image uploaded to S3',
      image_url: req.file.location,
      product: product
    });
  } catch (error) {
    console.error('S3 Upload Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
