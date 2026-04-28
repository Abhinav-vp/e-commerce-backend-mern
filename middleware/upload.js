const path = require("path");
const fs = require("fs");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// Ensure local directories exist (fallback if S3 is not configured)
const uploadDir = path.join(__dirname, "..", "upload", "images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration checks
const isS3Configured = 
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.AWS_BUCKET_NAME &&
  process.env.AWS_ACCESS_KEY_ID !== "your_access_key";

let storage;

if (isS3Configured) {
  console.log("Using AWS S3 for file storage");
  const s3 = new S3Client({
    region: process.env.AWS_REGION.includes(" ") ? process.env.AWS_REGION.split(" ").pop() : process.env.AWS_REGION, // Attempt to extract region code if user puts full name
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
      console.log(`🔑 S3 Key generated: ${filename}`);
      cb(null, filename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set content type
  });
} else {
  console.log("Using Local Disk Storage for file storage");
  // Use local disk storage as fallback
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
