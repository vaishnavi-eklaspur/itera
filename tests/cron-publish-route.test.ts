import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  packageFindMany: vi.fn(),
  packageUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    package: {
      findMany: mocks.packageFindMany,
      update: mocks.packageUpdate,
    },
  },
}));

import { GET } from "../src/app/api/cron/publish/route";

function request(authorization?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/publish", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("scheduled publishing cron authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mocks.packageFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(request("Bearer test-cron-secret"));

    expect(response.status).toBe(401);
    expect(mocks.packageFindMany).not.toHaveBeenCalled();
    expect(mocks.packageUpdate).not.toHaveBeenCalled();
  });

  it("rejects a missing or incorrect authorization header", async () => {
    const missingHeaderResponse = await GET(request());
    const incorrectHeaderResponse = await GET(request("Bearer wrong-secret"));

    expect(missingHeaderResponse.status).toBe(401);
    expect(incorrectHeaderResponse.status).toBe(401);
    expect(mocks.packageFindMany).not.toHaveBeenCalled();
  });

  it("allows the configured bearer secret to run publishing", async () => {
    const response = await GET(request("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    expect(mocks.packageFindMany).toHaveBeenCalledOnce();
    expect(mocks.packageUpdate).not.toHaveBeenCalled();
  });
});
