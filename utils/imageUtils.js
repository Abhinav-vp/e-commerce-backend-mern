const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { S3Client, PutObjectCommand, PutPublicAccessBlockCommand, PutBucketPolicyCommand } = require("@aws-sdk/client-s3");

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
      // Use w_200, q_auto, f_auto for faster optimized thumbnails
      return `${parts[0]}/upload/w_200,q_auto,f_auto/${parts[1]}`;
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
      // Use sharp to resize and compress for speed (150x150, 50% quality)
      await sharp(originalPath)
        .resize(150, 150, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 50, progressive: true }) // Lower quality for speed
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
    // 200x200 at 50% quality for fast rendering
    sharpInstance.resize(200, 200, { fit: 'cover' }).webp({ quality: 50, effort: 4 });
  } else {
    // 1200 width at 75% quality for original
    sharpInstance.resize(1200, null, { withoutEnlargement: true }).webp({ quality: 75, effort: 4 });
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
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    
    const localPath = path.join(localDir, filename);
    fs.writeFileSync(localPath, processedBuffer);
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 7000}`;
    return `${baseUrl}/${localSubFolder}/${filename}`;
  }
};

/**
 * Configures the S3 bucket for public read access.
 * Disables Block Public Access and sets a bucket policy.
 * Call once at server startup.
 */
const configureBucketAccess = async () => {
  if (process.env.USE_S3 !== "true") return;

  const bucket = process.env.AWS_BUCKET_NAME;
  const s3 = new S3Client({
    region: process.env.AWS_REGION.trim().split(" ").pop(),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Step 1: Disable Block Public Access
    await s3.send(new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }));
    console.log("✅ S3 Block Public Access disabled");

    // Step 2: Set bucket policy for public read
    const policy = {
      Version: "2012-10-17",
      Statement: [{
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucket}/*`,
      }],
    };
    await s3.send(new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }));
    console.log("✅ S3 bucket policy set for public read access");
  } catch (err) {
    console.warn(`⚠️ Could not configure S3 bucket access: ${err.message}`);
    console.warn("   Images may not be accessible. Check AWS permissions.");
  }
};

module.exports = {
  createThumbnailUrl,
  generateLocalThumbnail,
  processAndUpload,
  configureBucketAccess,
};
