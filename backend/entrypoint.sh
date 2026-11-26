#!/bin/sh
set -e
# Если OTEL endpoint пустой — полностью отключаем OTEL, иначе стартуем с агентом
if [ -z "$OTEL_EXPORTER_OTLP_ENDPOINT" ] || [ "$OTEL_EXPORTER_OTLP_ENDPOINT" = "" ]; then
  echo "[entrypoint] OTEL disabled (endpoint empty) -> running without javaagent"
  exec java -XX:MaxRAMPercentage=75 -jar /app/app.jar "$@"
else
  echo "[entrypoint] OTEL enabled -> $OTEL_EXPORTER_OTLP_ENDPOINT"
  exec java -javaagent:/app/opentelemetry-javaagent.jar -XX:MaxRAMPercentage=75 -jar /app/app.jar "$@"
fi
