import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  quoteFindUnique: vi.fn(),
  quoteUpdate: vi.fn(),
  logActivity: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    quote: {
      findUnique: mocks.quoteFindUnique,
      update: mocks.quoteUpdate,
    },
  },
}));
vi.mock("@/lib/activity", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
  rateLimit: () => true,
  rateLimitResponse: () => new Response("Rate limited", { status: 429 }),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import QuotePage from "../src/app/(public)/quote/[token]/page";
import { POST as approveQuote } from "../src/app/api/admin/quotes/[id]/approve/route";
import { GET as getQuotePdf } from "../src/app/api/quotes/[token]/pdf/route";

const aiQuote = {
  id: "quote-1",
  token: "secret-token",
  generatedByAI: true,
  approvedAt: null as Date | null,
  packageId: "package-1",
  enquiryId: "enquiry-1",
  travellers: 2,
  travelDate: "December",
  pricePerPerson: 32500,
  basis: "Per person, twin sharing",
  gstInclusive: true,
  gstRate: 18,
  totalPrice: 65000,
  inclusions: ["Accommodation"],
  exclusions: [],
  notes: "Indicative quote",
  validUntil: new Date("2027-01-01T00:00:00.000Z"),
  authorId: "admin-1",
  author: { name: "Admin" },
  package: {
    currentVersion: { title: "Kerala Tour", destination: "Kerala", days: 6 },
  },
  enquiry: { assignedToId: "consultant-1" },
};

function pdfRequest() {
  return new Request("http://localhost/api/quotes/secret-token/pdf");
}

describe("AI-generated quote approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.quoteFindUnique.mockResolvedValue(aiQuote);
    mocks.quoteUpdate.mockResolvedValue({ ...aiQuote, approvedAt: new Date() });
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("blocks an unapproved quote page and its PDF", async () => {
    mocks.quoteFindUnique.mockResolvedValue(aiQuote);

    await expect(QuotePage({ params: Promise.resolve({ token: aiQuote.token }) }))
      .rejects.toThrow("NOT_FOUND");
    const pdfResponse = await getQuotePdf(pdfRequest(), {
      params: Promise.resolve({ token: aiQuote.token }),
    });

    expect(pdfResponse.status).toBe(404);
  });

  it("requires staff approval and records the approving staff member", async () => {
    const response = await approveQuote(new Request("http://localhost/api/admin/quotes/quote-1", {
      method: "POST",
    }), { params: Promise.resolve({ id: aiQuote.id }) });

    expect(response.status).toBe(200);
    expect(mocks.quoteUpdate).toHaveBeenCalledWith({
      where: { id: aiQuote.id },
      data: { approvedAt: expect.any(Date) },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      "admin-1",
      "approved",
      "quote",
      aiQuote.id,
      "AI-generated quote approved for sharing",
    );
  });

  it("rejects approval of an unassigned consultant's quote", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "consultant-2", role: "CONSULTANT" } });

    const response = await approveQuote(new Request("http://localhost/api/admin/quotes/quote-1", {
      method: "POST",
    }), { params: Promise.resolve({ id: aiQuote.id }) });

    expect(response.status).toBe(403);
    expect(mocks.quoteUpdate).not.toHaveBeenCalled();
  });

  it("restores public link and branded PDF access after approval", async () => {
    const approvedQuote = { ...aiQuote, approvedAt: new Date() };
    mocks.quoteFindUnique.mockResolvedValue(approvedQuote);

    const page = await QuotePage({ params: Promise.resolve({ token: aiQuote.token }) });
    const pdfResponse = await getQuotePdf(pdfRequest(), {
      params: Promise.resolve({ token: aiQuote.token }),
    });

    expect(page).toBeTruthy();
    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get("content-type")).toBe("application/pdf");
  });

  it("preserves immediate access for staff-created quotes", async () => {
    mocks.quoteFindUnique.mockResolvedValue({ ...aiQuote, generatedByAI: false });

    const page = await QuotePage({ params: Promise.resolve({ token: aiQuote.token }) });
    const pdfResponse = await getQuotePdf(pdfRequest(), {
      params: Promise.resolve({ token: aiQuote.token }),
    });

    expect(page).toBeTruthy();
    expect(pdfResponse.status).toBe(200);
  });
});
