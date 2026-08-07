$ErrorActionPreference = "Stop"

# Configuration
$REGION = "us-east-1"
$PROJECT_NAME = "ticketdesk"
$ECR_REPO_NAME = "$PROJECT_NAME-api"

Write-Host "Starting AWS Sandbox Deployment..." -ForegroundColor Cyan

# 1. Get AWS Account ID
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
if (-not $ACCOUNT_ID) {
    Write-Error "Failed to get AWS Account ID. Make sure you are authenticated with AWS CLI."
    exit 1
}
$ECR_URI = "$ACCOUNT_ID.dkr.ecr.${REGION}.amazonaws.com"
Write-Host "AWS Account ID: $ACCOUNT_ID" -ForegroundColor Green

# 2. Ensure ECR Repository exists
Write-Host "Checking ECR Repository..." -ForegroundColor Cyan
try {
    aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION > $null 2>&1
} catch {
    Write-Host "Creating ECR Repository $ECR_REPO_NAME..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION > $null
}

# 3. Build and Push Docker Image
Write-Host "Building Docker Image..." -ForegroundColor Cyan
$GIT_SHA = (git rev-parse --short HEAD)
if (-not $GIT_SHA) {
    # Fallback if git is not initialized
    $GIT_SHA = (Get-Date -UFormat "%s")
}
$IMAGE_TAG = "$ECR_URI/${ECR_REPO_NAME}:$GIT_SHA"

docker build -t $IMAGE_TAG .

Write-Host "Pushing Docker Image to ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI
docker push $IMAGE_TAG

# 4. Package Lambda function
Write-Host "Packaging Lambda Function..." -ForegroundColor Cyan
if (-not (Test-Path "infra/lambda/package")) {
    New-Item -ItemType Directory -Force -Path "infra/lambda/package" | Out-Null
}
pip install -r infra/lambda/requirements.txt -t infra/lambda/package
Copy-Item "infra/lambda/thumbnail_generator.py" -Destination "infra/lambda/package/" -Force

# 5. Apply Terraform
Write-Host "Applying Terraform..." -ForegroundColor Cyan
cd infra
terraform init
terraform apply -var="app_image=$IMAGE_TAG" -auto-approve
$EC2_DNS = terraform output -raw ec2_public_dns
$CLOUDFRONT_URL = terraform output -raw cloudfront_url
cd ..

# 6. Build and Deploy Frontend
Write-Host "Building Frontend..." -ForegroundColor Cyan
cd frontend
npm install
npm run build
cd ..

Write-Host "Uploading Frontend to S3..." -ForegroundColor Cyan
# Get S3 bucket name from terraform (assuming prefix matches)
# Instead of hardcoding, let's use the CLI to find the bucket name
$FRONTEND_BUCKET = (aws s3api list-buckets --query "Buckets[?starts_with(Name, '${PROJECT_NAME}-frontend-')].Name" --output text)
aws s3 sync frontend/dist/ s3://$FRONTEND_BUCKET/ --delete

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "API EC2 URL: http://$EC2_DNS" -ForegroundColor Cyan
Write-Host "Frontend URL: https://$CLOUDFRONT_URL" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
