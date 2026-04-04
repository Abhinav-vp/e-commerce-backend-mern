const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const Product = require("./models/Product");
const fs = require("fs");
// path is already required at the top

const FRONTEND_ASSETS = path.join(
  __dirname,
  "..",
  "frontend",
  "src",
  "components",
  "Assets",
  "Frontend_Assets",
);
const UPLOAD_DIR = path.join(__dirname, "upload", "images");

// Product data matching the existing frontend all_product.js
const products = [
  {
    id: 1,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_1.png",
    new_price: 50.0,
    old_price: 80.5,
  },
  {
    id: 2,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_2.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 3,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_3.png",
    new_price: 60.0,
    old_price: 100.5,
  },
  {
    id: 4,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_4.png",
    new_price: 100.0,
    old_price: 150.0,
  },
  {
    id: 5,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_5.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 6,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_6.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 7,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_7.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 8,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_8.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 9,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_9.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 10,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_10.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 11,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_11.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 12,
    name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
    category: "women",
    image: "product_12.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 13,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_13.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 14,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_14.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 15,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_15.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 16,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_16.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 17,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_17.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 18,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_18.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 19,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_19.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 20,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_20.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 21,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_21.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 22,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_22.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 23,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_23.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 24,
    name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
    category: "men",
    image: "product_24.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 25,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_25.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 26,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_26.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 27,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_27.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 28,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_28.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 29,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_29.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 30,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_30.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 31,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_31.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 32,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_32.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 33,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_33.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 34,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_34.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 35,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_35.png",
    new_price: 85.0,
    old_price: 120.5,
  },
  {
    id: 36,
    name: "Boys Orange Colourblocked Hooded Sweatshirt",
    category: "kid",
    image: "product_36.png",
    new_price: 85.0,
    old_price: 120.5,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Copy product images from frontend assets to backend upload directory
    let imagesCopied = 0;
    for (const product of products) {
      const src = path.join(FRONTEND_ASSETS, product.image);
      const dest = path.join(UPLOAD_DIR, product.image);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        imagesCopied++;
      }
    }
    console.log(`📁 Copied ${imagesCopied} product images to upload/images/`);

    // Clear existing products
    await Product.deleteMany({});
    console.log("🗑️  Cleared existing products");

    // Insert products with relative image URLs (frontend will add the base URL)
    const productsToInsert = products.map((p) => ({
      ...p,
      image: `/images/${p.image}`,
    }));

    await Product.insertMany(productsToInsert);
    console.log(`✅ Seeded ${productsToInsert.length} products`);

    await mongoose.connection.close();
    console.log("🏁 Done! Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
}

seed();
