#!/bin/bash
set -e

# Configuration
REGION="us-east-1"
PROJECT_NAME="ticketdesk"
ECR_REPO_NAME="${PROJECT_NAME}-api"

echo -e "\e[36mStarting AWS Sandbox Deployment...\e[0m"

# 1. Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo "Failed to get AWS Account ID. Make sure you are authenticated with AWS CLI."
    exit 1
fi
ECR_URI="$ACCOUNT_ID.dkr.ecr.${REGION}.amazonaws.com"
echo -e "\e[32mAWS Account ID: $ACCOUNT_ID\e[0m"

# 2. Ensure ECR Repository exists
echo -e "\e[36mChecking ECR Repository...\e[0m"
if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION > /dev/null 2>&1; then
    echo -e "\e[33mCreating ECR Repository $ECR_REPO_NAME...\e[0m"
    aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION > /dev/null
fi

# 3. Build and Push Docker Image
echo -e "\e[36mBuilding Docker Image...\e[0m"
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    GIT_SHA=$(git rev-parse --short HEAD)
else
    GIT_SHA=$(date +%s)
fi
IMAGE_TAG="$ECR_URI/${ECR_REPO_NAME}:$GIT_SHA"

docker build -t $IMAGE_TAG .

echo -e "\e[36mPushing Docker Image to ECR...\e[0m"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI
docker push $IMAGE_TAG

# 4. Package Lambda function
echo -e "\e[36mPackaging Lambda Function...\e[0m"
mkdir -p infra/lambda/package
pip3 install -r infra/lambda/requirements.txt -t infra/lambda/package
cp infra/lambda/thumbnail_generator.py infra/lambda/package/

# 5. Apply Terraform
echo -e "\e[36mApplying Terraform...\e[0m"
cd infra
terraform init
terraform apply -var="app_image=$IMAGE_TAG" -auto-approve
EC2_DNS=$(terraform output -raw ec2_public_dns)
FRONTEND_URL=$(terraform output -raw s3_website_url)
cd ..

# 6. Build and Deploy Frontend
echo -e "\e[36mBuilding Frontend...\e[0m"
cd frontend
npm install
npm run build
cd ..

echo -e "\e[36mUploading Frontend to S3...\e[0m"
FRONTEND_BUCKET=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, '${PROJECT_NAME}-frontend-')].Name" --output text)
aws s3 sync frontend/dist/ s3://$FRONTEND_BUCKET/ --delete

echo ""
echo -e "\e[32m==========================================================\e[0m"
echo -e "\e[32mDEPLOYMENT COMPLETE!\e[0m"
echo -e "\e[36mAPI EC2 URL: http://$EC2_DNS\e[0m"
echo -e "\e[36mFrontend URL: http://$FRONTEND_URL\e[0m"
echo -e "\e[32m==========================================================\e[0m"
