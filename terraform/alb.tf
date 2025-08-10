# Application Load Balancer Configuration

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  
  enable_deletion_protection = var.enable_deletion_protection && var.environment == "production"
  
  # Access logs (optional, requires S3 bucket)
  # access_logs {
  #   bucket  = aws_s3_bucket.alb_logs.bucket
  #   prefix  = "alb-logs"
  #   enabled = true
  # }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

# Target Group for ECS Service
resource "aws_lb_target_group" "app" {
  name        = "${local.name_prefix}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }
  
  # Deregistration delay for faster deployments
  deregistration_delay = 30
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-tg"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# HTTP Listener (redirect to HTTPS in production)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = var.environment == "production" && var.domain_name != "plantsvszombies.yourdomain.com" ? "redirect" : "forward"
    
    # Redirect to HTTPS in production with custom domain
    dynamic "redirect" {
      for_each = var.environment == "production" && var.domain_name != "plantsvszombies.yourdomain.com" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    
    # Forward to target group for development or default domain
    target_group_arn = var.environment != "production" || var.domain_name == "plantsvszombies.yourdomain.com" ? aws_lb_target_group.app.arn : null
  }
  
  tags = {
    Name = "${local.name_prefix}-http-listener"
  }
}

# HTTPS Listener (only if custom domain is provided)
resource "aws_lb_listener" "https" {
  count = var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate_validation.main[0].certificate_arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
  
  tags = {
    Name = "${local.name_prefix}-https-listener"
  }
}

# SSL Certificate (only if custom domain is provided)
resource "aws_acm_certificate" "main" {
  count = var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  domain_name       = var.domain_name
  validation_method = "DNS"
  
  subject_alternative_names = [
    "*.${var.domain_name}"
  ]
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = merge(local.common_tags, {
    Name = var.domain_name
  })
}

# Route53 Zone (only if custom domain is provided)
data "aws_route53_zone" "main" {
  count = var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  name         = var.domain_name
  private_zone = false
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "plantsvszombies.yourdomain.com" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}

# Route53 A record pointing to ALB
resource "aws_route53_record" "main" {
  count = var.domain_name != "plantsvszombies.yourdomain.com" ? 1 : 0
  
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# CloudWatch Alarms for ALB
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-alb-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {}
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-alb-high-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5XX errors"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {}
}

resource "aws_cloudwatch_metric_alarm" "alb_healthy_hosts" {
  count = var.enable_detailed_monitoring ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-alb-unhealthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "This metric monitors healthy host count"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {}
}
