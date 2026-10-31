# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# 1. Multi-Stage Build: JDK 21 Builder
# -----------------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

# Copy root pom and parent structure
COPY pom.xml ./pom.xml
COPY ai-assistant-service/pom.xml ./ai-assistant-service/pom.xml

# Pre-fetch dependencies
RUN mvn -B -f ai-assistant-service/pom.xml dependency:go-offline -DskipTests || true

# Copy source and package
COPY ai-assistant-service/src ./ai-assistant-service/src
RUN mvn -B -f ai-assistant-service/pom.xml clean package -DskipTests

# -----------------------------------------------------------------------------
# 2. Runtime Stage: Lightweight JRE 21 Container
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /workspace/ai-assistant-service/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseZGC", "-XX:+ZGenerational", "-jar", "app.jar"]
