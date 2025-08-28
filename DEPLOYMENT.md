# Cloud Run Deployment Guide

## Prerequisites

1. Google Cloud SDK installed and configured
2. Docker installed locally
3. Google Cloud project with billing enabled
4. Enable required APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   gcloud services enable bigquery.googleapis.com
   ```

## Environment Variables Setup

### 1. Create Secrets in Google Cloud Secret Manager

```bash
# OpenAI API Key
gcloud secrets create openai-api-key --data-file=<(echo -n "your-openai-api-key")

# Google Service Account JSON (your existing credentials)
gcloud secrets create google-credentials --data-file=<(echo -n '{"type":"service_account",...}')
```

### 2. Grant Cloud Run access to secrets

```bash
# Get your Cloud Run service account
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT="${PROJECT_ID}-compute@developer.gserviceaccount.com"

# Grant access to secrets
gcloud secrets add-iam-policy-binding openai-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding google-credentials \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
```

## Deployment Steps

### 1. Quick Deploy (Automated)

```bash
# This will build frontend, push Docker image, and deploy to Cloud Run
./build.sh
```

### 2. Manual Build and Deploy

```bash
# Set your project ID
PROJECT_ID="your-project-id"

# Build and push to Google Container Registry (includes frontend build)
gcloud builds submit --tag gcr.io/${PROJECT_ID}/doug-clone
```

### 3. Deploy to Cloud Run

```bash
# Option 1: Direct deployment
gcloud run deploy doug-clone \
    --image gcr.io/${PROJECT_ID}/doug-clone \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --set-env-vars VERTEX_VDB_DOMAIN=25224006.europe-west2-98733960248.vdb.vertexai.goog \
    --set-secrets OPENAI_API_KEY=openai-api-key:latest \
    --set-secrets GOOGLE_APPLICATION_CREDENTIALS_JSON=google-credentials:latest

# Option 2: Using service.yaml (update PROJECT_ID first)
sed -i 's/PROJECT_ID/${PROJECT_ID}/g' service.yaml
gcloud run services replace service.yaml --region us-central1
```

### 4. Update CORS (if needed)

If deploying to a custom domain, update the `FRONTEND_URL` environment variable:

```bash
gcloud run services update doug-clone \
    --region us-central1 \
    --set-env-vars FRONTEND_URL=https://your-domain.com
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (set by Cloud Run) | `8080` |
| `VERTEX_VDB_DOMAIN` | Vertex AI Vector Search endpoint | `25224006.europe-west2-98733960248.vdb.vertexai.goog` |
| `OPENAI_API_KEY` | OpenAI API key (from Secret Manager) | `sk-...` |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Google Service Account JSON (from Secret Manager) | `{"type":"service_account",...}` |
| `FRONTEND_URL` | Frontend URL for CORS (optional) | `https://your-domain.com` |

## Troubleshooting

### Common Issues:

1. **Permission denied errors**: Ensure service account has access to secrets and required APIs
2. **CORS errors**: Add your frontend domain to the `FRONTEND_URL` environment variable
3. **Vector search errors**: Verify `VERTEX_VDB_DOMAIN` is correct and accessible
4. **BigQuery errors**: Ensure service account has BigQuery access

### Logs:

```bash
gcloud run logs tail doug-clone --region us-central1
```

## Local Testing

To test locally with production environment:

```bash
export VERTEX_VDB_DOMAIN=25224006.europe-west2-98733960248.vdb.vertexai.goog
export OPENAI_API_KEY=your-key
export GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8080
```
