# Multi-stage Docker build for Guftaguu Spring Boot Backend
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./gradlew build -x test --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/guftaguu-backend-1.0.0.jar app.jar
EXPOSE 3001 3002
ENTRYPOINT ["java", "-jar", "app.jar"]
