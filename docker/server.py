"""
Vast.ai Embedding Server
FastAPI server providing OpenAI-compatible /v1/embeddings endpoint
"""

import os
import sys
from typing import List, Union

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from sentence_transformers import SentenceTransformer

app = FastAPI(title="Vast.ai Embedding Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
print("Loading clip-ViT-L-14 model...")
model = SentenceTransformer("clip-ViT-L-14")
print("Model loaded successfully!")

class EmbeddingRequest(BaseModel):
    input: Union[str, List[str], List[dict]]
    model: str = "clip-ViT-L-14"

class EmbeddingResponse(BaseModel):
    data: List[dict]
    model: str
    object: str = "list"
    usage: dict

@app.post("/v1/embeddings")
async def create_embeddings(request: EmbeddingRequest) -> EmbeddingResponse:
    """Generate embeddings for text input"""
    texts = []
    if isinstance(request.input, str):
        texts = [request.input]
    elif isinstance(request.input, list):
        if len(request.input) > 0 and isinstance(request.input[0], dict):
            texts = [item.get("text", "") for item in request.input if item.get("type") == "text"]
        else:
            texts = request.input
    
    embeddings = model.encode(texts)
    
    return EmbeddingResponse(
        data=[
            {
                "embedding": emb.tolist(),
                "index": i,
                "object": "embedding"
            }
            for i, emb in enumerate(embeddings)
        ],
        model=request.model,
        usage={
            "prompt_tokens": sum(len(t.split()) for t in texts),
            "total_tokens": sum(len(t.split()) for t in texts)
        }
    )

@app.get("/v1/models")
async def list_models():
    return {
        "data": [
            {
                "id": "clip-ViT-L-14",
                "object": "model",
                "owned_by": "sentence-transformers"
            }
        ],
        "object": "list"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "model": "clip-ViT-L-14"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting embedding server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
