# Stage 1: Build Stage (client build)
FROM node:22-alpine AS builder

WORKDIR /app/client

# Client dependencies (devDeps needed for vite, so no NODE_ENV=production here)
COPY client/package*.json ./
RUN npm ci

# Client source + build
COPY client ./
RUN npm run build

# Stage 2: Production Stage
FROM node:22-alpine

# Install tzdata for alpine
RUN apk add --no-cache tzdata

ENV TZ=Asia/Kuala_Lumpur
ENV NODE_ENV=production

# /app owned by node, then everything below runs as node
WORKDIR /app
RUN chown node:node /app
USER node

# Install only production dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY --chown=node:node server.js ./
COPY --chown=node:node sockets ./sockets

# Copy built client from builder
COPY --from=builder --chown=node:node /app/client/dist ./dist

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health || exit 1

CMD ["node", "server.js"]
