package com.anomanet.report.controller;

import com.anomanet.report.dto.ReportDtos.*;
import com.anomanet.report.service.PdfGeneratorService;
import com.anomanet.report.service.ReportDataFetcherService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);

    private final PdfGeneratorService      pdfGeneratorService;
    private final ReportDataFetcherService dataFetcherService;

    // In-memory store for generated reports (keyed by reportId)
    // In production this would be S3/MinIO. For hackathon demo, in-memory is fine.
    private final Map<UUID, byte[]> reportStore = new ConcurrentHashMap<>();

    public ReportController(
            PdfGeneratorService      pdfGeneratorService,
            ReportDataFetcherService dataFetcherService) {
        this.pdfGeneratorService = pdfGeneratorService;
        this.dataFetcherService  = dataFetcherService;
    }

    /**
     * POST /api/reports/generate
     * Generates a FIU evidence PDF for the given case.
     * Called by Rupali's EvidenceBuilderPage.
     */
    @PostMapping("/generate")
    public ResponseEntity<ReportResponse> generate(@RequestBody GenerateReportRequest req) {
        log.info("Generating report for caseId={} format={}", req.caseId(), req.format());

        try {
            // Fetch all data needed for the report
            ReportData data = dataFetcherService.fetchReportData(req.caseId());

            // Generate PDF
            byte[] pdf = pdfGeneratorService.generateFiuReport(data);

            UUID   reportId    = UUID.randomUUID();
            String downloadUrl = "/api/reports/" + reportId + "/download";

            // Cache in memory
            reportStore.put(reportId, pdf);

            ReportResponse response = new ReportResponse(
                reportId,
                downloadUrl,
                Instant.now(),
                req.format() != null ? req.format() : "PDF",
                pdf.length
            );

            log.info("Report generated: reportId={} size={}B", reportId, pdf.length);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            log.error("Report generation failed for caseId={}: {}", req.caseId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/reports/{id}/download
     * Returns the generated PDF as a downloadable file.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        byte[] pdf = reportStore.get(id);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(
            "attachment",
            "AnomaNet_FIU_Report_" + id + ".pdf"
        );
        headers.setContentLength(pdf.length);

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    /**
     * GET /api/reports/{id}
     * Returns report metadata.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getMetadata(@PathVariable UUID id) {
        byte[] pdf = reportStore.get(id);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
            "reportId",    id,
            "sizeBytes",   pdf.length,
            "downloadUrl", "/api/reports/" + id + "/download",
            "format",      "PDF"
        ));
    }
}