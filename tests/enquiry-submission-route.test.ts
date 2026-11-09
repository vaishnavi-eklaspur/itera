import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enquiryCreate: vi.fn(),
  enquiryUpdate: vi.fn(),
  packageFindUnique: vi.fn(),
  sendAutoAckEmail: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    enquiry: { create: mocks.enquiryCreate, update: mocks.enquiryUpdate },
    package: { findUnique: mocks.packageFindUnique },
  },
}));
vi.mock("@/lib/email", () => ({ sendAutoAckEmail: mocks.sendAutoAckEmail }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: () => new Response("Rate limited", { status: 429 }),
}));

import { POST } from "../src/app/api/enquiries/route";

function request(body: string) {
  return new NextRequest("http://localhost/api/enquiries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("public enquiry submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INTERNAL_API_SECRET", "test-internal-secret");
    mocks.rateLimit.mockReturnValue(true);
    mocks.auth.mockResolvedValue(null);
    mocks.enquiryCreate.mockResolvedValue({
      id: "enquiry-1",
      packageId: null,
    });
    mocks.enquiryUpdate.mockResolvedValue({});
    mocks.sendAutoAckEmail.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
  });

  it("returns 400 for malformed JSON instead of an unhandled parse error", async () => {
    const response = await POST(request("{name: 'Synthetic traveller'}"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Request body must be valid JSON" });
    expect(mocks.enquiryCreate).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves valid submission and automatic AI extraction", async () => {
    const response = await POST(request(JSON.stringify({
      name: "Synthetic traveller",
      email: "synthetic@example.invalid",
      message: "Synthetic verification enquiry",
      privacyConsent: true,
    })));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, enquiryId: "enquiry-1" });
    expect(mocks.enquiryCreate).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost/api/internal/ai",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-internal-secret": "test-internal-secret" }),
      }),
    );
  });
});
