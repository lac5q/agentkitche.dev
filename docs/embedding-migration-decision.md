# Embedding Migration Decision Record

## Date: 2026-05-08

## Problem
Gemini embeddings2 costing $90-120/month for 5,411 documents. Need cheaper alternative with multimodal support.

## Options Evaluated

### 1. Vast.ai Self-Hosted (Initial Approach)
- **Cost**: $239/month (24/7 RTX 4090)
- **Pros**: Full control, multimodal support
- **Cons**: More expensive than Gemini, complex setup

### 2. Cloud API (Together AI, Fireworks)
- **Cost**: $10-30/month (pay per token)
- **Pros**: No infra management, pay only when embedding
- **Cons**: Less control, dependent on third-party

### 3. Local Mac (M2 Pro)
- **Cost**: $0/month
- **Pros**: Free, local
- **Cons**: Model compatibility issues, clip-ViT-L-14 loading problems

### 4. Vast.ai Docker (Selected)
- **Cost**: $20-40/month (batch mode)
- **Pros**: Pre-built image, fast startup, multimodal support
- **Cons**: Requires Docker setup, batch-only

## Decision: Vast.ai Docker Approach

### Why This Approach?
1. **Cost effective**: $20-40/mo vs $90-120/mo (70% savings)
2. **Multimodal**: clip-ViT-L-14 supports text + images
3. **Batch mode**: Spin up/down as needed
4. **Pre-built image**: Fast startup (<2 min)
5. **Reproducible**: Docker ensures consistent environment

### Implementation Details
- **Model**: clip-ViT-L-14 (768-dim, multimodal)
- **Base image**: nvidia/cuda:11.8.0-runtime-ubuntu22.04
- **Dependencies**: PyTorch 2.0.1, sentence-transformers 2.2.2, FastAPI 0.109.0
- **Docker image**: agentkitchen/embedding-server
- **Deployment**: Vast.ai batch instances

### Files Created
- `docker/Dockerfile.embedding` - Pre-built Docker image
- `docker/server.py` - FastAPI embedding server
- `scripts/vast-docker-deploy.sh` - Deployment script
- `scripts/batch-embed.sh` - Batch embedding runner
- `services/memory/vast-serverless-embed.py` - Serverless option (not used)
- `services/memory/.env` - Environment variables
- `services/memory/.env.example` - Environment template
- `services/memory/local-embed-server.py` - Local Mac option (not used)

### Git Commits
```
55faf2a feat: add Docker-based Vast.ai embedding server
ee61228 feat: complete embedding migration to clip-ViT-L-14
d2124fd fix: add .env.example for mem0 service
32460b5 fix: use localhost SSH tunnel for embedding API
3ee2e58 fix: update embedding model to clip-ViT-L-14 with correct port mapping
f79c937 Merge branch 'main'
08988bf Merge branch 'codex/rebrand-agentkitche-dev'
9de4edb Merge remote-tracking branch 'origin/codex/opencode-onboarding-mcp'
c6d246f migrate embeddings from Gemini to jina-clip-v2 on Vast.ai
```

### Cost Tracking

| Component | Before | After | Savings |
|---|---|---|---|
| Gemini embeddings | $90-120/mo | $0 | 100% |
| Vast.ai Docker | $0 | $20-40/mo | +$20-40 |
| **Total** | **$90-120/mo** | **$20-40/mo** | **~60-70%** |

### Next Steps
1. ✅ Complete Docker build
2. ⏳ Push to Docker Hub
3. ⏳ Deploy to Vast.ai
4. ⏳ Test embedding endpoint
5. ⏳ Update mem0 config
6. ⏳ Run QMD embed

### Future Optimization Options
- **Cloud API**: If Vast.ai proves too complex, switch to Together AI/Fireworks
- **Local Mac**: If model compatibility fixed, $0 cost option
- **Smaller model**: If 768-dim is overkill, consider 384-dim for cost savings
- **Spot instances**: If reliability acceptable, 50% cost reduction

### Notes
- SSH tunneling proved reliable for batch jobs (unlike direct port access)
- Vast.ai Serverless API had auth issues during testing
- Docker approach provides best balance of cost, control, and reliability
- Model download is the bottleneck in Docker build (~10 min)
- **Final working solution**: SSH tunnel to Vast.ai instance (localhost:8001 -> Vast.ai:8000)
- **mem0 config**: Updated to use http://localhost:8001/v1
- **All tests passing**: Embedding creation, search, and retrieval working ✓

### Working Configuration (2026-05-09)
- **Instance**: Vast.ai RTX 4090 (36385878)
- **SSH Tunnel**: localhost:8001 -> 85.51.34.67:8000
- **Model**: clip-ViT-L-14 (768-dim, multimodal)
- **mem0**: Connected and tested ✓
- **Cost**: ~$0.33/hr when running (batch mode)
