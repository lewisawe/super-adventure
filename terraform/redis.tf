# Redis ElastiCache Configuration

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name_prefix}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnet-group"
  })
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  family = "redis6.x"
  name   = "${local.name_prefix}-redis-params"
  
  # Optimize for gaming workload
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }
  
  # Enable keyspace notifications for pub/sub
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-params"
  })
}

# ElastiCache Replication Group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "${local.name_prefix}-redis"
  description                  = "Redis cluster for Plants vs Zombies game"
  
  # Engine configuration
  engine                       = "redis"
  engine_version               = "6.2"
  
  # Node configuration
  node_type                    = var.redis_node_type
  port                         = var.redis_port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  
  # Cluster configuration
  num_cache_clusters           = var.redis_num_cache_clusters
  
  # Network configuration
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]
  
  # Security configuration
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = var.environment == "production"  # Required when using auth_token
  auth_token                   = var.environment == "production" ? random_password.redis_auth.result : null
  
  # Backup configuration
  automatic_failover_enabled   = var.redis_num_cache_clusters > 1
  multi_az_enabled            = var.redis_num_cache_clusters > 1
  snapshot_retention_limit     = var.environment == "production" ? 7 : 1
  snapshot_window             = "03:00-05:00"
  maintenance_window          = "sun:05:00-sun:06:00"
  
  # Monitoring
  notification_topic_arn      = var.enable_detailed_monitoring ? aws_sns_topic.alerts[0].arn : null
  
  # Deletion protection - Note: deletion_protection is not available for ElastiCache
  # Use final_snapshot_identifier instead for data protection
  final_snapshot_identifier = var.enable_deletion_protection && var.environment == "production" ? "${local.name_prefix}-final-snapshot" : null
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })
  
  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}

# Random password for Redis auth (production only)
resource "random_password" "redis_auth" {
  length  = 32
  special = false  # Use only alphanumeric characters for maximum compatibility
  upper   = true
  lower   = true
  numeric = true
}

# Store Redis auth token in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  count = var.environment == "production" ? 1 : 0
  
  name        = "${local.name_prefix}-redis-auth"
  description = "Redis authentication token"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-auth"
  })
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  count = var.environment == "production" ? 1 : 0
  
  secret_id = aws_secretsmanager_secret.redis_auth[0].id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
  })
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors redis cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.replication_group_id}-001"
  }
  
  tags = {}
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors redis memory utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.replication_group_id}-001"
  }
  
  tags = {}
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-redis-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"
  alarm_description   = "This metric monitors redis connection count"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.replication_group_id}-001"
  }
  
  tags = {}
}
