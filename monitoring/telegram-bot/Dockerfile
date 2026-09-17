# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/target/okututor-telegram-bot-1.0.0.jar app.jar
# non-root
RUN useradd -m -u 10001 botuser && chown botuser:botuser /app/app.jar
USER botuser
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:8085/health | grep -q ok || exit 1
ENTRYPOINT ["java","-jar","/app/app.jar"]
