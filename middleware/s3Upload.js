const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const isS3Configured = 
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.AWS_BUCKET_NAME &&
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID !== "your_access_key";

let storage;

if (isS3Configured) {
  storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `products/${Date.now().toString()}-${file.originalname}`);
    },
  });
} else {
  // Graceful fallback to disk storage if S3 is not configured
  const missing = [];
  if (!process.env.AWS_ACCESS_KEY_ID) missing.push("AWS_ACCESS_KEY_ID");
  if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!process.env.AWS_BUCKET_NAME) missing.push("AWS_BUCKET_NAME");
  if (!process.env.AWS_REGION) missing.push("AWS_REGION");

  console.warn(`⚠️ S3 not fully configured. Falling back to local storage. Missing: ${missing.join(", ")}`);
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '..', 'upload', 'images'));
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
}

const upload = multer({ storage: storage });

module.exports = upload;
