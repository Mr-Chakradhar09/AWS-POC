variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "ticketdesk"
}

variable "app_image" {
  description = "The Docker image for the API"
  type        = string
  # Replace with the ECR URI once pushed
  default     = "nginx"
}

variable "app_port" {
  description = "Port the application runs on"
  type        = number
  default     = 9090
}
