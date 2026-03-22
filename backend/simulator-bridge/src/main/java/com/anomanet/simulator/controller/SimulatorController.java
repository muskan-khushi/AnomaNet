package com.anomanet.simulator.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Set;

/**
 * Simulator Bridge Controller.
 *
 * Acts as a thin HTTP proxy between the Spring backend and Muskan's
 * FastAPI ML data simulator.
 *
 * POST /api/simulate/scenario?type=CIRCULAR
 *   → forwards to FastAPI POST /simulator/trigger?type=CIRCULAR
 *   → returns {triggered: true, scenario_id: "...", type: "CIRCULAR"}
 *
 * Called by:
 *   - Rupali's SimulatorPage (via Next.js BFF /api/simulate/scenario)
 *   - Demo script (Act 2, Act 3)
 */
@RestController
@RequestMapping("/api/simulate")
public class SimulatorController {

    private static final Logger log = LoggerFactory.getLogger(SimulatorController.class);

    private static final Set<String> VALID_TYPES = Set.of(
        "CIRCULAR", "LAYERING", "STRUCTURING", "DORMANT", "PROFILE_MISMATCH"
    );

    @Value("${services.ml-service:http://localhost:8000}")
    private String mlServiceUrl;

    private final WebClient webClient = WebClient.builder().build();

    /**
     * POST /api/simulate/scenario?type=CIRCULAR
     * Forwards the scenario trigger to the ML FastAPI service.
     */
    @PostMapping("/scenario")
    public Mono<ResponseEntity<Map<String, Object>>> triggerScenario(
            @RequestParam String type) {

        String scenarioType = type.toUpperCase().trim();

        if (!VALID_TYPES.contains(scenarioType)) {
            return Mono.just(ResponseEntity
                .badRequest()
                .body(Map.of(
                    "error",       "Invalid scenario type: " + type,
                    "valid_types", VALID_TYPES
                )));
        }

        log.info("Forwarding scenario trigger: type={}", scenarioType);

        String targetUrl = mlServiceUrl + "/simulator/trigger?type=" + scenarioType;

        return webClient.post()
            .uri(targetUrl)
            .retrieve()
            .bodyToMono(Map.class)
            .map(body -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) body;
                log.info("Scenario triggered: {}", result);
                return ResponseEntity.ok(result);
            })
            .onErrorResume(ex -> {
                log.error("Scenario trigger failed: {}", ex.getMessage());
                return Mono.just(ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                        "error",   "ML service unavailable: " + ex.getMessage(),
                        "triggered", false
                    )));
            });
    }

    /**
     * GET /api/simulate/health
     * Checks if the ML simulator is reachable.
     */
    @GetMapping("/health")
    public Mono<ResponseEntity<Map<String, Object>>> health() {
        return webClient.get()
            .uri(mlServiceUrl + "/ml/health")
            .retrieve()
            .bodyToMono(Map.class)
            .map(body -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) body;
                return ResponseEntity.ok(Map.<String, Object>of(
                    "simulator_bridge", "UP",
                    "ml_service",       result.getOrDefault("status", "unknown")
                ));
            })
            .onErrorResume(ex -> Mono.just(ResponseEntity.ok(Map.of(
                "simulator_bridge", "UP",
                "ml_service",       "UNREACHABLE",
                "error",            ex.getMessage()
            ))));
    }
}