# Stage 1: Build the application
FROM maven:3.9.4-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
# Download dependencies first to leverage Docker cache
RUN mvn dependency:go-offline -B
COPY src ./src
# Build the JAR without running tests (to speed up build)
RUN mvn clean package -DskipTests

# Stage 2: Create the minimal runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root user and group
RUN addgroup -S ticketgroup && adduser -S ticketuser -G ticketgroup

# Copy the built jar from the builder stage
COPY --from=builder /app/target/api-0.0.1-SNAPSHOT.jar app.jar

# Change ownership of the jar to the non-root user
RUN chown ticketuser:ticketgroup app.jar

# Switch to the non-root user
USER ticketuser

# Expose the port the app runs on
EXPOSE 9090

# Add a HEALTHCHECK as required by the checklist
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9090/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
