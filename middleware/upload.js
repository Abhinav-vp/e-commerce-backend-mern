const path = require("path");
const fs = require("fs");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Ensure local directories exist (fallback if S3 is not configured)
const uploadDir = path.join(__dirname, "..", "upload", "images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration checks
// S3 is only active if USE_S3 is explicitly set to "true"
const isS3Configured = process.env.USE_S3 === "true";

let storage;

if (isS3Configured) {
  console.log("✅ AWS S3 configuration detected");
  const region = process.env.AWS_REGION.trim().split(" ").pop();
  
  const s3 = new S3Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      console.log(`📡 S3 Upload starting for file: ${file.originalname}`);
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const filename = `products/${Date.now().toString()}-${file.originalname}`;
      cb(null, filename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  });
} else {
  console.log("⚠️ S3 not fully configured. Using Local Disk Storage.");
  storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
  });
}

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  }
});

module.exports = {
  upload,
  isS3Configured
};
