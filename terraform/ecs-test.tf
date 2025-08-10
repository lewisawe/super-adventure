# Minimal ECS Service Test Configuration
# This file can be used to test ECS service syntax

/*
# Uncomment to test ECS service configuration
resource "aws_ecs_service" "test" {
  name            = "test-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
    base             = 1
  }
  
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
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }
  
  health_check_grace_period_seconds = 120
  enable_execute_command = false
  
  depends_on = [
    aws_lb_listener.http,
    aws_ecs_cluster_capacity_providers.main
  ]
  
  lifecycle {
    ignore_changes = [desired_count]
  }
}
*/
