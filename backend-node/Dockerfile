# =============================================================================
# Backend (Node.js) - Dockerfile
# =============================================================================
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy only the manifest files first so Docker can cache the `npm install`
# layer. If you don't change package.json, re-builds skip straight past this.
COPY package*.json ./
RUN npm install

# Now copy the actual source code.
COPY . .

EXPOSE 4000

# We use nodemon in development (see docker-compose.yml command override)
# so code changes on your machine reload the server automatically.
CMD ["npm", "run", "dev"]
