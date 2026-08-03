package com.guftaguu.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Sends bug reports and feedback to Discord via webhook embed messages.
 * Direct port of Node.js services/discordLogger.js.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DiscordService {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.discord.webhook-url:}")
    private String webhookUrl;

    /**
     * Sends a formatted embed to the configured Discord webhook.
     *
     * @param type        e.g. "Bug Report" or "Feature Request"
     * @param title       Short summary title
     * @param description Full description text
     */
    public void sendReport(String type, String title, String description) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.warn("Discord webhook URL not configured — report dropped: [{}] {}", type, title);
            return;
        }

        int color = "Bug Report".equals(type) ? 15548997 : 5763719; // red vs green

        Map<String, Object> embed = Map.of(
            "title", "📢 New " + type,
            "color", color,
            "fields", List.of(
                Map.of("name", "Title", "value", title),
                Map.of("name", "Description", "value", description)
            ),
            "footer", Map.of("text", "Guftaguu Report System"),
            "timestamp", Instant.now().toString()
        );

        Map<String, Object> payload = Map.of("embeds", List.of(embed));

        webClientBuilder.build()
            .post()
            .uri(webhookUrl)
            .bodyValue(payload)
            .retrieve()
            .toBodilessEntity()
            .doOnError(e -> log.error("Discord webhook failed: {}", e.getMessage()))
            .onErrorResume(e -> Mono.empty())
            .subscribe();
    }
}
