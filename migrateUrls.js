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
        const OLD_URLS = ["http://localhost:7000", "http://localhost:4000"];
        const NEW_URL = process.env.BASE_URL;

        if (!NEW_URL || NEW_URL.includes("your-production-url")) {
            console.error("❌ Error: BASE_URL is not set or still has the placeholder value in .env.");
            process.exit(1);
        }

        console.log(`🚀 Migrating from ${OLD_URLS.join(", ")} to ${NEW_URL}...`);

        for (const product of products) {
            let changed = false;

            const updateUrl = (url) => {
                if (!url) return url;
                for (const old of OLD_URLS) {
                    if (url.startsWith(old)) return url.replace(old, NEW_URL);
                }
                return url;
            };

            const oldImage = product.image;
            product.image = updateUrl(product.image);
            if (oldImage !== product.image) {
                changed = true;
                console.log(`🖼️ Updated image for Product ${product.id}`);
            }

            const oldThumb = product.thumbnail;
            product.thumbnail = updateUrl(product.thumbnail);
            if (oldThumb !== product.thumbnail) {
                changed = true;
                console.log(`📏 Updated thumbnail for Product ${product.id}`);
            }

            // Also check sub_images
            if (product.sub_images && product.sub_images.length > 0) {
                const originalSub = JSON.stringify(product.sub_images);
                product.sub_images = product.sub_images.map(url => updateUrl(url));
                if (originalSub !== JSON.stringify(product.sub_images)) changed = true;
            }

            if (product.sub_thumbnails && product.sub_thumbnails.length > 0) {
                const originalSubThumb = JSON.stringify(product.sub_thumbnails);
                product.sub_thumbnails = product.sub_thumbnails.map(url => updateUrl(url));
                if (originalSubThumb !== JSON.stringify(product.sub_thumbnails)) changed = true;
            }

            if (changed) {
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
