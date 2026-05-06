# Use Node 20 Bullseye-slim for better compatibility with native modules like sharp
FROM node:20-bullseye-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies if needed (e.g., for node-gyp or specific sharp requirements)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
# Using --omit=dev for production-like environment if needed, 
# but for now we install all to be safe.
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port from .env (usually 7000 in this project)
EXPOSE 7000

# Start the application
CMD ["npm", "start"]
