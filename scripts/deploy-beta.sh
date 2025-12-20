#!/bin/bash
set -e

# Beta deployment configuration
AWS_PROFILE="cantina"
AWS_REGION="eu-west-1"
STACK_NAME="CantinaBetaStack"
SUBDOMAIN="cantina-beta"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[BETA DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

cd "$(dirname "$0")/.."

# Check AWS credentials
log "Checking AWS credentials..."
aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null 2>&1 || \
    error "AWS credentials not configured. Run: aws configure --profile $AWS_PROFILE"

# Build shared
log "Building shared package..."
npm run build --workspace=@cantina-pos/shared

# Build backend Lambda
log "Building backend Lambda bundle..."
npm run build:lambda --workspace=@cantina-pos/backend

# Build frontend with beta API URL
log "Building frontend for beta..."
cd packages/frontend-web
VITE_API_URL="https://${SUBDOMAIN}.advm.lu/api" npm run build
cd ../..

# Deploy CDK stack with beta subdomain
log "Deploying beta infrastructure (CDK)..."
cd packages/infra
npx cdk deploy "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --require-approval never \
    --context subDomain="$SUBDOMAIN" \
    --outputs-file beta-outputs.json
cd ../..

# Get outputs
BUCKET_NAME=$(jq -r ".${STACK_NAME}.BucketName // empty" packages/infra/beta-outputs.json 2>/dev/null)
DISTRIBUTION_ID=$(jq -r ".${STACK_NAME}.DistributionId // empty" packages/infra/beta-outputs.json 2>/dev/null)

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    warn "Could not get outputs from CDK. Trying to get from CloudFormation..."
    BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)
fi

if [ -z "$BUCKET_NAME" ]; then
    error "Could not determine S3 bucket name"
fi

# Upload frontend to S3
log "Uploading frontend to S3 ($BUCKET_NAME)..."
aws s3 sync packages/frontend-web/dist/ "s3://$BUCKET_NAME" \
    --delete --profile "$AWS_PROFILE" --region "$AWS_REGION"

# Invalidate CloudFront
if [ -n "$DISTRIBUTION_ID" ]; then
    log "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --profile "$AWS_PROFILE" \
        --query 'Invalidation.Id' --output text
fi

log "✅ Beta deployment complete!"
log "🌐 URL: https://${SUBDOMAIN}.advm.lu"
