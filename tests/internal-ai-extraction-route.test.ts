import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  enquiryFindUnique: vi.fn(),
  enquiryUpdate: vi.fn(),
  packageFindMany: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    enquiry: { findUnique: mocks.enquiryFindUnique, update: mocks.enquiryUpdate },
    package: { findMany: mocks.packageFindMany },
    user: { findFirst: mocks.userFindFirst },
  },
}));

import { POST } from "../src/app/api/internal/ai/route";

describe("internal AI extraction provider fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INTERNAL_API_SECRET", "test-internal-secret");
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");

    mocks.enquiryFindUnique.mockResolvedValue({
      id: "enquiry-1",
      name: "Synthetic traveller",
      message: "2 adults and 1 child; Kerala, 10-15 December 2027; houseboat.",
      travelDates: "2027-12-10 to 2027-12-15",
      adults: 2,
      children: 1,
      budget: "INR 120000",
      packageId: null,
      assignedToId: null,
      package: null,
    });
    mocks.packageFindMany.mockResolvedValue([{
      id: "package-1",
      slug: "kerala-houseboat",
      currentVersion: {
        title: "Kerala Houseboat",
        destination: "Kerala",
        days: 6,
        inclusions: [],
        exclusions: [],
        itinerary: [],
      },
      seasonalPrices: [{
        pricePerPerson: 32500,
        seasonName: "Peak",
        basis: "Per person, twin sharing",
        gstInclusive: true,
        seasonStartMonth: 10,
        seasonEndMonth: 3,
      }],
    }]);
    mocks.enquiryUpdate.mockResolvedValue({});
    mocks.userFindFirst.mockResolvedValue(null);
  });

  it("uses Gemini when Groq returns malformed extraction JSON", async () => {
    const geminiExtraction = {
      dates: {
        start: "2027-12-10",
        end: "2027-12-15",
        flexible: false,
        raw: "10-15 December 2027",
      },
      additionalDays: null,
      adults: 2,
      children: 1,
      destination: "Kerala",
      budget: { total: 120000, perPerson: null, currency: "INR" },
      requirements: ["houseboat"],
      confidence: 0.9,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: "not valid JSON" } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(geminiExtraction) }] } }],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/internal/ai", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": "test-internal-secret",
      },
      body: JSON.stringify({ enquiryId: "enquiry-1" }),
    });

    const response = await POST(request);
    const persistedData = mocks.enquiryUpdate.mock.calls.at(-1)?.[0].data;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("generativelanguage.googleapis.com");
    expect(persistedData.aiExtracted).toMatchObject({ destination: "Kerala" });
    expect(persistedData.aiSuggestions).toEqual([
      expect.objectContaining({ packageSlug: "kerala-houseboat" }),
    ]);
  });
});
