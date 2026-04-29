const path = require("path");
const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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

/**
 * Compresses and resizes an image buffer, then uploads it to the appropriate storage.
 */
const processAndUpload = async (buffer, originalName, type = 'main') => {
  const isS3 = process.env.USE_S3 === "true";
  const timestamp = Date.now();
  const extension = ".webp"; // Switch to WebP for superior compression
  
  // Use professional subfolder structure as requested
  const s3SubFolder = type === 'thumbnail' ? 'products/thumb' : 'products/original';
  const localSubFolder = type === 'thumbnail' ? 'thumbnails' : 'images';
  
  const cleanName = originalName.split('.')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${timestamp}_${cleanName}${extension}`;

  const sharpInstance = sharp(buffer);
  
  if (type === 'thumbnail') {
    sharpInstance.resize(300, 300, { fit: 'cover' }).webp({ quality: 60 });
  } else {
    sharpInstance.resize(1200, null, { withoutEnlargement: true }).webp({ quality: 80 });
  }

  const processedBuffer = await sharpInstance.toBuffer();

  if (isS3) {
    const s3 = new S3Client({
      region: process.env.AWS_REGION.trim().split(" ").pop(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const key = `${s3SubFolder}/${filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: processedBuffer,
      ContentType: "image/webp"
    }));

    // Standard S3 URL
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION.trim().split(" ").pop()}.amazonaws.com/${key}`;
    return url;
  } else {
    // Local storage fallback
    const localDir = path.join(__dirname, "..", "upload", localSubFolder);
    if (!require('fs').existsSync(localDir)) require('fs').mkdirSync(localDir, { recursive: true });
    
    const localPath = path.join(localDir, filename);
    await sharpInstance.toFile(localPath);
    
    return `/${localSubFolder}/${filename}`;
  }
};

module.exports = {
  createThumbnailUrl,
  generateLocalThumbnail,
  processAndUpload,
};
