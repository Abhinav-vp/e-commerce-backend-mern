const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  thumbnail: { type: String, required: false },
  sub_images: { type: [String], default: [] },
  sub_thumbnails: { type: [String], default: [] },
  category: {
    type: String,
    required: true,
    enum: ["women", "men", "kid"],
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Product", productSchema);
