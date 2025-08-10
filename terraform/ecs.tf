# ECS Cluster and Service Configuration

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"
  
  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cluster"
  })
}

# ECS Cluster Capacity Providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name
  
  capacity_providers = var.use_spot_instances ? ["FARGATE", "FARGATE_SPOT"] : ["FARGATE"]
  
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = var.use_spot_instances ? 1 : 1
    base             = 1
  }
  
  dynamic "default_capacity_provider_strategy" {
    for_each = var.use_spot_instances ? [1] : []
    content {
      capacity_provider = "FARGATE_SPOT"
      weight           = 4
    }
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = var.log_retention_days
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-logs"
  })
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name_prefix}-ecs-task-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "${local.name_prefix}-ecs-task-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${local.name_prefix}-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.environment == "production" ? [aws_secretsmanager_secret.redis_auth[0].arn] : []
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/pvz/${var.environment}/*"
      }
    ]
  })
}

# ECS Task Role (for application permissions)
resource "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-ecs-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "${local.name_prefix}-ecs-task-role"
  }
}

# Task role policy for CloudWatch metrics
resource "aws_iam_role_policy" "ecs_task_cloudwatch" {
  name = "${local.name_prefix}-ecs-task-cloudwatch-policy"
  role = aws_iam_role.ecs_task.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name_prefix}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn
  
  container_definitions = jsonencode([
    {
      name  = "pvz-app"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/plants-vs-zombies:latest"
      
      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = tostring(var.app_port)
        },
        {
          name  = "REDIS_HOST"
          value = aws_elasticache_replication_group.redis.primary_endpoint_address
        },
        {
          name  = "REDIS_PORT"
          value = tostring(var.redis_port)
        },
        {
          name  = "REDIS_TLS"
          value = var.environment == "production" ? "true" : "false"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "MAX_PLAYERS_PER_GAME"
          value = tostring(var.max_players_per_game)
        },
        {
          name  = "GAME_TIMEOUT"
          value = tostring(var.game_timeout)
        }
      ]
      
      # Add Redis auth token for production
      secrets = var.environment == "production" ? [
        {
          name      = "REDIS_AUTH_TOKEN"
          valueFrom = aws_secretsmanager_secret.redis_auth[0].arn
        }
      ] : []
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:${var.app_port}/api/health || exit 1"
        ]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }
      
      essential = true
    }
  ])
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-task"
  })
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${local.name_prefix}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"
  platform_version = "LATEST"
  
  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "pvz-app"
    container_port   = var.app_port
  }
  
  # Health check grace period
  health_check_grace_period_seconds = 120
  
  # Enable execute command for debugging
  enable_execute_command = var.environment != "production"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-service"
  })
  
  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
  
  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  
  tags = {}
}

# Auto Scaling Policy - CPU
resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${local.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_target_value
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# Auto Scaling Policy - Memory
resource "aws_appautoscaling_policy" "ecs_memory" {
  name               = "${local.name_prefix}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.memory_target_value
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# CloudWatch Alarms for ECS
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    ServiceName = aws_ecs_service.app.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {}
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-ecs-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    ServiceName = aws_ecs_service.app.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {}
}

resource "aws_cloudwatch_metric_alarm" "ecs_service_unhealthy" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-ecs-service-unhealthy"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RunningTaskCount"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "This metric monitors ECS running task count"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  treat_missing_data  = "breaching"
  
  dimensions = {
    ServiceName = aws_ecs_service.app.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {}
}
