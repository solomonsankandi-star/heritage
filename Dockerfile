# Dockerfile

# --- Stage 1: Build the application ---
# Use an official Node.js runtime as the parent image.
# Using a specific version is a good practice.
FROM node:18-alpine AS builder

# Set the working directory in the container.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache.
COPY package*.json ./

# Install project dependencies.
RUN npm install

# Copy the rest of your application's source code.
COPY . .

# --- Stage 2: Create the final, smaller production image ---
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy only the necessary files from the 'builder' stage.
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app ./

# Expose the port the app runs on. Fly.io will map this internally.
EXPOSE 3000

# The command to run when the container starts.
CMD [ "npm", "start" ]