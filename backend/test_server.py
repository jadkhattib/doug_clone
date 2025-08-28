"""
Simple test server to verify the app works
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Monks.IQ Test API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "name": "Monks.IQ API",
        "version": "1.0.0",
        "status": "running",
        "message": "Please configure OpenAI and Google Cloud credentials to enable full functionality"
    }

@app.get("/api/personas")
async def list_personas():
    return {"personas": [{"id": "default", "chunks": 0}]}

@app.post("/api/chat")
async def chat():
    return {
        "message": "Please configure your OpenAI API key to enable chat functionality.",
        "context_used": None
    }

@app.post("/api/ingest")
async def ingest():
    return {
        "success": False,
        "chunks_processed": 0,
        "persona_id": "default",
        "message": "Please configure your API keys to enable data ingestion"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

