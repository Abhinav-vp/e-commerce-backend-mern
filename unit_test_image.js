
const { processAndUpload } = require('./utils/imageUtils');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function unitTest() {
    console.log("🧪 Running Unit Test for processAndUpload...");
    
    // Create a dummy buffer
    const buffer = Buffer.alloc(100, 0); 
    
    try {
        // Test Main Image
        console.log("📸 Testing Main Image processing...");
        const mainUrl = await processAndUpload(buffer, 'test.jpg', 'main');
        console.log("✅ Main URL generated:", mainUrl);
        
        // Test Thumbnail
        console.log("🔍 Testing Thumbnail processing...");
        const thumbUrl = await processAndUpload(buffer, 'test.jpg', 'thumbnail');
        console.log("✅ Thumbnail URL generated:", thumbUrl);
        
        console.log("🌟 UNIT TEST PASSED.");
    } catch (error) {
        console.error("❌ UNIT TEST FAILED:", error);
    }
}

unitTest();
