# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# --- OTEL javaagent (кешируется отдельным слоем) ---
FROM eclipse-temurin:21-jre AS otel
WORKDIR /tmp
ARG OTEL_VERSION=2.14.0
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/* \
 && wget -q https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_VERSION}/opentelemetry-javaagent.jar -O opentelemetry-javaagent.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 okututor && mkdir -p /app/data && chown okututor /app/data
USER okututor
COPY --from=otel /tmp/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar
COPY --from=build /app/target/okututor-backend-*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=10 CMD wget -qO- http://localhost:8080/actuator/health | grep -q UP
# OTEL включается только если OTEL_EXPORTER_OTLP_ENDPOINT задан (в prod). Без него агент спит.
ENTRYPOINT ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
