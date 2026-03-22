package com.anomanet.report.service;

import com.anomanet.report.dto.ReportDtos.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

/**
 * Fetches all data needed to build a FIU report by calling other microservices.
 * Gracefully degrades if a service is unavailable.
 */
@Service
public class ReportDataFetcherService {

    private static final Logger log = LoggerFactory.getLogger(ReportDataFetcherService.class);

    @Value("${services.case-service:http://localhost:8083}")
    private String caseServiceUrl;

    @Value("${services.alert-service:http://localhost:8082}")
    private String alertServiceUrl;

    @Value("${services.transaction-service:http://localhost:8081}")
    private String transactionServiceUrl;

    @Value("${services.ml-service:http://localhost:8000}")
    private String mlServiceUrl;

    private final RestTemplate   restTemplate = new RestTemplate();
    private final ObjectMapper   mapper       = new ObjectMapper();

    public ReportData fetchReportData(UUID caseId) {
        CaseSummary          caseSummary   = fetchCase(caseId);
        AlertSummary         alertSummary  = fetchAlert(caseSummary);
        List<TransactionRow> transactions  = fetchTransactions(caseSummary, alertSummary);
        Map<String, Double>  breakdown     = fetchScoreBreakdown(alertSummary);
        String               explanation   = fetchExplanation(alertSummary, breakdown);

        return new ReportData(caseSummary, alertSummary, transactions, breakdown, explanation);
    }

    // ── Case ────────────────────────────────────────────────────────────────

    private CaseSummary fetchCase(UUID caseId) {
        try {
            String url  = caseServiceUrl + "/api/cases/" + caseId;
            JsonNode j  = restTemplate.getForObject(url, JsonNode.class);
            if (j != null) {
                return new CaseSummary(
                    UUID.fromString(j.path("id").asText()),
                    j.path("status").asText("UNKNOWN"),
                    j.path("assignedTo").asText(null),
                    parseInstant(j.path("createdAt").asText())
                );
            }
        } catch (Exception e) {
            log.warn("Could not fetch case {}: {}", caseId, e.getMessage());
        }
        return new CaseSummary(caseId, "UNKNOWN", null, Instant.now());
    }

    // ── Alert ───────────────────────────────────────────────────────────────

    private AlertSummary fetchAlert(CaseSummary cs) {
        // Try to get the alert linked to this case
        try {
            String url = caseServiceUrl + "/api/cases/" + cs.caseId();
            JsonNode j = restTemplate.getForObject(url, JsonNode.class);
            if (j != null) {
                String alertId = j.path("alertId").asText(null);
                if (alertId != null) {
                    return fetchAlertById(UUID.fromString(alertId));
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch alert for case {}: {}", cs.caseId(), e.getMessage());
        }
        return new AlertSummary(UUID.randomUUID(), "UNKNOWN", 0.0, "COMPOSITE", Instant.now());
    }

    private AlertSummary fetchAlertById(UUID alertId) {
        try {
            String   url = alertServiceUrl + "/api/alerts/" + alertId;
            JsonNode j   = restTemplate.getForObject(url, JsonNode.class);
            if (j != null) {
                return new AlertSummary(
                    alertId,
                    j.path("accountId").asText("UNKNOWN"),
                    j.path("anomaScore").asDouble(0.0),
                    j.path("alertType").asText("COMPOSITE"),
                    parseInstant(j.path("createdAt").asText())
                );
            }
        } catch (Exception e) {
            log.warn("Could not fetch alert {}: {}", alertId, e.getMessage());
        }
        return new AlertSummary(alertId, "UNKNOWN", 0.0, "COMPOSITE", Instant.now());
    }

    // ── Transactions ─────────────────────────────────────────────────────────

    private List<TransactionRow> fetchTransactions(CaseSummary cs, AlertSummary alert) {
        try {
            String url = transactionServiceUrl
                + "/api/transactions?accountId=" + alert.accountId()
                + "&size=50";
            JsonNode j = restTemplate.getForObject(url, JsonNode.class);
            if (j != null) {
                JsonNode content = j.path("content");
                List<TransactionRow> rows = new ArrayList<>();
                for (JsonNode tx : content) {
                    rows.add(new TransactionRow(
                        UUID.fromString(tx.path("id").asText(UUID.randomUUID().toString())),
                        tx.path("referenceNumber").asText(""),
                        tx.path("sourceAccountId").asText(""),
                        tx.path("destAccountId").asText(""),
                        tx.path("amount").asDouble(0),
                        tx.path("channel").asText(""),
                        parseInstant(tx.path("initiatedAt").asText()),
                        tx.path("branchId").asText(""),
                        tx.path("status").asText("")
                    ));
                }
                return rows;
            }
        } catch (Exception e) {
            log.warn("Could not fetch transactions for account {}: {}", alert.accountId(), e.getMessage());
        }
        return List.of();
    }

    // ── Score Breakdown ──────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Double> fetchScoreBreakdown(AlertSummary alert) {
        try {
            String   url = alertServiceUrl + "/api/alerts/" + alert.alertId();
            JsonNode j   = restTemplate.getForObject(url, JsonNode.class);
            if (j != null) {
                JsonNode bd = j.path("scoreBreakdown");
                Map<String, Double> result = new LinkedHashMap<>();
                bd.fields().forEachRemaining(e ->
                    result.put(e.getKey(), e.getValue().asDouble(0.0)));
                if (!result.isEmpty()) return result;
            }
        } catch (Exception e) {
            log.warn("Could not fetch score breakdown: {}", e.getMessage());
        }
        return Map.of(
            "layering",         0.0,
            "circular",         0.0,
            "structuring",      0.0,
            "dormancy",         0.0,
            "profile_mismatch", 0.0
        );
    }

    // ── Explanation ─────────────────────────────────────────────────────────

    private String fetchExplanation(AlertSummary alert, Map<String, Double> breakdown) {
        try {
            String url     = mlServiceUrl + "/ml/explain";
            Map<String, Object> body = Map.of(
                "alert_id",        alert.alertId().toString(),
                "score_breakdown", breakdown
            );
            JsonNode j = restTemplate.postForObject(url, body, JsonNode.class);
            if (j != null) {
                return j.path("explanation").asText("");
            }
        } catch (Exception e) {
            log.warn("Could not fetch ML explanation: {}", e.getMessage());
        }
        return "Automated explanation not available. Please review score breakdown above.";
    }

    // ── Util ─────────────────────────────────────────────────────────────────

    private Instant parseInstant(String s) {
        if (s == null || s.isBlank()) return Instant.now();
        try {
            return Instant.parse(s.endsWith("Z") ? s : s + "Z");
        } catch (Exception e) {
            return Instant.now();
        }
    }
}