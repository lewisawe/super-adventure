# Terraform Backend Infrastructure
# This creates S3 bucket and DynamoDB table for remote state management

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "plants-vs-zombies"
      Component   = "terraform-backend"
      ManagedBy   = "terraform"
      Environment = "shared"
    }
  }
}

# Get current AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Random suffix for unique bucket naming
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "pvz-terraform-state-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "Plants vs Zombies Terraform State"
    Description = "Stores Terraform state files for Plants vs Zombies infrastructure"
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy
resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyInsecureConnections"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "AllowTerraformAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      }
    ]
  })
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"
    
    # Keep current versions
    expiration {
      days = 0  # Never expire current versions
    }
    
    # Clean up old versions
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
    
    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# DynamoDB Table for State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "pvz-terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  tags = {
    Name        = "Plants vs Zombies Terraform Locks"
    Description = "Stores Terraform state locks for Plants vs Zombies infrastructure"
  }
}

# KMS Key for additional encryption (optional)
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Plants vs Zombies Terraform state encryption"
  deletion_window_in_days = 7
  
  tags = {
    Name        = "Plants vs Zombies Terraform State KMS Key"
    Description = "Encrypts Terraform state files"
  }
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/pvz-terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}
