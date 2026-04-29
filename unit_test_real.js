
const { processAndUpload } = require('./utils/imageUtils');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function unitTest() {
    console.log("🧪 Running Real Image Unit Test...");
    
    const sourceImage = path.join(__dirname, 'upload', 'images', 'product_1.png');
    if (!fs.existsSync(sourceImage)) {
        console.error("❌ Source image not found at:", sourceImage);
        return;
    }

    const buffer = fs.readFileSync(sourceImage);
    
    try {
        console.log("📸 Processing real image...");
        const mainUrl = await processAndUpload(buffer, 'product_1.png', 'main');
        console.log("✅ Main URL generated:", mainUrl);
        
        console.log("🔍 Processing thumbnail...");
        const thumbUrl = await processAndUpload(buffer, 'product_1.png', 'thumbnail');
        console.log("✅ Thumbnail URL generated:", thumbUrl);
        
        console.log("🌟 UNIT TEST PASSED WITH REAL IMAGE.");
    } catch (error) {
        console.error("❌ UNIT TEST FAILED:", error);
    }
}

unitTest();
