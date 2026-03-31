const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

/**
 * Maps an image URL to its corresponding thumbnail URL.
 * Handles both Cloudinary and local storage paths.
 */
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

/**
 * Generates a physically resized and compressed thumbnail file from an original image.
 * Resizes to 200x200 and sets JPEG quality to 60%.
 */
const generateLocalThumbnail = async (imageUrl) => {
  if (!imageUrl || imageUrl.includes('res.cloudinary.com')) return;
  if (!imageUrl.includes('/images/')) return;

  try {
    const filename = imageUrl.split('/images/')[1];
    if (!filename) return;

    const uploadDir = path.join(__dirname, "..", "upload", "images");
    const thumbnailDir = path.join(__dirname, "..", "upload", "thumbnails");

    const originalPath = path.join(uploadDir, filename);
    const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);

    // Ensure thumbnails directory exists
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    if (fs.existsSync(originalPath)) {
      // Use sharp to resize and compress
      await sharp(originalPath)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 60 }) // Reduce quality to 60%
        .toFile(thumbnailPath);

      console.log(`✅ Compressed thumbnail generated: ${thumbnailPath}`);
    }
  } catch (error) {
    console.error("❌ Error generating optimized thumbnail:", error.message);
  }
};

module.exports = {
  createThumbnailUrl,
  generateLocalThumbnail,
};
