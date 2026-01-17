# Use Node.js LTS
FROM node:18-slim

# Install git and other dependencies needed for analysis
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Create temp directory for cloning repos
RUN mkdir -p /tmp && chmod 777 /tmp

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
