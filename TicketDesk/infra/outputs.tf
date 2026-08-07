output "ec2_public_dns" {
  value = aws_instance.api.public_dns
  description = "The Public DNS of the EC2 instance"
}

output "s3_website_url" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
  description = "The S3 Website URL for the frontend"
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
  description = "The connection endpoint for the RDS database"
}
