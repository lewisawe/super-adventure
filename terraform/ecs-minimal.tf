# Minimal ECS Service Configuration for Testing
# This file contains a working ECS service configuration

/*
# Uncomment to test minimal ECS service
resource "aws_ecs_service" "minimal" {
  name            = "minimal-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
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
  
  depends_on = [aws_lb_listener.http]
}
*/
