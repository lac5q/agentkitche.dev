#!/bin/bash
#
# Vast.ai Docker Build & Deploy Script
# Builds pre-built Docker image with embedding model cached
# Deploys to Vast.ai for batch embedding jobs
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"
IMAGE_NAME="memroos/embedding-server"
IMAGE_TAG="latest"
FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
log_success() { log "${GREEN}✓ $1${NC}"; }
log_error() { log "${RED}✗ $1${NC}"; }
log_warn() { log "${YELLOW}⚠ $1${NC}"; }

# Build Docker image
build_image() {
    log "Building Docker image..."
    docker build -t "$FULL_IMAGE" -f "$DOCKER_DIR/Dockerfile.embedding" "$DOCKER_DIR"
    log_success "Image built: $FULL_IMAGE"
}

# Create Vast.ai instance
create_instance() {
    log "Creating Vast.ai instance..."
    
    # Find cheapest RTX 4090
    OFFER_ID=$(vastai search offers 'gpu_name=RTX_4090 num_gpus=1 gpu_ram>=24' --sort price --limit 1 --raw 2>/dev/null | python3 -c "import json, sys; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)
    
    if [ -z "$OFFER_ID" ]; then
        log_error "No RTX 4090 offers found"
        exit 1
    fi
    
    log "Using offer: $OFFER_ID"
    
    # Create instance with pre-built image
    INSTANCE_RESULT=$(vastai create instance "$OFFER_ID" \
        --image "$FULL_IMAGE" \
        --disk 20 \
        --ssh \
        --direct \
        2>&1)
    
    INSTANCE_ID=$(echo "$INSTANCE_RESULT" | python3 -c "import json, sys; print(json.load(sys.stdin).get('new_contract', ''))" 2>/dev/null)
    
    if [ -z "$INSTANCE_ID" ]; then
        log_error "Failed to create instance"
        exit 1
    fi
    
    log_success "Instance created: $INSTANCE_ID"
    
    # Wait for instance to be ready
    log "Waiting for instance to be ready..."
    sleep 30
    
    # Get SSH URL
    SSH_URL=$(vastai ssh-url "$INSTANCE_ID" 2>/dev/null)
    log_success "Instance ready. SSH: $SSH_URL"
    
    # Wait for service to start
    log "Waiting for embedding service to start..."
    sleep 60
    
    # Get public IP
    PUBLIC_IP=$(vastai show instances "$INSTANCE_ID" --raw 2>/dev/null | python3 -c "import json, sys; print(json.load(sys.stdin).get('public_ipaddr', ''))" 2>/dev/null)
    DIRECT_PORT=$(vastai show instances "$INSTANCE_ID" --raw 2>/dev/null | python3 -c "import json, sys; print(json.load(sys.stdin).get('direct_port_start', ''))" 2>/dev/null)
    
    log_success "Instance ready. IP: $PUBLIC_IP, Port: $DIRECT_PORT"
    log_success "Embedding endpoint: http://$PUBLIC_IP:$DIRECT_PORT/v1/embeddings"
    
    # Save instance info
    echo "$INSTANCE_ID" > /tmp/vast-instance-id
    echo "$PUBLIC_IP:$DIRECT_PORT" > /tmp/vast-endpoint
}

# Test embedding endpoint
test_endpoint() {
    ENDPOINT=$(cat /tmp/vast-endpoint 2>/dev/null)
    if [ -z "$ENDPOINT" ]; then
        log_error "No endpoint found"
        return 1
    fi
    
    log "Testing endpoint: http://$ENDPOINT/v1/embeddings"
    
    RESPONSE=$(curl -s -X POST "http://$ENDPOINT/v1/embeddings" \
        -H "Content-Type: application/json" \
        -d '{"input": "Test embedding", "model": "clip-ViT-L-14"}' \
        --connect-timeout 10 2>/dev/null)
    
    if [ -n "$RESPONSE" ]; then
        DIMS=$(echo "$RESPONSE" | python3 -c "import json, sys; print(len(json.load(sys.stdin)['data'][0]['embedding']))" 2>/dev/null)
        log_success "Embedding service ready! Dimensions: $DIMS"
        return 0
    else
        log_error "Embedding service not ready"
        return 1
    fi
}

# Main
main() {
    log "=== Vast.ai Docker Build & Deploy ==="
    
    # Build image
    build_image
    
    # Deploy to Vast.ai
    create_instance
    
    # Wait and test
    sleep 60
    test_endpoint
}

main "$@"
