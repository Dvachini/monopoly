# Stage 1: Build Stage (client build)
FROM node:20-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm install

# Copy client separately and install client dependencies + build
COPY client ./client
WORKDIR /app/client
RUN npm install && npm run build

# Move built files to /app/dist in the builder stage
RUN mkdir -p /app/dist && mv dist/* /app/dist/

# Return to root app dir
WORKDIR /app

# Stage 2: Production Stage
FROM node:20-alpine

# Install for alpine
RUN apk update --no-cache && \
    apk add --no-cache curl tzdata

# Set timezone data
ENV TZ=Asia/Kuala_Lumpur

# Set working directory
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY server.js ./
COPY routes ./routes
COPY sockets ./sockets
COPY models ./models

# Copy built dist files from builder
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
