package com.okututor.backend.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS единая конфигурация в SecurityConfig (corsConfigurationSource).
 * WebConfig оставлен пустым намеренно — дублирование CorsRegistry и Security CORS
 * приводило к рассинхрону (ProdEnvValidator не валидировал http). P2: единый источник.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    // CORS handled in SecurityConfig only
}
