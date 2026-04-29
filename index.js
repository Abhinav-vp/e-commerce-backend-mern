const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const { upload, isS3Configured } = require("./middleware/upload");

const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const port = process.env.PORT || 4000;

// Log S3 Status
const { isS3Configured: checkS3 } = require("./middleware/upload");
console.log(`📡 S3 Configuration Status: ${checkS3 ? "ACTIVE" : "INACTIVE (Falling back to local storage)"}`);

// Middleware
app.use(express.json());
app.use(cors());

// Seeding and static folders
const uploadDir = path.join(__dirname, "upload", "images");
const thumbnailDir = path.join(__dirname, "upload", "thumbnails");
app.use("/images", express.static(uploadDir));
app.use("/thumbnails", express.static(thumbnailDir));

// Updated Optimized Image upload endpoint
app.post("/upload", memoryUpload.single("product"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    console.log(`⚡ Processing image: ${req.file.originalname}`);

    // Process and upload both main image and thumbnail in parallel
    const [imageUrl, thumbnailUrl] = await Promise.all([
      processAndUpload(req.file.buffer, req.file.originalname, 'main'),
      processAndUpload(req.file.buffer, req.file.originalname, 'thumbnail')
    ]);

    console.log(`✅ Upload Complete. Main: ${imageUrl}`);

    res.json({
      success: true,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl
    });
  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Image processing failed",
      error: error.message 
    });
  }
});

// Routes
const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const adminRoutes = require("./routes/admin");
const orderRoutes = require("./routes/orders");
const reviewRoutes = require("./routes/reviews");
const promoRoutes = require("./routes/promo");
const wishlistRoutes = require("./routes/wishlist");
const chatRoutes = require("./routes/chat");
const s3ProductsRoutes = require("./routes/s3Products");

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/s3", s3ProductsRoutes);

// Socket.io logic
const Message = require("./models/Message");

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("joinAdmin", () => {
    socket.join("admins");
    console.log("Admin joined the admins room");
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { senderId, receiverId, senderName, message, isAdmin } = data;
      
      const newMessage = new Message({
        senderId,
        receiverId,
        senderName,
        message,
        isAdmin
      });
      
      await newMessage.save();

      // If it's from user, send to admins
      if (!isAdmin) {
        io.to("admins").emit("receiveMessage", newMessage);
      } else {
        // If it's from admin, send to specific user
        io.to(receiverId).emit("receiveMessage", newMessage);
      }
      
      // Also send back to sender for instant update (though client can also do it)
      socket.emit("messageSent", newMessage);
      
    } catch (error) {
      console.error("Socket error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "E-Commerce API is running" });
});

// Error handling middleware (must be AFTER all routes)
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// ---------- Seed function (runs on first in-memory start) ----------
async function seedDatabase() {
  const Product = require("./models/Product");
  const count = await Product.countDocuments();
  if (count > 0) return; // Already seeded

  const FRONTEND_ASSETS = path.join(
    __dirname,
    "..",
    "frontend",
    "src",
    "components",
    "Assets",
    "Frontend_Assets",
  );
  const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;

  const products = [
    {
      id: 1,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_1.png",
      new_price: 50.0,
      old_price: 80.5,
    },
    {
      id: 2,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_2.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 3,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_3.png",
      new_price: 60.0,
      old_price: 100.5,
    },
    {
      id: 4,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_4.png",
      new_price: 100.0,
      old_price: 150.0,
    },
    {
      id: 5,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_5.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 6,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_6.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 7,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_7.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 8,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_8.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 9,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_9.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 10,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_10.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 11,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_11.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 12,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_12.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 13,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_13.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 14,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_14.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 15,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_15.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 16,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_16.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 17,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_17.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 18,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_18.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 19,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_19.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 20,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_20.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 21,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_21.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 22,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_22.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 23,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_23.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 24,
      name: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
      category: "men",
      image: "product_24.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 25,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_25.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 26,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_26.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 27,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_27.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 28,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_28.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 29,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_29.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 30,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_30.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 31,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_31.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 32,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_32.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 33,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_33.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 34,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_34.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 35,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_35.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 36,
      name: "Boys Orange Colourblocked Hooded Sweatshirt",
      category: "kid",
      image: "product_36.png",
      new_price: 85.0,
      old_price: 120.5,
    },
    {
      id: 37,
      name: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
      category: "women",
      image: "product_38.jpeg",
      new_price: 80.0,
      old_price: 150.5,
    },
    {
      id: 38,
      name: "Crop Top",
      category: "women",
      image: "product_37.webp",
      new_price: 60.0,
      old_price: 100.5,
    },
    {
      id: 39,
      name: "Crop Top",
      category: "women",
      image: "product_39.webp",
      new_price: 60.0,
      old_price: 100.5,
    },
  ];

  // Copy images from frontend assets
  let copied = 0;
  for (const p of products) {
    const src = path.join(FRONTEND_ASSETS, p.image);
    const dest = path.join(uploadDir, p.image);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  console.log(`📁 Copied ${copied} product images`);

  const docs = products.map((p) => ({
    ...p,
    image: `${BASE_URL}/images/${p.image}`,
    thumbnail: `${BASE_URL}/thumbnails/thumb_${p.image.replace(/\.(png|jpg|jpeg|webp)$/, ".jpg")}`,
  }));
  await Product.insertMany(docs);
  console.log(`🌱 Seeded ${docs.length} products into database`);
}

// ---------- Connect to MongoDB and start ----------
async function startServer() {
  let mongoUri = process.env.MONGODB_URI;

  // Try connecting to the configured URI first
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    // Fall back to in-memory MongoDB
    console.log(
      "⚠️  Local MongoDB not available, starting in-memory server...",
    );
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to in-memory MongoDB");
  }

  // Auto-seed if database is empty
  await seedDatabase();

  server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err.message);
  process.exit(1);
});
