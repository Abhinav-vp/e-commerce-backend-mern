# Stage 1: Build stage
FROM node:20-bullseye AS builder

# Install build dependencies and libvips-dev for Sharp
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including devDependencies for rebuilding
RUN npm install

# Rebuild sharp for the current architecture
RUN npm rebuild sharp

# Stage 2: Runtime stage
FROM node:20-bullseye-slim AS runner

# Install runtime dependencies for Sharp if needed
# bullseye-slim includes minimal shared libs.
RUN apt-get update && apt-get install -y \
    libvips \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy only the necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Ensure upload directories exist with correct permissions
# This fixes the rendering/upload issue by pre-creating paths
RUN mkdir -p upload/images upload/thumbnails && chmod -R 777 upload

# Expose the application port (matching .env)
EXPOSE 7000

# Start the application
CMD ["npm", "start"]
