# Variables for Plants vs Zombies - Redis Edition

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "plantsvszombies.yourdomain.com"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

# ECS Configuration
variable "ecs_task_cpu" {
  description = "CPU units for ECS task"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "Memory (MB) for ECS task"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS tasks"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS tasks"
  type        = number
  default     = 10
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in the replication group"
  type        = number
  default     = 2
}

variable "redis_port" {
  description = "Port for Redis"
  type        = number
  default     = 6379
}

# Application Configuration
variable "app_port" {
  description = "Port for the application"
  type        = number
  default     = 3001
}

variable "max_players_per_game" {
  description = "Maximum players per game"
  type        = number
  default     = 4
}

variable "game_timeout" {
  description = "Game timeout in milliseconds"
  type        = number
  default     = 3600000
}

# Monitoring Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = true
}

# Auto Scaling Configuration
variable "cpu_target_value" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70.0
}

variable "memory_target_value" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80.0
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

# Cost Optimization
variable "use_spot_instances" {
  description = "Use Fargate Spot instances for cost savings"
  type        = bool
  default     = false
}

variable "enable_container_insights" {
  description = "Enable Container Insights for ECS cluster"
  type        = bool
  default     = true
}
