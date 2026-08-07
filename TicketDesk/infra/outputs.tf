output "ec2_public_dns" {
  value = aws_instance.api.public_dns
  description = "The Public DNS of the EC2 instance"
}

output "cloudfront_url" {
  value = aws_cloudfront_distribution.frontend.domain_name
  description = "The CloudFront URL for the frontend"
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
  description = "The connection endpoint for the RDS database"
}
