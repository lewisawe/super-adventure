# Monitoring and Alerting Configuration

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  name = "${local.name_prefix}-alerts"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alerts"
  })
}

# SNS Topic Subscription (Email)
resource "aws_sns_topic_subscription" "email_alerts" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = "admin@${var.domain_name}"  # Change this to your email
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  dashboard_name = "${local.name_prefix}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.app.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Resource Utilization"
          period  = 300
          stat    = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ECS", "RunningTaskCount", "ServiceName", aws_ecs_service.app.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "PendingTaskCount", ".", ".", ".", "."],
            [".", "DesiredCount", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Task Counts"
          period  = 300
          stat    = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${aws_elasticache_replication_group.redis.replication_group_id}-001"],
            [".", "DatabaseMemoryUsagePercentage", ".", "."],
            [".", "CurrConnections", ".", "."],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Redis ElastiCache Metrics"
          period  = 300
          stat    = "Average"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        
        properties = {
          query  = "SOURCE '${aws_cloudwatch_log_group.app.name}'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100"
          region = var.aws_region
          title  = "Recent Error Logs"
          view   = "table"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 8
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", aws_lb_target_group.app.arn_suffix, "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "UnHealthyHostCount", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Target Health"
          period  = 300
          stat    = "Average"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 18
        width  = 8
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CacheHits", "CacheClusterId", "${aws_elasticache_replication_group.redis.replication_group_id}-001"],
            [".", "CacheMisses", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Redis Cache Performance"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 18
        width  = 8
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ECS", "ServiceCount", "ClusterName", aws_ecs_cluster.main.name]
          ]
          view    = "singleValue"
          region  = var.aws_region
          title   = "Active Services"
          period  = 300
          stat    = "Average"
        }
      }
    ]
  })
}

# Custom CloudWatch Metrics for Game Statistics
resource "aws_cloudwatch_log_metric_filter" "game_started" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  name           = "${local.name_prefix}-games-started"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "[timestamp, level=\"info\", message=\"Game created\", ...]"
  
  metric_transformation {
    name      = "GamesStarted"
    namespace = "PlantsVsZombies"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "players_joined" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  name           = "${local.name_prefix}-players-joined"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "[timestamp, level=\"info\", message=\"Player joined\", ...]"
  
  metric_transformation {
    name      = "PlayersJoined"
    namespace = "PlantsVsZombies"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "errors" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  name           = "${local.name_prefix}-application-errors"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "[timestamp, level=\"error\", ...]"
  
  metric_transformation {
    name      = "ApplicationErrors"
    namespace = "PlantsVsZombies"
    value     = "1"
  }
}

# CloudWatch Alarm for Application Errors
resource "aws_cloudwatch_metric_alarm" "application_errors" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-application-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApplicationErrors"
  namespace           = "PlantsVsZombies"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors application errors"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  treat_missing_data  = "notBreaching"
  
  tags = {}
}

# CloudWatch Synthetics for Health Monitoring (optional)
resource "aws_synthetics_canary" "health_check" {
  count = var.enable_detailed_monitoring && var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  name                 = "${local.name_prefix}-health-check"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics_artifacts[0].bucket}/canary-artifacts"
  execution_role_arn   = aws_iam_role.synthetics_execution[0].arn
  handler              = "apiCanaryBlueprint.handler"
  zip_file             = "synthetics-canary.zip"
  runtime_version      = "syn-nodejs-puppeteer-3.9"
  
  schedule {
    expression = "rate(5 minutes)"
  }
  
  run_config {
    timeout_in_seconds = 60
    memory_in_mb      = 960
    active_tracing    = true
    
    environment_variables = {
      URL = var.domain_name != "plantsvszombies.yourdomain.com" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
    }
  }
  
  success_retention_period = 2
  failure_retention_period = 14
  
  tags = {
    Name = "${local.name_prefix}-synthetics-canary"
  }
}

# S3 Bucket for Synthetics Artifacts
resource "aws_s3_bucket" "synthetics_artifacts" {
  count = var.enable_detailed_monitoring && var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  bucket        = "${local.name_prefix}-synthetics-artifacts-${random_id.bucket_suffix.hex}"
  force_destroy = true
  
  tags = {
    Name = "${local.name_prefix}-synthetics-artifacts"
  }
}

resource "aws_s3_bucket_versioning" "synthetics_artifacts" {
  count = var.enable_detailed_monitoring && var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  bucket = aws_s3_bucket.synthetics_artifacts[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "synthetics_artifacts" {
  count = var.enable_detailed_monitoring && var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  bucket = aws_s3_bucket.synthetics_artifacts[0].id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Random ID for unique bucket naming
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# IAM Role for Synthetics Execution
resource "aws_iam_role" "synthetics_execution" {
  count = var.enable_detailed_monitoring && var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  name = "${local.name_prefix}-synthetics-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "${local.name_prefix}-synthetics-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "synthetics_execution" {
  count = var.enable_detailed_monitoring && var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  role       = aws_iam_role.synthetics_execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchSyntheticsExecutionRolePolicy"
}

# Additional policy for S3 access
resource "aws_iam_role_policy" "synthetics_s3" {
  count = var.enable_detailed_monitoring && var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  name = "${local.name_prefix}-synthetics-s3-policy"
  role = aws_iam_role.synthetics_execution[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.synthetics_artifacts[0].arn,
          "${aws_s3_bucket.synthetics_artifacts[0].arn}/*"
        ]
      }
    ]
  })
}
