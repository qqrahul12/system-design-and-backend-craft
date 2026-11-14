# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# 1. Multi-Stage Build: JDK 21 Builder
# -----------------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

# Copy POM and pre-fetch dependencies for layer caching
COPY pom.xml ./pom.xml
RUN mvn -B dependency:go-offline -DskipTests || true

# Copy source and package standalone jar
COPY src ./src
RUN mvn -B clean package -DskipTests

# -----------------------------------------------------------------------------
# 2. Runtime Stage: Lightweight JRE 21 Container
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /workspace/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseZGC", "-XX:+ZGenerational", "-jar", "app.jar"]
