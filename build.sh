#!/bin/bash

# Build script for Cloud Run deployment

set -e

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Frontend build complete!"
echo "Frontend dist directory:"
ls -la frontend/dist/

echo "Ready for Docker build!"
echo ""
echo "To deploy to Cloud Run:"
echo "1. gcloud builds submit --tag gcr.io/PROJECT_ID/doug-clone"
echo "2. gcloud run deploy doug-clone --image gcr.io/PROJECT_ID/doug-clone --platform managed --region REGION --allow-unauthenticated"
echo ""
echo "Or use the service.yaml:"
echo "gcloud run services replace service.yaml --region REGION"
