import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { calculateGst } from "@/lib/gst";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function pdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrapText(text: string, maxLength: number) {
  const words = pdfText(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!rateLimit(`quote-pdf:${getClientIp(request)}`, 60_000, 20)) return rateLimitResponse();
  const { token } = await params;
  const quote = await db.quote.findUnique({
    where: { token },
    include: {
      package: { include: { currentVersion: { select: { title: true, destination: true, days: true } } } },
      author: { select: { name: true } },
    },
  });
  if (!quote || (quote.generatedByAI && !quote.approvedAt)) {
    return new Response("Quote not found", { status: 404 });
  }
  const gst = calculateGst(quote.pricePerPerson, quote.travellers, quote.gstRate, quote.gstInclusive);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const forest = rgb(0.08, 0.28, 0.22);
  const dark = rgb(0.12, 0.12, 0.1);
  const muted = rgb(0.38, 0.36, 0.32);
  let y = 790;

  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: forest });
  page.drawText("Itera", { x: 42, y: 792, size: 25, font: bold, color: rgb(1, 1, 1) });
  page.drawText("TRAVEL QUOTE", { x: 430, y: 795, size: 9, font: bold, color: rgb(0.84, 0.92, 0.88) });
  page.drawText(pdfText(quote.package.currentVersion?.title ?? "Travel package"), { x: 42, y: 760, size: 17, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`${pdfText(quote.package.currentVersion?.destination ?? "")} | ${quote.package.currentVersion?.days ?? ""} days`, { x: 42, y: 746, size: 10, font: regular, color: rgb(0.84, 0.92, 0.88) });
  y = 710;

  const drawLabelValue = (label: string, value: string, x: number, valueY: number) => {
    page.drawText(pdfText(label), { x, y: valueY, size: 8, font: regular, color: muted });
    page.drawText(pdfText(value), { x, y: valueY - 16, size: 12, font: bold, color: dark });
  };
  drawLabelValue("TRAVELLERS", String(quote.travellers), 42, y);
  drawLabelValue("TRAVEL DATE", quote.travelDate || "Flexible", 210, y);
  drawLabelValue("VALID UNTIL", new Date(quote.validUntil).toLocaleDateString("en-IN"), 420, y);
  y -= 70;

  page.drawRectangle({ x: 42, y: y - 78, width: 511, height: 94, color: rgb(0.94, 0.97, 0.95), borderColor: rgb(0.78, 0.87, 0.82), borderWidth: 1 });
  page.drawText("PRICE", { x: 60, y: y - 8, size: 8, font: regular, color: muted });
  page.drawText(`INR ${quote.pricePerPerson.toLocaleString("en-IN")} / person`, { x: 60, y: y - 31, size: 16, font: bold, color: forest });
  page.drawText(`${pdfText(quote.basis)} | GST ${quote.gstRate}% ${quote.gstInclusive ? "inclusive" : "extra"}`, { x: 60, y: y - 52, size: 9, font: regular, color: muted });
  page.drawText(`Subtotal INR ${gst.subtotal.toLocaleString("en-IN")} | GST INR ${gst.gstAmount.toLocaleString("en-IN")}`, { x: 60, y: y - 66, size: 8, font: regular, color: muted });
  page.drawText("TOTAL", { x: 380, y: y - 8, size: 8, font: regular, color: muted });
  page.drawText(`INR ${gst.total.toLocaleString("en-IN")}`, { x: 380, y: y - 35, size: 20, font: bold, color: forest });
  y -= 125;

  const drawList = (heading: string, items: string[]) => {
    if (items.length === 0) return;
    page.drawText(heading, { x: 42, y, size: 12, font: bold, color: dark });
    y -= 20;
    for (const item of items) {
      for (const line of wrapText(`- ${item}`, 88)) {
        page.drawText(line, { x: 50, y, size: 9.5, font: regular, color: muted });
        y -= 14;
      }
    }
    y -= 12;
  };
  drawList("Inclusions", quote.inclusions);
  drawList("Exclusions", quote.exclusions);
  if (quote.notes) {
    page.drawText("Notes", { x: 42, y, size: 12, font: bold, color: dark });
    y -= 20;
    for (const line of wrapText(quote.notes, 88)) {
      page.drawText(line, { x: 50, y, size: 9.5, font: regular, color: muted });
      y -= 14;
    }
  }

  page.drawLine({ start: { x: 42, y: 55 }, end: { x: 553, y: 55 }, thickness: 1, color: rgb(0.86, 0.85, 0.81) });
  page.drawText(`Prepared by ${pdfText(quote.author.name)} | Itera Travel`, { x: 42, y: 38, size: 8, font: regular, color: muted });
  page.drawText("Availability must be confirmed before booking.", { x: 337, y: 38, size: 8, font: regular, color: muted });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="itera-quote-${token}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
