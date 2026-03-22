package com.anomanet.report.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ReportDtos {

    public record GenerateReportRequest(
        UUID   caseId,
        String format   // "PDF" or "JSON"
    ) {}

    public record ReportResponse(
        UUID    reportId,
        String  downloadUrl,
        Instant generatedAt,
        String  format,
        long    sizeBytes
    ) {}

    public record ReportData(
        CaseSummary          caseSummary,
        AlertSummary         alertSummary,
        List<TransactionRow> transactions,
        Map<String, Double>  scoreBreakdown,
        String               explanation
    ) {}

    public record CaseSummary(
        UUID    caseId,
        String  status,
        String  assignedTo,
        Instant createdAt
    ) {}

    public record AlertSummary(
        UUID    alertId,
        String  accountId,
        double  anomaScore,
        String  alertType,
        Instant triggeredAt
    ) {}

    public record TransactionRow(
        UUID    id,
        String  referenceNumber,
        String  sourceAccountId,
        String  destAccountId,
        double  amount,
        String  channel,
        Instant initiatedAt,
        String  branchId,
        String  status
    ) {}
}