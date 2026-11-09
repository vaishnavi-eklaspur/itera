import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const db = {
    dataRightsRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    enquiry: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    enquiryReply: { updateMany: vi.fn() },
    enquiryNote: { updateMany: vi.fn() },
    quote: { findMany: vi.fn(), updateMany: vi.fn() },
    activityLog: { updateMany: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  };
  return { auth: vi.fn(), db };
});

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { PATCH } from "../src/app/api/admin/data-rights/route";

const correctionRequest = {
  id: "request-1",
  type: "CORRECTION",
  status: "PENDING",
  email: "traveller@example.com",
  userId: "user-1",
  enquiryId: "enquiry-1",
};

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/data-rights", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("data-rights admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.db));
    mocks.db.dataRightsRequest.findUnique.mockResolvedValue(correctionRequest);
    mocks.db.dataRightsRequest.update.mockResolvedValue({ id: "request-1", status: "COMPLETED" });
    mocks.db.enquiry.findUnique.mockResolvedValue({ id: "enquiry-1" });
    mocks.db.enquiry.findMany.mockResolvedValue([]);
    mocks.db.quote.findMany.mockResolvedValue([]);
  });

  it("rejects completion of a correction request without validated correction data", async () => {
    const response = await PATCH(patchRequest({ id: "request-1", status: "COMPLETED" }));

    expect(response.status).toBe(400);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects correction values with the wrong field types", async () => {
    const response = await PATCH(patchRequest({
      id: "request-1",
      status: "COMPLETED",
      correctionData: { email: 123 },
    }));

    expect(response.status).toBe(400);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("applies corrections and resolves the request in one transaction", async () => {
    const response = await PATCH(patchRequest({
      id: "request-1",
      status: "COMPLETED",
      correctionData: { name: "Updated Traveller", adults: 2, children: null },
    }));

    expect(response.status).toBe(200);
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
    expect(mocks.db.enquiry.update).toHaveBeenCalledWith({
      where: { id: "enquiry-1" },
      data: { name: "Updated Traveller", adults: 2, children: null },
    });
    expect(mocks.db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Updated Traveller" },
    });
    expect(mocks.db.dataRightsRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "request-1" },
        data: expect.objectContaining({ status: "COMPLETED", resolvedById: "admin-1" }),
      }),
    );
  });

  it("leaves a correction request unresolved when its enquiry no longer exists", async () => {
    mocks.db.enquiry.findUnique.mockResolvedValue(null);

    const response = await PATCH(patchRequest({
      id: "request-1",
      status: "COMPLETED",
      correctionData: { name: "Updated Traveller" },
    }));

    expect(response.status).toBe(404);
    expect(mocks.db.dataRightsRequest.update).not.toHaveBeenCalled();
  });

  it("redacts linked enquiry, quote, and activity-log data when deletion completes", async () => {
    mocks.db.dataRightsRequest.findUnique.mockResolvedValue({
      id: "request-2",
      type: "DELETION",
      status: "PENDING",
      email: "traveller@example.com",
      userId: "user-1",
    });
    mocks.db.enquiry.findMany.mockResolvedValue([{ id: "enquiry-2", userId: "user-1" }]);
    mocks.db.quote.findMany.mockResolvedValue([{ id: "quote-2" }]);

    const response = await PATCH(patchRequest({ id: "request-2", status: "COMPLETED" }));

    expect(response.status).toBe(200);
    expect(mocks.db.enquiry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["enquiry-2"] } },
      data: expect.objectContaining({ name: "Deleted traveller", phone: null }),
    }));
    expect(mocks.db.activityLog.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: "user-1" },
          { entityId: { in: ["enquiry-2", "quote-2", "user-1"] } },
        ],
      },
      data: { details: "[Activity details deleted at traveller request]" },
    });
    expect(mocks.db.dataRightsRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "request-2" },
      data: expect.objectContaining({
        status: "COMPLETED",
        email: "deleted-request-2@privacy.invalid",
        details: "[Data-rights request details deleted at traveller request]",
      }),
    }));
  });

  it("blocks non-admin users before reading or changing a request", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "consultant-1", role: "CONSULTANT" } });

    const response = await PATCH(patchRequest({ id: "request-1", status: "IN_REVIEW" }));

    expect(response.status).toBe(403);
    expect(mocks.db.dataRightsRequest.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});
