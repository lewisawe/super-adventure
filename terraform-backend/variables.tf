# Variables for Terraform Backend Infrastructure

variable "aws_region" {
  description = "AWS region for the backend infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name_prefix" {
  description = "Prefix for the S3 bucket name"
  type        = string
  default     = "pvz-terraform-state"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  type        = string
  default     = "pvz-terraform-locks"
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for the S3 bucket"
  type        = bool
  default     = false
}

variable "state_file_retention_days" {
  description = "Number of days to retain old state file versions"
  type        = number
  default     = 90
}
