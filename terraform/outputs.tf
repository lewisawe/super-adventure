# Terraform Outputs

# Network Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

# Application URLs
output "game_url" {
  description = "URL to access the game"
  value       = var.domain_name != "plantsvszombies.yourdomain.com" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
}

output "api_url" {
  description = "URL to access the API"
  value       = var.domain_name != "plantsvszombies.yourdomain.com" ? "https://${var.domain_name}/api" : "http://${aws_lb.main.dns_name}/api"
}

output "health_check_url" {
  description = "URL for health checks"
  value       = var.domain_name != "plantsvszombies.yourdomain.com" ? "https://${var.domain_name}/api/health" : "http://${aws_lb.main.dns_name}/api/health"
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the Redis auth token secret"
  value       = var.environment == "production" ? aws_secretsmanager_secret.redis_auth[0].arn : null
  sensitive   = true
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "ecs_service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.app.id
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.app.arn
}

# ECR Outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.app.arn
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs_tasks.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

# Monitoring Outputs
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.arn
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = var.enable_detailed_monitoring ? aws_sns_topic.alerts[0].arn : null
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = var.enable_detailed_monitoring ? "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main[0].dashboard_name}" : null
}

# IAM Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

# Auto Scaling Outputs
output "autoscaling_target_resource_id" {
  description = "Resource ID of the auto scaling target"
  value       = aws_appautoscaling_target.ecs_target.resource_id
}

# SSL Certificate Outputs (if custom domain)
output "ssl_certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = var.domain_name != "plantsvszombies.yourdomain.com" ? aws_acm_certificate.main[0].arn : null
}

# Route53 Outputs (if custom domain)
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.domain_name != "plantsvszombies.yourdomain.com" ? data.aws_route53_zone.main[0].zone_id : null
}

# Deployment Information
output "deployment_info" {
  description = "Deployment information"
  value = {
    environment     = var.environment
    region         = var.aws_region
    game_url       = var.domain_name != "plantsvszombies.yourdomain.com" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
    api_url        = var.domain_name != "plantsvszombies.yourdomain.com" ? "https://${var.domain_name}/api" : "http://${aws_lb.main.dns_name}/api"
    health_url     = var.domain_name != "plantsvszombies.yourdomain.com" ? "https://${var.domain_name}/api/health" : "http://${aws_lb.main.dns_name}/api/health"
    cluster_name   = aws_ecs_cluster.main.name
    service_name   = aws_ecs_service.app.name
    log_group      = aws_cloudwatch_log_group.app.name
    dashboard_url  = var.enable_detailed_monitoring ? "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main[0].dashboard_name}" : null
  }
}

# Management Commands
output "management_commands" {
  description = "Useful management commands"
  value = {
    view_logs = "aws logs tail ${aws_cloudwatch_log_group.app.name} --follow --region ${var.aws_region}"
    scale_service = "aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.app.name} --desired-count 4 --region ${var.aws_region}"
    check_service = "aws ecs describe-services --cluster ${aws_ecs_cluster.main.name} --services ${aws_ecs_service.app.name} --region ${var.aws_region}"
    force_deployment = "aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.app.name} --force-new-deployment --region ${var.aws_region}"
    get_tasks = "aws ecs list-tasks --cluster ${aws_ecs_cluster.main.name} --service-name ${aws_ecs_service.app.name} --region ${var.aws_region}"
  }
}
