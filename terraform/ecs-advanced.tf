# Advanced ECS Service Configuration
# This file contains advanced ECS features that can be enabled after basic deployment

# Note: Uncomment these resources after the basic ECS service is working

/*
# ECS Service with Capacity Provider Strategy
resource "aws_ecs_service" "app_advanced" {
  name            = "${local.name_prefix}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.ecs_desired_count
  
  # Capacity provider strategy for cost optimization
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = var.use_spot_instances ? 1 : 1
    base             = 1
  }
  
  dynamic "capacity_provider_strategy" {
    for_each = var.use_spot_instances ? [1] : []
    content {
      capacity_provider = "FARGATE_SPOT"
      weight           = 4
    }
  }
  
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
  
  # Deployment configuration
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }
  
  health_check_grace_period_seconds = 120
  enable_execute_command = var.environment != "production"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-service"
  })
  
  depends_on = [
    aws_lb_listener.http,
    aws_ecs_cluster_capacity_providers.main,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
  
  lifecycle {
    ignore_changes = [desired_count]
  }
}
*/
