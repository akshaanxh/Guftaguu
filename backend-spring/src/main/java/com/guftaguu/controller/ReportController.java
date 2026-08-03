package com.guftaguu.controller;

import com.guftaguu.model.ReportRequest;
import com.guftaguu.service.DiscordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * HTTP REST endpoints.
 * Mirrors Node.js index.js routes:
 *   GET  /            → health check
 *   POST /api/report  → forward bug report to Discord
 */
@Slf4j
@RestController
@CrossOrigin(origins = {"http://localhost:5173", "https://guftaguu.vercel.app"})
@RequiredArgsConstructor
public class ReportController {

    private final DiscordService discordService;

    @GetMapping("/")
    public String health() {
        return "Guftaguu Server is Alive!";
    }

    @PostMapping("/api/report")
    public ResponseEntity<?> report(@RequestBody ReportRequest body) {
        if (body.getTitle() == null || body.getTitle().isBlank()
                || body.getDescription() == null || body.getDescription().isBlank()
                || body.getType() == null || body.getType().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing fields"));
        }

        try {
            discordService.sendReport(body.getType(), body.getTitle(), body.getDescription());
            log.info("Report submitted: [{}] {}", body.getType(), body.getTitle());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to send Discord report", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to send report"));
        }
    }
}
