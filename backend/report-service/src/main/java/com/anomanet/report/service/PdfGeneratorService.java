package com.anomanet.report.service;

import com.anomanet.report.dto.ReportDtos.*;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class PdfGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(PdfGeneratorService.class);

    // AnomaNet brand colours
    private static final DeviceRgb NAVY       = new DeviceRgb(10,  25,  70);
    private static final DeviceRgb RED_ALERT  = new DeviceRgb(220, 38,  38);
    private static final DeviceRgb AMBER      = new DeviceRgb(245, 158, 11);
    private static final DeviceRgb GREEN_OK   = new DeviceRgb(22,  163, 74);
    private static final DeviceRgb LIGHT_GREY = new DeviceRgb(243, 244, 246);
    private static final DeviceRgb DARK_TEXT  = new DeviceRgb(17,  24,  39);

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter
            .ofPattern("dd-MMM-yyyy HH:mm:ss z")
            .withZone(ZoneId.of("Asia/Kolkata"));

    public byte[] generateFiuReport(ReportData data) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter   writer   = new PdfWriter(baos);
            PdfDocument pdfDoc   = new PdfDocument(writer);
            Document    document = new Document(pdfDoc);
            document.setMargins(36, 36, 36, 36);

            addCoverPage(document, data);
            addAccountSummarySection(document, data);
            addScoreBreakdownSection(document, data);
            addTransactionTrailSection(document, data);
            addNarrativeSection(document, data);
            addFooter(document);

            document.close();
            log.info("FIU report generated: caseId={}, size={}B",
                     data.caseSummary().caseId(), baos.size());
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("PDF generation failed: {}", e.getMessage(), e);
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ── Cover Page ──────────────────────────────────────────────────────────

    private void addCoverPage(Document doc, ReportData data) {
        // Header bar
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1}))
                .useAllAvailableWidth()
                .setBackgroundColor(NAVY);

        Cell headerCell = new Cell()
                .add(new Paragraph("AnomaNet")
                        .setFontColor(ColorConstants.WHITE)
                        .setFontSize(28)
                        .setBold()
                        .setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Financial Intelligence Unit — Evidence Package")
                        .setFontColor(ColorConstants.WHITE)
                        .setFontSize(12)
                        .setTextAlignment(TextAlignment.CENTER))
                .setPadding(20)
                .setBorder(null);
        headerTable.addCell(headerCell);
        doc.add(headerTable);

        doc.add(new Paragraph("\n"));

        // Case reference block
        AlertSummary alert = data.alertSummary();
        CaseSummary  cs    = data.caseSummary();

        Table refTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .useAllAvailableWidth()
                .setMarginTop(10);

        addMetaRow(refTable, "Case Reference",      cs.caseId().toString());
        addMetaRow(refTable, "Alert ID",            alert.alertId().toString());
        addMetaRow(refTable, "Flagged Account",     alert.accountId());
        addMetaRow(refTable, "Alert Type",          alert.alertType());
        addMetaRow(refTable, "AnomaScore",          String.format("%.2f", alert.anomaScore()));
        addMetaRow(refTable, "Alert Triggered At",  DT_FMT.format(alert.triggeredAt()));
        addMetaRow(refTable, "Case Status",         cs.status());
        addMetaRow(refTable, "Report Generated At", DT_FMT.format(Instant.now()));
        addMetaRow(refTable, "Assigned Investigator", cs.assignedTo() != null ? cs.assignedTo() : "Unassigned");

        doc.add(refTable);
        doc.add(new Paragraph("\n"));

        // Risk badge
        String riskLabel = riskLabel(alert.anomaScore());
        DeviceRgb riskColour = alert.anomaScore() >= 0.80 ? RED_ALERT
                             : alert.anomaScore() >= 0.65 ? AMBER
                             : GREEN_OK;

        Paragraph riskBadge = new Paragraph("RISK LEVEL: " + riskLabel)
                .setBackgroundColor(riskColour)
                .setFontColor(ColorConstants.WHITE)
                .setBold()
                .setFontSize(14)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(10);
        doc.add(riskBadge);
        doc.add(new AreaBreak());
    }

    // ── Account Summary ─────────────────────────────────────────────────────

    private void addAccountSummarySection(Document doc, ReportData data) {
        addSectionHeader(doc, "1. Account & Alert Summary");

        AlertSummary alert = data.alertSummary();
        Table t = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
        addMetaRow(t, "Primary Account ID",  alert.accountId());
        addMetaRow(t, "Composite AnomaScore", String.format("%.4f", alert.anomaScore()));
        addMetaRow(t, "Pattern Detected",    alert.alertType());
        addMetaRow(t, "Alert Triggered",     DT_FMT.format(alert.triggeredAt()));
        doc.add(t);
        doc.add(new Paragraph("\n"));
    }

    // ── Score Breakdown ─────────────────────────────────────────────────────

    private void addScoreBreakdownSection(Document doc, ReportData data) {
        addSectionHeader(doc, "2. ML Score Breakdown");

        Map<String, Double> breakdown = data.scoreBreakdown();
        if (breakdown == null || breakdown.isEmpty()) {
            doc.add(new Paragraph("Score breakdown not available.").setFontSize(10));
            return;
        }

        // Weights from blueprint
        Map<String, Double> weights = Map.of(
            "layering",         0.25,
            "circular",         0.30,
            "structuring",      0.20,
            "dormancy",         0.10,
            "profile_mismatch", 0.15
        );

        Table t = new Table(UnitValue.createPercentArray(new float[]{3, 2, 2, 3}))
                .useAllAvailableWidth()
                .setFontSize(10);

        // Header row
        for (String h : new String[]{"Pattern", "Score", "Weight", "Severity"}) {
            t.addHeaderCell(new Cell()
                    .add(new Paragraph(h).setBold())
                    .setBackgroundColor(NAVY)
                    .setFontColor(ColorConstants.WHITE)
                    .setPadding(6));
        }

        String[] order = {"circular", "layering", "structuring", "dormancy", "profile_mismatch"};
        for (String key : order) {
            double score  = breakdown.getOrDefault(key, 0.0);
            double weight = weights.getOrDefault(key, 0.0);
            String label  = scoreLabel(score);
            DeviceRgb bg  = score >= 0.80 ? new DeviceRgb(254, 226, 226)
                          : score >= 0.65 ? new DeviceRgb(254, 243, 199)
                          : LIGHT_GREY;

            t.addCell(cell(key.replace("_", " ").toUpperCase(), bg));
            t.addCell(cell(String.format("%.3f", score), bg));
            t.addCell(cell(String.format("%.0f%%", weight * 100), bg));
            t.addCell(cell(label, bg));
        }

        doc.add(t);
        doc.add(new Paragraph("\n"));
    }

    // ── Transaction Trail ───────────────────────────────────────────────────

    private void addTransactionTrailSection(Document doc, ReportData data) {
        addSectionHeader(doc, "3. Transaction Trail (Audit Evidence)");

        if (data.transactions() == null || data.transactions().isEmpty()) {
            doc.add(new Paragraph("No transactions linked to this case.").setFontSize(10));
            return;
        }

        Table t = new Table(UnitValue.createPercentArray(new float[]{2, 2, 2, 2, 1.5f, 1.5f, 2}))
                .useAllAvailableWidth()
                .setFontSize(8);

        for (String h : new String[]{"Reference", "From Account", "To Account", "Amount (₹)", "Channel", "Status", "Initiated At"}) {
            t.addHeaderCell(new Cell()
                    .add(new Paragraph(h).setBold())
                    .setBackgroundColor(NAVY)
                    .setFontColor(ColorConstants.WHITE)
                    .setPadding(4));
        }

        for (TransactionRow tx : data.transactions()) {
            DeviceRgb bg = LIGHT_GREY;
            t.addCell(cell(tx.referenceNumber(), bg));
            t.addCell(cell(tx.sourceAccountId(), bg));
            t.addCell(cell(tx.destAccountId(), bg));
            t.addCell(cell(formatInr(tx.amount()), bg));
            t.addCell(cell(tx.channel(), bg));
            t.addCell(cell(tx.status(), bg));
            t.addCell(cell(DT_FMT.format(tx.initiatedAt()), bg));
        }

        doc.add(t);
        doc.add(new Paragraph(
            String.format("Total transactions shown: %d", data.transactions().size()))
            .setFontSize(9).setItalic().setMarginTop(4));
        doc.add(new Paragraph("\n"));
    }

    // ── Narrative Section ───────────────────────────────────────────────────

    private void addNarrativeSection(Document doc, ReportData data) {
        addSectionHeader(doc, "4. AI-Generated Investigation Narrative");

        String explanation = data.explanation();
        if (explanation == null || explanation.isBlank()) {
            explanation = "Explanation not available. Review score breakdown above.";
        }

        doc.add(new Paragraph(explanation)
                .setFontSize(11)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginTop(8)
                .setMarginBottom(8)
                .setPadding(12)
                .setBackgroundColor(LIGHT_GREY));

        doc.add(new Paragraph("\n"));
        addSectionHeader(doc, "5. Investigator Notes");
        doc.add(new Paragraph("[To be completed by assigned investigator before FIU submission]")
                .setFontSize(10)
                .setItalic()
                .setFontColor(new DeviceRgb(107, 114, 128)));

        // Signature block
        doc.add(new Paragraph("\n\n"));
        Table sig = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
        sig.addCell(new Cell().add(new Paragraph("Investigator Signature: ___________________").setFontSize(10)).setBorder(null));
        sig.addCell(new Cell().add(new Paragraph("Date: ___________________").setFontSize(10)).setBorder(null));
        doc.add(sig);
    }

    // ── Footer ──────────────────────────────────────────────────────────────

    private void addFooter(Document doc) {
        doc.add(new Paragraph("\n\n"));
        Paragraph footer = new Paragraph(
            "CONFIDENTIAL — FIU-IND Submission Package\n" +
            "Generated by AnomaNet Fraud Intelligence Platform | " + DT_FMT.format(Instant.now()) + "\n" +
            "This document is intended for submission to FIU-IND's goAML portal only.")
                .setFontSize(8)
                .setFontColor(new DeviceRgb(107, 114, 128))
                .setTextAlignment(TextAlignment.CENTER)
                .setItalic();
        doc.add(footer);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void addSectionHeader(Document doc, String title) {
        doc.add(new Paragraph(title)
                .setFontSize(13)
                .setBold()
                .setFontColor(NAVY)
                .setMarginTop(12)
                .setMarginBottom(6)
                .setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(NAVY, 1)));
    }

    private void addMetaRow(Table t, String label, String value) {
        t.addCell(new Cell().add(new Paragraph(label).setBold().setFontSize(10)).setBackgroundColor(LIGHT_GREY).setPadding(6).setBorder(null));
        t.addCell(new Cell().add(new Paragraph(value != null ? value : "—").setFontSize(10)).setPadding(6).setBorder(null));
    }

    private Cell cell(String text, DeviceRgb bg) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "—").setFontSize(9))
                .setBackgroundColor(bg)
                .setPadding(4);
    }

    private String riskLabel(double score) {
        if (score >= 0.80) return "CRITICAL";
        if (score >= 0.65) return "HIGH";
        if (score >= 0.45) return "MEDIUM";
        return "LOW";
    }

    private String scoreLabel(double score) {
        if (score >= 0.80) return "CRITICAL";
        if (score >= 0.65) return "HIGH";
        if (score >= 0.45) return "MEDIUM";
        return "LOW";
    }

    private String formatInr(double amount) {
        // Simple Indian lakh formatting
        if (amount >= 10_000_000) return String.format("%.2f Cr", amount / 10_000_000);
        if (amount >= 100_000)    return String.format("%.2f L",  amount / 100_000);
        return String.format("%.2f", amount);
    }
}