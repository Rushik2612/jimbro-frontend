# ── Stage 1: Build React app ──────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Pass backend URL at build time
# Set VITE_API_URL env var in Render to your backend URL
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx page
RUN rm -rf ./*

# Copy built app
COPY --from=build /app/dist .

# Nginx config for React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
