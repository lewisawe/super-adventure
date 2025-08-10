# Terraform Backend Configuration Template
# This file will be automatically updated by setup-terraform-backend.sh

# Uncomment and update this block after running setup-terraform-backend.sh
/*
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "plants-vs-zombies/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "your-terraform-locks-table"
    encrypt        = true
  }
}
*/

# The setup script will:
# 1. Create S3 bucket with versioning and encryption
# 2. Create DynamoDB table for state locking
# 3. Update this configuration with actual resource names
# 4. Initialize Terraform with the remote backend
