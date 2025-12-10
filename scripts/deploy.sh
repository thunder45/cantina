#!/bin/bash
set -e

# Configuration
AWS_PROFILE="cantina"
AWS_REGION="eu-west-1"
S3_BUCKET="cantina-frontend-625272706584"
CLOUDFRONT_ID="E7R30G3Z8J2DI"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check AWS credentials
check_aws() {
    aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null 2>&1 || \
        error "AWS credentials not configured. Run: aws configure --profile $AWS_PROFILE"
}

deploy_backend() {
    log "Building shared package..."
    npm run build --workspace=@cantina-pos/shared
    
    log "Building backend Lambda bundle..."
    npm run build:lambda --workspace=@cantina-pos/backend
    
    log "Deploying infrastructure (CDK)..."
    cd packages/infra
    npx cdk deploy --profile "$AWS_PROFILE" --require-approval never
    cd ../..
    
    log "✅ Backend deployed!"
}

deploy_frontend() {
    log "Building shared package..."
    npm run build --workspace=@cantina-pos/shared
    
    log "Building frontend..."
    npm run build --workspace=@cantina-pos/frontend-web
    
    log "Uploading to S3..."
    aws s3 sync packages/frontend-web/dist/ "s3://$S3_BUCKET" \
        --delete --profile "$AWS_PROFILE" --region "$AWS_REGION"
    
    log "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths "/*" \
        --profile "$AWS_PROFILE" \
        --query 'Invalidation.Id' --output text
    
    log "✅ Frontend deployed!"
}

deploy_all() {
    deploy_backend
    deploy_frontend
    log "✅ Full deployment complete!"
}

# Main
check_aws

case "${1:-all}" in
    backend)  deploy_backend ;;
    frontend) deploy_frontend ;;
    all)      deploy_all ;;
    *)        echo "Usage: $0 [backend|frontend|all]"; exit 1 ;;
esac
