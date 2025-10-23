# Stage 1: Build the application
# This stage installs all dependencies (including dev) and runs the build
FROM node:20-alpine AS builder
WORKDIR /app

# Declare a build-time argument
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your source code
COPY . .

# Run the new, correct build script
RUN npm run build

# ---

# Stage 2: Production
# This stage starts fresh and only installs production dependencies
FROM node:20-alpine
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Copy package files and install *only* production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the build artifacts from the "builder" stage
COPY --from=builder /app/build ./build

# Expose the port Heroku will assign
EXPOSE $PORT

# Run the new, correct start command
CMD ["npm", "run", "start"]