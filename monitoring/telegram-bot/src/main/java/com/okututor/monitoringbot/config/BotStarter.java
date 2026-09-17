package com.okututor.monitoringbot.config;

import com.okututor.monitoringbot.bot.OkuTutorBot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;

@Configuration
public class BotStarter {

    private static final Logger log = LoggerFactory.getLogger(BotStarter.class);

    @Bean
    ApplicationRunner registerBot(OkuTutorBot bot, BotProperties props) {
        return args -> {
            if (props.getBotToken() == null || props.getBotToken().isBlank()) {
                log.warn("TELEGRAM_BOT_TOKEN empty — polling disabled (bot will still forward Alertmanager webhooks if token set later via restart)");
                return;
            }
            try {
                TelegramBotsApi api = new TelegramBotsApi(DefaultBotSession.class);
                api.registerBot(bot);
                log.info("Telegram polling started chatId={} allowed={} env={}", props.getChatId(), props.getAllowedSet(), props.getEnvironment());
            } catch (Exception e) {
                log.error("Failed to start Telegram polling", e);
            }
        };
    }
}
