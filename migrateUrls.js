const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        const products = await Product.find({});
        console.log(`🔍 Found ${products.length} products to check.`);

        let updatedCount = 0;
        const OLD_URL = "http://localhost:7000";
        const NEW_URL = process.env.BASE_URL || "https://your-production-url.onrender.com";

        for (const product of products) {
            let changed = false;

            if (product.image && product.image.startsWith(OLD_URL)) {
                product.image = product.image.replace(OLD_URL, NEW_URL);
                changed = true;
            }

            if (product.thumbnail && product.thumbnail.startsWith(OLD_URL)) {
                product.thumbnail = product.thumbnail.replace(OLD_URL, NEW_URL);
                changed = true;
            }

            // Also check sub_images
            if (product.sub_images && product.sub_images.length > 0) {
                product.sub_images = product.sub_images.map(url => url.startsWith(OLD_URL) ? url.replace(OLD_URL, NEW_URL) : url);
            }

            if (product.sub_thumbnails && product.sub_thumbnails.length > 0) {
                product.sub_thumbnails = product.sub_thumbnails.map(url => url.startsWith(OLD_URL) ? url.replace(OLD_URL, NEW_URL) : url);
            }

            if (changed || (product.sub_images && product.sub_images.some(u => u.includes(OLD_URL)))) {
                await product.save();
                updatedCount++;
            }
        }

        console.log(`✨ Migration complete. Updated ${updatedCount} products.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
