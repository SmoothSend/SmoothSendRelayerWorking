# Use official Node.js runtime as base image
FROM node:23-slim

# Set working directory
WORKDIR /app

# Install runtime utilities required by healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user for security (Debian-compatible)
RUN groupadd -g 1001 nodejs || true && \
  useradd -u 1001 -g nodejs -s /usr/sbin/nologin -M relayer || true

# Change ownership of the app directory
RUN chown -R relayer:nodejs /app
USER relayer

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ping || exit 1

# Start the application
CMD ["node", "dist/index.js"]
