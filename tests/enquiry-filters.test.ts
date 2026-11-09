import { describe, expect, it } from "vitest";
import { parseEnquiryDateRange } from "../src/lib/enquiry-filters";

describe("enquiry date filters", () => {
  it("uses an inclusive UTC date range", () => {
    const range = parseEnquiryDateRange("2026-11-01", "2026-11-09");

    expect(range.error).toBeUndefined();
    expect(range.from?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(range.through?.toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });

  it("supports either date bound independently", () => {
    expect(parseEnquiryDateRange("2026-11-01")).toEqual({
      from: new Date("2026-11-01T00:00:00.000Z"),
    });
    expect(parseEnquiryDateRange(undefined, "2026-11-09")).toEqual({
      through: new Date("2026-11-10T00:00:00.000Z"),
    });
  });

  it("rejects malformed, impossible, and reversed dates", () => {
    expect(parseEnquiryDateRange("2026-02-30").error).toBe("Enter a valid start date.");
    expect(parseEnquiryDateRange(undefined, "yesterday").error).toBe("Enter a valid end date.");
    expect(parseEnquiryDateRange("2026-11-10", "2026-11-09").error)
      .toBe("The start date must be on or before the end date.");
  });
});
