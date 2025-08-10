# Plants vs Zombies - Redis Edition
# Terraform Infrastructure Configuration

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67"
    }
  }
  
  # Uncomment and configure for remote state
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "plants-vs-zombies/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "plants-vs-zombies"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name_prefix = "${var.environment}-pvz"
  
  common_tags = {
    Project     = "plants-vs-zombies"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}
