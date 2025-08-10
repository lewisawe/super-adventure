# Outputs for Terraform Backend Infrastructure

output "s3_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "s3_bucket_region" {
  description = "Region of the S3 bucket"
  value       = data.aws_region.current.name
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.arn
}

output "kms_key_id" {
  description = "ID of the KMS key for state encryption"
  value       = aws_kms_key.terraform_state.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key for state encryption"
  value       = aws_kms_key.terraform_state.arn
}

output "backend_configuration" {
  description = "Backend configuration block for main Terraform configuration"
  value = {
    bucket         = aws_s3_bucket.terraform_state.bucket
    key            = "plants-vs-zombies/terraform.tfstate"
    region         = data.aws_region.current.name
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
    encrypt        = true
  }
}

output "backend_config_hcl" {
  description = "HCL backend configuration block"
  value = <<-EOT
    terraform {
      backend "s3" {
        bucket         = "${aws_s3_bucket.terraform_state.bucket}"
        key            = "plants-vs-zombies/terraform.tfstate"
        region         = "${data.aws_region.current.name}"
        dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
        encrypt        = true
      }
    }
  EOT
}
