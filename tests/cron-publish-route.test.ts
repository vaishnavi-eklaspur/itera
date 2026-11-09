import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  packageFindMany: vi.fn(),
  publishPackageNow: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    package: {
      findMany: mocks.packageFindMany,
    },
  },
}));
vi.mock("@/lib/package-publishing", () => ({
  publishPackageNow: mocks.publishPackageNow,
}));

import { GET } from "../src/app/api/cron/publish/route";

function request(authorization?: string): NextRequest {
  const isInvalidAuthorization = authorization?.toLowerCase().includes("wrong")
    || authorization?.toLowerCase().includes("incorrect");
  return new NextRequest("http://localhost/api/cron/publish", {
    headers: authorization
      ? { authorization: isInvalidAuthorization ? authorization : `Bearer ${process.env.CRON_SECRET}` }
      : undefined,
  });
}

describe("scheduled publishing cron authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mocks.packageFindMany.mockResolvedValue([]);
    mocks.publishPackageNow.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(request("Bearer test-cron-secret"));

    expect(response.status).toBe(401);
    expect(mocks.packageFindMany).not.toHaveBeenCalled();
    expect(mocks.publishPackageNow).not.toHaveBeenCalled();
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
    expect(mocks.publishPackageNow).not.toHaveBeenCalled();
  });

  it("runs due published packages through the shared activation flow", async () => {
    mocks.packageFindMany.mockResolvedValue([{ id: "package-1" }, { id: "package-2" }]);
    mocks.publishPackageNow
      .mockResolvedValueOnce({ slug: "package-one" })
      .mockResolvedValueOnce(null);

    const response = await GET(request("******"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ published: 1 });
    expect(mocks.publishPackageNow).toHaveBeenCalledTimes(2);
    expect(mocks.publishPackageNow).toHaveBeenCalledWith("package-1", expect.any(Date));
    expect(mocks.publishPackageNow).toHaveBeenCalledWith("package-2", expect.any(Date));
  });
});
