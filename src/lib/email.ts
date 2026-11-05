type EnquiryData = {
  name: string;
  email: string;
  travelDates?: string | null;
  adults?: number | null;
  children?: number | null;
  message: string;
};

type PackageData = {
  title: string;
  destination: string;
  days: number;
} | null;

export async function sendAutoAckEmail(
  enquiry: EnquiryData,
  pkg: PackageData
) {
  const subject = pkg
    ? `We received your enquiry for "${pkg.title}"`
    : "We received your travel enquiry";

  const paxLine =
    enquiry.adults || enquiry.children
      ? `<p><strong>Travellers:</strong> ${enquiry.adults ?? 0} adult(s)${enquiry.children ? `, ${enquiry.children} child(ren)` : ""}</p>`
      : "";

  const datesLine = enquiry.travelDates
    ? `<p><strong>Preferred dates:</strong> ${enquiry.travelDates}</p>`
    : "";

  const packageLine = pkg
    ? `<p><strong>Package:</strong> ${pkg.title} — ${pkg.days} days in ${pkg.destination}</p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#334155">
  <div style="border-bottom:3px solid #0d9488;padding-bottom:12px;margin-bottom:24px">
    <h1 style="font-size:20px;color:#0d9488;margin:0">Itera</h1>
    <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">Kerala &amp; South India Travel</p>
  </div>
  <p>Hi ${enquiry.name},</p>
  <p>Thank you for reaching out! We've received your enquiry and our travel team will review it and get back to you <strong>within 1 hour</strong>.</p>
  ${packageLine}${datesLine}${paxLine}
  <p><strong>Your message:</strong></p>
  <blockquote style="border-left:3px solid #e2e8f0;padding-left:12px;color:#64748b;margin:8px 0">${enquiry.message}</blockquote>
  <p>If you have any urgent questions, reply to this email or reach us on WhatsApp.</p>
  <p style="margin-top:24px">Warm regards,<br><strong>Team Itera</strong></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <p style="font-size:11px;color:#94a3b8">This is an automated acknowledgement. Please do not reply to this email directly.</p>
</body>
</html>`.trim();

  console.log(
    `\n[EMAIL DISPATCH] To: ${enquiry.email} | Subject: ${subject}\n` +
      `[EMAIL DISPATCH] Body:\n${html}\n`
  );
}
