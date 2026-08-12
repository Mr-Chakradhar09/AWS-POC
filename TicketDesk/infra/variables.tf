variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ticketdesk-v2"
}

variable "app_port" {
  description = "Port exposed by the docker image"
  type        = number
  default     = 9090
}

variable "app_image" {
  description = "Docker image to run in the ECS cluster"
  type        = string
}

variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "ticketadmin"
}
