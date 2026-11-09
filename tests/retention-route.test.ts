import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const tx = {
    enquiry: { findMany: vi.fn(), updateMany: vi.fn() },
    enquiryNote: { updateMany: vi.fn() },
    enquiryReply: { updateMany: vi.fn() },
    quote: { updateMany: vi.fn() },
    activityLog: { updateMany: vi.fn() },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "../src/app/api/cron/retention/route";

function request(authorization = "Bearer test-cron-secret") {
  return new NextRequest("http://localhost/api/cron/retention", {
    headers: { authorization },
  });
}

describe("enquiry retention route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("ENQUIRY_RETENTION_DAYS", "730");
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
    mocks.tx.enquiry.findMany.mockResolvedValue([{ id: "enquiry-1" }]);
  });

  it("anonymizes eligible enquiries and related notes, replies, and quotes", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ anonymized: 1, retentionDays: 730 });
    expect(mocks.tx.enquiry.findMany).toHaveBeenCalledWith({
      where: {
        status: "CLOSED",
        updatedAt: { lt: expect.any(Date) },
        email: { not: { endsWith: "@privacy.invalid" } },
      },
      select: { id: true },
    });
    const enquiryUpdate = mocks.tx.enquiry.updateMany.mock.calls[0][0];
    expect(enquiryUpdate.where).toEqual({ id: { in: ["enquiry-1"] } });
    expect(enquiryUpdate.data).toMatchObject({
      userId: null,
      name: "Retained traveller",
      email: "retained@privacy.invalid",
      phone: null,
      message: "[Personal data retained only as an anonymized operational record]",
      travelDates: null,
      adults: null,
      children: null,
      budget: null,
      aiDraftReply: null,
    });
    expect(mocks.tx.enquiryNote.updateMany).toHaveBeenCalledWith({
      where: { enquiryId: { in: ["enquiry-1"] } },
      data: { content: "[Note content anonymized after enquiry retention period]" },
    });
    expect(mocks.tx.enquiryReply.updateMany).toHaveBeenCalledWith({
      where: { enquiryId: { in: ["enquiry-1"] } },
      data: { content: "[Reply content anonymized after enquiry retention period]" },
    });
    expect(mocks.tx.quote.updateMany).toHaveBeenCalledWith({
      where: { enquiryId: { in: ["enquiry-1"] } },
      data: {
        travellers: 0,
        travelDate: null,
        notes: "[Quote personal data anonymized after enquiry retention period]",
      },
    });
    expect(Object.keys(mocks.tx.quote.updateMany.mock.calls[0][0].data).sort()).toEqual([
      "notes",
      "travelDate",
      "travellers",
    ]);
    expect(mocks.tx.activityLog.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
  });

  it("does not change operational records when no enquiry meets the existing threshold", async () => {
    mocks.tx.enquiry.findMany.mockResolvedValue([]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ anonymized: 0, retentionDays: 730 });
    expect(mocks.tx.enquiry.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.enquiryNote.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.enquiryReply.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("is safe to rerun without reprocessing already anonymized enquiries", async () => {
    mocks.tx.enquiry.findMany
      .mockResolvedValueOnce([{ id: "enquiry-1" }])
      .mockResolvedValueOnce([]);

    const firstResponse = await GET(request());
    const secondResponse = await GET(request());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(mocks.tx.enquiry.updateMany).toHaveBeenCalledOnce();
    expect(mocks.tx.enquiryNote.updateMany).toHaveBeenCalledOnce();
    expect(mocks.tx.enquiryReply.updateMany).toHaveBeenCalledOnce();
    expect(mocks.tx.quote.updateMany).toHaveBeenCalledOnce();
  });

  it("does not process records without the configured cron authorization", async () => {
    const response = await GET(request("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});
