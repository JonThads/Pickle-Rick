# =============================================================================
# Frontend (React + Vite) - Dockerfile
# =============================================================================
# This Dockerfile runs the Vite DEV server (hot reload) - good for local
# development, which is this project's whole scope (see SRS: "local
# deployment only"). A production build would use a separate multi-stage
# Dockerfile that builds static files and serves them with nginx.
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
