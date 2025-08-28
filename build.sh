#!/bin/bash

# Build script for Cloud Run deployment

set -e

echo "🚀 Building and deploying Doug Martin AI Clone to Cloud Run..."
echo ""

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "your-project-id")
REGION="us-central1"

echo "📦 Building Docker image with multi-stage build..."
echo "   (Frontend will be built inside Docker container)"

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/${PROJECT_ID}/doug-clone

echo ""
echo "🚀 Deploying to Cloud Run..."

# Deploy to Cloud Run
gcloud run deploy doug-clone \
    --image gcr.io/${PROJECT_ID}/doug-clone \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --set-env-vars VERTEX_VDB_DOMAIN=25224006.europe-west2-98733960248.vdb.vertexai.goog \
    --set-secrets OPENAI_API_KEY=openai-api-key:latest \
    --set-secrets GOOGLE_APPLICATION_CREDENTIALS_JSON=google-credentials:latest

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your Doug Martin AI Clone is now live at:"
gcloud run services describe doug-clone --region=${REGION} --format='value(status.url)'
