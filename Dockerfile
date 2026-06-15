# Build the Vite client assets first.
FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Install the server runtime dependencies and serve the built client with Express.
FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/src/ ./src/
COPY --from=builder /app/client/dist/ ./public/

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
