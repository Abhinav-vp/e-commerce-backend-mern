
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function verifyUpload() {
    console.log("🚀 Starting verification of Optimized Upload Pipeline...");
    
    // Create a larger dummy image to test compression (1MB)
    const dummyPath = path.join(__dirname, 'test_large.jpg');
    const buffer = Buffer.alloc(1024 * 1024, 'a'); // 1MB of data
    fs.writeFileSync(dummyPath, buffer);

    const formData = new FormData();
    formData.append('product', fs.createReadStream(dummyPath));

    try {
        console.log("📡 Sending upload request to http://localhost:7000/upload...");
        const response = await axios.post('http://localhost:7000/upload', formData, {
            headers: formData.getHeaders()
        });

        console.log("✅ Server Response:", JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log("🌟 SUCCESS: Optimized upload pipeline is functional.");
            console.log(`🖼️ Main Image URL: ${response.data.image_url}`);
            console.log(`🔍 Thumbnail URL: ${response.data.thumbnail_url}`);
        } else {
            console.error("❌ FAILED: Server returned success:false");
        }
    } catch (error) {
        console.error("❌ FAILED: Request error");
        if (error.response) {
            console.error("Response Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    } finally {
        if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);
    }
}

verifyUpload();
