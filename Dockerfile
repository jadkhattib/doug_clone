# Multi-stage build for frontend and backend
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend build
WORKDIR /frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN npm run build

# Backend stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from the frontend-builder stage
COPY --from=frontend-builder /frontend/dist/ ./frontend/dist/

# Copy the image to the frontend dist folder (needed for the frontend)
COPY doug-martin.jpeg ./frontend/dist/

# Set environment variables
ENV PYTHONPATH="/app"
ENV PORT=8080

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Create a startup script to handle dynamic port
RUN echo '#!/bin/bash\nPORT=${PORT:-8080}\nexec python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT' > /app/start.sh
RUN chmod +x /app/start.sh

# Command to run the application
CMD ["/app/start.sh"]
