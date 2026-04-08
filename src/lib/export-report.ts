import jsPDF from "jspdf";
import type { ComparisonResult } from "./diff-engine2";

export function exportToPdf(
  result: ComparisonResult,
  sourceFile: string,
  targetUrl: string,
  includedStatuses: string[] = ["changed", "missing", "hyperlinks"],
) {
  const pdf = new jsPDF();
  const margin = 15;
  let y = margin;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  pdf.setFontSize(18);
  pdf.text("QA Content Verification Report", margin, y);
  y += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Source: ${sourceFile}`, margin, y);
  y += 5;
  pdf.text(`Target: ${targetUrl}`, margin, y);
  y += 5;
  pdf.text(`Date: ${new Date().toLocaleString()}`, margin, y);
  y += 10;

  // Summary
  pdf.setFontSize(12);
  pdf.setTextColor(0);
  pdf.text(`Summary: ${result.summary.changes} changes, ${result.summary.missing} missing, ${result.summary.hyperlinks} link issues`, margin, y);
  y += 12;

  pdf.setFontSize(9);

  for (const section of result.sections) {
    if (!includedStatuses.includes(section.status)) continue;

    if (y > 270) {
      pdf.addPage();
      y = margin;
    }

    pdf.setTextColor(0);
    pdf.setFontSize(10);
    pdf.text(`[${section.status.toUpperCase()}] ${section.sectionLabel}`, margin, y);
    y += 6;

    pdf.setFontSize(8);
    pdf.setTextColor(180, 0, 0);
    const srcLines = pdf.splitTextToSize(`Source: ${section.sourceText || "-"}`, maxWidth);
    pdf.text(srcLines, margin, y);
    y += srcLines.length * 4;
    if (section.status === "hyperlinks" && section.sourceHref) {
      pdf.setTextColor(120, 0, 0);
      const hrefLines = pdf.splitTextToSize(`Source href: ${section.sourceHref}`, maxWidth);
      pdf.text(hrefLines, margin, y);
      y += hrefLines.length * 4;
    }
    pdf.setTextColor(0, 128, 0);
    const tgtLines = pdf.splitTextToSize(`Target: ${section.targetText || "-"}`, maxWidth);
    pdf.text(tgtLines, margin, y);
    y += tgtLines.length * 4;
    if (section.status === "hyperlinks" && section.targetHref) {
      pdf.setTextColor(0, 90, 0);
      const hrefLines = pdf.splitTextToSize(`Target href: ${section.targetHref}`, maxWidth);
      pdf.text(hrefLines, margin, y);
      y += hrefLines.length * 4;
    }
    y += 4;
  }

  pdf.save(`qa-report-${Date.now()}.pdf`);
}

export function exportToCsv(
  result: ComparisonResult,
  sourceFile: string,
  targetUrl: string,
  includedStatuses: string[] = ["changed", "missing", "hyperlinks"],
) {
  const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;

  const rows: string[][] = [
    ["Status", "Section", "Source Text", "Source Href", "Target Text", "Target Href"],
  ];

  for (const section of result.sections) {
    if (!includedStatuses.includes(section.status)) continue;
    rows.push([
      section.status,
      section.sectionLabel ?? "",
      section.sourceText ?? "",
      section.sourceHref ?? "",
      section.targetText ?? "",
      section.targetHref ?? "",
    ]);
  }

  const csv = [
    `# QA Content Verification Report`,
    `# Source: ${sourceFile}`,
    `# Target: ${targetUrl}`,
    `# Date: ${new Date().toLocaleString()}`,
    `# Summary: ${result.summary.changes} changes, ${result.summary.missing} missing, ${result.summary.hyperlinks} link issues`,
    "",
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qa-report-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
