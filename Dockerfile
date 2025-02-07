# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json before other files
COPY package*.json ./

# Install dependencies with cache
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
ENV PERSONAL_ACCESS_TOKEN=${PERSONAL_ACCESS_TOKEN}
ENV REPO_NAME=${REPO_NAME}
ENV ADMIN_CHAT_ID=${ADMIN_CHAT_ID}
ENV RAILWAY_TOKEN=${RAILWAY_TOKEN}
ENV PORT=3000

# Expose the application's port
EXPOSE 3000

# Run the application
CMD ["npm", "start"]