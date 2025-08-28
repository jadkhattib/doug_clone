"""
Monks.IQ Backend API
Main FastAPI application for chat and data ingestion
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import uuid
from datetime import datetime
from dotenv import load_dotenv
import openai
from google.cloud import bigquery
from google.oauth2 import service_account
import numpy as np
import tiktoken
from langchain.text_splitter import RecursiveCharacterTextSplitter
import time
import requests
import google.cloud.aiplatform as aiplatform
from google.cloud import aiplatform_v1

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Monks.IQ API", version="1.0.0")

# Configure CORS
# CORS configuration for both development and production
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:3011",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3011",
]

# Add production origin if environment variable is set
production_origin = os.getenv("FRONTEND_URL")
if production_origin:
    allowed_origins.append(production_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"http://(localhost|127\\.0\\.0\\.1):\\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients with error handling
try:
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        openai.api_key = openai_api_key
        openai_client = openai.OpenAI(api_key=openai_api_key)
        print("✅ OpenAI client initialized successfully")
    else:
        openai_client = None
        print("⚠️ OpenAI API key not found")
except Exception as e:
    openai_client = None
    print(f"⚠️ Failed to initialize OpenAI client: {e}")

# BigQuery configuration
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "discovery-flow")
DATASET_ID = os.getenv("BIGQUERY_DATASET", "persona")
TABLE_ID = os.getenv("BIGQUERY_TABLE", "embeddings")
FULL_TABLE_ID = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

def initialize_bigquery_client() -> Optional[bigquery.Client]:
    """Initialize BigQuery client supporting inline JSON or file path credentials.

    Supports the following env vars:
    - GOOGLE_APPLICATION_CREDENTIALS: file path OR raw JSON content
    - GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS_CONTENT: raw JSON content
    Falls back to Application Default Credentials if none provided.
    """
    try:
        creds: Optional[service_account.Credentials] = None

        raw_env = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        raw_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS_CONTENT")

        if raw_json:
            # Explicit JSON content variable
            info = json.loads(raw_json)
            creds = service_account.Credentials.from_service_account_info(info)
        elif raw_env:
            trimmed = raw_env.strip()
            if trimmed.startswith("{"):
                # Inline JSON placed directly in GOOGLE_APPLICATION_CREDENTIALS
                info = json.loads(trimmed)
                creds = service_account.Credentials.from_service_account_info(info)
            elif os.path.isfile(trimmed):
                # File path to credentials JSON
                creds = service_account.Credentials.from_service_account_file(trimmed)

        if creds is not None:
            client = bigquery.Client(project=PROJECT_ID, credentials=creds)
        else:
            # Attempt ADC (e.g., gcloud auth application-default login)
            client = bigquery.Client(project=PROJECT_ID)

        print("✅ BigQuery client initialized successfully")
        return client

    except Exception as e:
        print(f"⚠️ BigQuery client initialization failed: {e}")
        print("🔧 Please configure your Google Cloud credentials")
        return None


# Initialize BigQuery client
try:
    bq_client = initialize_bigquery_client()
except Exception as e:
    bq_client = None
    print(f"⚠️ Failed to initialize BigQuery client: {e}")

# Models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    persona_id: Optional[str] = "default"
    use_context: bool = True
    temperature: float = 0.7
    max_tokens: int = 1000

class ChatResponse(BaseModel):
    message: str
    context_used: Optional[List[str]] = None

class TextIngestionRequest(BaseModel):
    text: str
    persona_id: str = "default"
    metadata: Optional[Dict[str, Any]] = None

class TextIngestionResponse(BaseModel):
    success: bool
    chunks_processed: int
    persona_id: str
    message: str

class EmbeddingChunk(BaseModel):
    id: str
    text: str
    embedding: List[float]
    metadata: Optional[Dict[str, Any]]
    persona_id: str
    chunk_index: int

# Utility functions
def create_embeddings(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """Generate embeddings using OpenAI's API"""
    try:
        response = openai_client.embeddings.create(
            input=text,
            model=model
        )
        return response.data[0].embedding
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating embeddings: {str(e)}")

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """Split text into chunks for embedding"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
    )
    chunks = text_splitter.split_text(text)
    return chunks

def store_embeddings_in_bigquery(chunks_data: List[EmbeddingChunk]):
    """Store embedding chunks in BigQuery"""
    if bq_client is None:
        raise HTTPException(status_code=503, detail="BigQuery client not available. Please configure your Google Cloud credentials.")
    
    try:
        rows_to_insert = []
        for chunk in chunks_data:
            row = {
                "id": chunk.id,
                "text": chunk.text,
                "embedding": chunk.embedding,
                "metadata": json.dumps(chunk.metadata) if chunk.metadata else None,
                "persona_id": chunk.persona_id,
                "chunk_index": chunk.chunk_index,
                "created_at": datetime.utcnow().isoformat()
            }
            rows_to_insert.append(row)
        
        table = bq_client.get_table(FULL_TABLE_ID)
        errors = bq_client.insert_rows_json(table, rows_to_insert)
        
        if errors:
            raise HTTPException(status_code=500, detail=f"BigQuery insert errors: {errors}")
        
        return True
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error storing in BigQuery: {str(e)}")

def retrieve_relevant_context(query: str, persona_id: str, top_k: int = 5) -> List[str]:
    """Retrieve relevant context using Vertex AI Vector Search public endpoint.

    Note: persona_id is ignored since all data belongs to a single persona.
    """
    if bq_client is None:
        print("BigQuery client not available, returning empty context")
        # Not required for Vertex calls, just informative
        
    vertex_domain = os.getenv("VERTEX_VDB_DOMAIN")
    if not vertex_domain:
        print("VERTEX_VDB_DOMAIN not set; cannot use Vertex AI Vector DB")
        return []

    # 1) Embed the user query once
    try:
        t_embed_start = time.perf_counter()
        query_embedding = create_embeddings(query)
        t_embed_end = time.perf_counter()
        print(f"[timing] embed.create ms={(t_embed_end - t_embed_start)*1000:.1f}")
    except Exception as e:
        print(f"Embedding error: {e}")
        return []

    # 2) Call Vertex AI Vector Search using the low-level API
    try:
        t_vs_start = time.perf_counter()
        
        # Set variables for the current deployed index (updated endpoint)
        API_ENDPOINT = "25224006.europe-west2-98733960248.vdb.vertexai.goog"
        INDEX_ENDPOINT = "projects/98733960248/locations/europe-west2/indexEndpoints/16026481486462976"
        DEPLOYED_INDEX_ID = "vector_endpoint_1756378607472"
        
        print(f"Using API endpoint: {API_ENDPOINT}")
        print(f"Using index endpoint: {INDEX_ENDPOINT}")
        print(f"Using deployed index ID: {DEPLOYED_INDEX_ID}")
        
        # Initialize credentials
        creds_env = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        credentials = None
        if creds_env and creds_env.startswith("{"):
            # Parse inline JSON credentials
            creds_info = json.loads(creds_env)
            from google.oauth2 import service_account
            credentials = service_account.Credentials.from_service_account_info(creds_info)
        
        # Configure Vector Search client
        client_options = {
            "api_endpoint": API_ENDPOINT
        }
        if credentials:
            vector_search_client = aiplatform_v1.MatchServiceClient(
                client_options=client_options,
                credentials=credentials
            )
        else:
            vector_search_client = aiplatform_v1.MatchServiceClient(
                client_options=client_options
            )
        
        print(f"Querying with embedding of length: {len(query_embedding)}")
        
        # Build FindNeighborsRequest object
        datapoint = aiplatform_v1.IndexDatapoint(
            feature_vector=query_embedding
        )
        
        query_obj = aiplatform_v1.FindNeighborsRequest.Query(
            datapoint=datapoint,
            neighbor_count=top_k
        )
        
        request = aiplatform_v1.FindNeighborsRequest(
            index_endpoint=INDEX_ENDPOINT,
            deployed_index_id=DEPLOYED_INDEX_ID,
            queries=[query_obj],
            return_full_datapoint=True,  # Enable this to get text content
        )
        
        # Execute the request
        response = vector_search_client.find_neighbors(request)
        
        print(f"Vector search response type: {type(response)}")
        print(f"Vector search response: {response}")
        print(f"Response has nearest_neighbors: {hasattr(response, 'nearest_neighbors')}")
        
        if hasattr(response, 'nearest_neighbors'):
            print(f"Number of nearest_neighbors: {len(response.nearest_neighbors)}")
            
        contexts: List[str] = []
        
        # Parse the response to extract text content
        if response and response.nearest_neighbors:
            print(f"Processing {len(response.nearest_neighbors)} query responses")
            for i, query_result in enumerate(response.nearest_neighbors):
                print(f"Query {i} has {len(query_result.neighbors)} neighbors")
                for j, neighbor in enumerate(query_result.neighbors):
                    print(f"Neighbor {j}: distance={neighbor.distance}")
                    print(f"Neighbor {j}: datapoint exists={neighbor.datapoint is not None}")
                    
                    if neighbor.datapoint:
                        print(f"Neighbor {j}: datapoint_id={neighbor.datapoint.datapoint_id}")
                        print(f"Neighbor {j}: has restricts={neighbor.datapoint.restricts is not None}")
                        
                        # Check for text in restricts
                        if neighbor.datapoint.restricts:
                            print(f"Neighbor {j}: number of restricts={len(neighbor.datapoint.restricts)}")
                            for k, restrict in enumerate(neighbor.datapoint.restricts):
                                print(f"Restrict {k}: namespace={restrict.namespace}, allow_list={restrict.allow_list}, deny_list={restrict.deny_list}")
                                if restrict.namespace == "text" and restrict.allow_list:
                                    contexts.append(restrict.allow_list[0])
                                    print(f"Added context from restrict: {restrict.allow_list[0][:100]}...")
                                    break
                        else:
                            print(f"Neighbor {j}: no restricts found")
                        
                        # Fetch text from BigQuery using datapoint ID
                        if neighbor.datapoint.datapoint_id:
                            datapoint_id = neighbor.datapoint.datapoint_id
                            print(f"Fetching text for datapoint ID: {datapoint_id}")
                            
                            try:
                                # Query BigQuery to get the text content for this ID
                                if bq_client:
                                    query = """
                                    SELECT text 
                                    FROM `discovery-flow.persona.embeddings` 
                                    WHERE id = @datapoint_id
                                    LIMIT 1
                                    """
                                    
                                    job_config = bigquery.QueryJobConfig(
                                        query_parameters=[
                                            bigquery.ScalarQueryParameter("datapoint_id", "STRING", datapoint_id)
                                        ]
                                    )
                                    
                                    query_job = bq_client.query(query, job_config=job_config)
                                    results = query_job.result()
                                    
                                    for row in results:
                                        if row.text:
                                            contexts.append(row.text)
                                            print(f"Added context from BigQuery: {row.text[:100]}...")
                                            break
                                else:
                                    print("No BigQuery client available to fetch text")
                                    
                            except Exception as e:
                                print(f"Error fetching text for datapoint {datapoint_id}: {e}")
                    else:
                        print(f"Neighbor {j}: no datapoint")
        else:
            print("No nearest neighbors in response")
            # Let's also try a broader search with different parameters
            print("Attempting broader search...")
            
            # Try with a larger neighbor count and lower quality threshold
            query_obj_broad = aiplatform_v1.FindNeighborsRequest.Query(
                datapoint=datapoint,
                neighbor_count=20  # Try more neighbors
            )
            
            request_broad = aiplatform_v1.FindNeighborsRequest(
                index_endpoint=INDEX_ENDPOINT,
                deployed_index_id=DEPLOYED_INDEX_ID,
                queries=[query_obj_broad],
                return_full_datapoint=True,
            )
            
            response_broad = vector_search_client.find_neighbors(request_broad)
            print(f"Broad search response: {response_broad}")
            
            if response_broad and response_broad.nearest_neighbors:
                print(f"Broad search found {len(response_broad.nearest_neighbors[0].neighbors)} neighbors")
            else:
                print("Even broad search returned no results - index may be empty")

        t_vs_end = time.perf_counter()
        print(f"[timing] rag.retrieve ms={(t_vs_end - t_vs_start)*1000:.1f} chunks={len(contexts)}")
        return contexts

    except Exception as e:
        print(f"Vertex Vector DB query failed: {e}")
        import traceback
        traceback.print_exc()
        t_vs_end = time.perf_counter()
        print(f"[timing] rag.retrieve ms={(t_vs_end - t_vs_start)*1000:.1f} chunks=0")
        return []

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Monks.IQ API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/ingest", response_model=TextIngestionResponse)
async def ingest_text(request: TextIngestionRequest):
    """Ingest text and create embeddings for a persona"""
    try:
        # Chunk the text
        chunks = chunk_text(request.text)
        
        # Create embeddings for each chunk
        chunks_data = []
        for idx, chunk in enumerate(chunks):
            chunk_id = str(uuid.uuid4())
            embedding = create_embeddings(chunk)
            
            chunk_data = EmbeddingChunk(
                id=chunk_id,
                text=chunk,
                embedding=embedding,
                metadata=request.metadata,
                persona_id=request.persona_id,
                chunk_index=idx
            )
            chunks_data.append(chunk_data)
        
        # Store in BigQuery
        store_embeddings_in_bigquery(chunks_data)
        
        return TextIngestionResponse(
            success=True,
            chunks_processed=len(chunks),
            persona_id=request.persona_id,
            message=f"Successfully processed {len(chunks)} chunks for persona '{request.persona_id}'"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint with RAG support"""
    try:
        t_total_start = time.perf_counter()
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Get the last user message for context retrieval
        last_user_message = ""
        for msg in reversed(request.messages):
            if msg.role == "user":
                last_user_message = msg.content
                break
        
        context_texts = []
        
        # Retrieve relevant context if enabled
        if request.use_context and last_user_message:
            t_rag_start = time.perf_counter()
            context_texts = retrieve_relevant_context(
                last_user_message, 
                request.persona_id
            )
            t_rag_end = time.perf_counter()
            print(f"[timing] rag.retrieve ms={(t_rag_end - t_rag_start)*1000:.1f} chunks={len(context_texts) if context_texts else 0}")
            
            if context_texts:
                # Inject context into the system message
                context_prompt = "\n\n".join([
                    "You are responding based on the following persona:",
                    "Name: Doug Martin",
                    "Role: CMO of General Mills",
                    "Gender: Male",
                    "Location: Minneapolis, Minnesota, United States",
                    "Personality: Curious, light-hearted, friendly, funny",
                    "Tone: Friendly, not so verbiouse, slight humor, light-hearted, not too serious",
                    "Education: BS - Economics, Marketing, Multinational Management at Unniversity of Pennsylvania (The Wharton School) also an MBA in marketing at University of California (The Anderson School of Management)", 
                    "Interests: Technology, hiking, reading, food, wine, travel, and family",
                    "Work experience: Chief Marketing Officer at General Mills (2021-Present), General Mills President of Dairy Operating Unit (2019-2021), VP Marketing - Yoplait (2018-2019), Business Unit Director - Yoplait (2017-2018), Business Unit Director: Yogurt New Products & New Brands (2015-2016), Associate Director of Marketing - Cheerios (2014-2015), Marketing Manager - Cheerios (2010-2014), Associate Marketing Manager at General Mills (2006-2010), Associate Marketing Manager Intern at General Mills (2005), Merchandiser at Gap Inc/Old Navy (2002-2004), Financial Analyst at Walt Disney Studios (2000-2002)",
                    "---CONTEXT START---",
                    "\n---\n".join(context_texts),
                    "---CONTEXT END---",
                    "",
                    "Use this context to respond in character, matching the tone, style, and knowledge of the persona.",
                    "Do not explicitly mention that you're using context or reference the context directly.",
                    "Respond naturally as if you are the persona."
                    "Do not open conversation with the user by asking questions, only respond, do not ask questions."
                ])
                
                # Add or update system message with context
                if messages and messages[0]["role"] == "system":
                    messages[0]["content"] = f"{messages[0]['content']}\n\n{context_prompt}"
                else:
                    messages.insert(0, {"role": "system", "content": context_prompt})
        
        # Call OpenAI API with the latest GPT-4 model
        t_llm_start = time.perf_counter()
        model_name = os.getenv("OPENAI_MODEL", "gpt-4o")  # Allow model to be configurable via env var
        response = openai_client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        t_llm_end = time.perf_counter()
        t_total_end = time.perf_counter()
        print(f"[timing] llm.chat ms={(t_llm_end - t_llm_start)*1000:.1f} total ms={(t_total_end - t_total_start)*1000:.1f}")
        
        return ChatResponse(
            message=response.choices[0].message.content,
            context_used=context_texts[:3] if context_texts else None  # Return first 3 context chunks for transparency
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/personas")
async def list_personas():
    """List all available personas"""
    if bq_client is None:
        # Return default persona if BigQuery is not available
        return {"personas": [{"id": "default", "chunks": 0}]}
    
    try:
        query = f"""
        SELECT DISTINCT persona_id, COUNT(*) as chunk_count
        FROM `{FULL_TABLE_ID}`
        GROUP BY persona_id
        ORDER BY persona_id
        """
        
        query_job = bq_client.query(query)
        results = query_job.result()
        
        personas = [
            {"id": row.persona_id, "chunks": row.chunk_count} 
            for row in results
        ]
        
        return {"personas": personas}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/personas/{persona_id}")
async def delete_persona(persona_id: str):
    """Delete all data for a specific persona"""
    if bq_client is None:
        raise HTTPException(status_code=503, detail="BigQuery client not available. Please configure your Google Cloud credentials.")
    
    try:
        query = f"""
        DELETE FROM `{FULL_TABLE_ID}`
        WHERE persona_id = @persona_id
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("persona_id", "STRING", persona_id)
            ]
        )
        
        query_job = bq_client.query(query, job_config=job_config)
        query_job.result()  # Wait for the query to complete
        
        return {"success": True, "message": f"Deleted persona '{persona_id}'"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files (frontend) - only if directory exists
frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist_path):
    try:
        app.mount("/static", StaticFiles(directory=frontend_dist_path), name="static")
        print(f"✅ Mounted static files from {frontend_dist_path}")
        
        # Serve index.html for all non-API routes (SPA routing)
        @app.get("/{full_path:path}")
        async def serve_frontend(full_path: str):
            # Don't serve frontend for API routes
            if full_path.startswith("api/") or full_path.startswith("health"):
                raise HTTPException(status_code=404, detail="Not found")
            
            index_path = os.path.join(frontend_dist_path, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            else:
                raise HTTPException(status_code=404, detail="Frontend not found")
    except Exception as e:
        print(f"⚠️ Failed to mount static files: {e}")
else:
    print(f"⚠️ Frontend dist directory not found: {frontend_dist_path}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
