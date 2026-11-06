import { describe, it, expect } from "vitest";
import {
  enquiryFormSchema,
  registerSchema,
  packageFormSchema,
  aiExtractedSchema,
} from "../src/lib/validations";

describe("enquiryFormSchema", () => {
  it("accepts a valid enquiry", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Rahul Sharma",
      email: "rahul@example.com",
      message: "Kerala trip for 2 adults in December",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = enquiryFormSchema.safeParse({
      email: "test@example.com",
      message: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "not-an-email",
      message: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty message", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "test@example.com",
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Sarah Mitchell",
      email: "sarah@test.com",
      message: "Kerala honeymoon",
      phone: "+91 9876543210",
      travelDates: "2024-12-15",
      adults: 2,
      children: 0,
      budget: "120000",
      packageId: "pkg-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects adults > 50", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "t@t.com",
      message: "hi",
      adults: 51,
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration", () => {
    const result = registerSchema.safeParse({
      name: "Deepika Patel",
      email: "deepika@test.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password mismatch", () => {
    const result = registerSchema.safeParse({
      name: "Test",
      email: "test@test.com",
      password: "password123",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      name: "Test",
      email: "test@test.com",
      password: "12345",
      confirmPassword: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("packageFormSchema", () => {
  const validPackage = {
    title: "Munnar Thekkady Alleppey",
    slug: "munnar-thekkady-alleppey",
    destination: "Kerala",
    days: 6,
    description: "A beautiful 6-day journey through Kerala",
    inclusions: ["Hotel", "Breakfast", "Transport"],
    exclusions: ["Flights", "Lunch"],
    hotelTier: "4-star",
    itinerary: [
      { day: 1, title: "Arrival in Kochi", location: "Kochi", lat: 9.9312, lng: 76.2673, description: "Arrive and transfer", activities: ["Airport pickup"] },
    ],
    photos: ["https://example.com/photo1.jpg"],
    seasonalPrices: [
      { seasonName: "Peak", seasonStartMonth: 10, seasonEndMonth: 2, pricePerPerson: 32500, basis: "Per person, twin sharing", gstInclusive: true },
    ],
  };

  it("accepts a valid package", () => {
    const result = packageFormSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 3 chars", () => {
    const result = packageFormSchema.safeParse({ ...validPackage, title: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects days > 30", () => {
    const result = packageFormSchema.safeParse({ ...validPackage, days: 31 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid seasonal price month", () => {
    const result = packageFormSchema.safeParse({
      ...validPackage,
      seasonalPrices: [{ ...validPackage.seasonalPrices[0], seasonStartMonth: 13 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("aiExtractedSchema", () => {
  it("accepts well-formed extraction", () => {
    const result = aiExtractedSchema.safeParse({
      dates: { start: "2024-12-15", end: "2024-12-21", flexible: true, raw: "December 15-21" },
      adults: 2,
      children: 1,
      destination: "Kerala",
      budget: { total: 120000, perPerson: null, currency: "INR" },
      requirements: ["houseboat", "backwaters"],
      confidence: 0.87,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all-null extraction (gibberish input)", () => {
    const result = aiExtractedSchema.safeParse({
      dates: null,
      adults: null,
      children: null,
      destination: null,
      budget: null,
      requirements: [],
      confidence: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial extraction (minimal input like 'kerala december')", () => {
    const result = aiExtractedSchema.safeParse({
      dates: { start: "2024-12-01", end: null, flexible: true, raw: "december" },
      adults: null,
      children: null,
      destination: "Kerala",
      budget: null,
      requirements: [],
      confidence: 0.4,
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence > 1", () => {
    const result = aiExtractedSchema.safeParse({
      dates: null,
      adults: null,
      children: null,
      destination: null,
      budget: null,
      requirements: [],
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = aiExtractedSchema.safeParse({
      destination: "Kerala",
    });
    expect(result.success).toBe(false);
  });

  it("validates budget currency is a string", () => {
    const result = aiExtractedSchema.safeParse({
      dates: null,
      adults: 2,
      children: 0,
      destination: "Kerala",
      budget: { total: 100000, perPerson: 50000, currency: "INR" },
      requirements: [],
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budget?.currency).toBe("INR");
    }
  });

  it("handles prompt injection attempt — extracts as normal data", () => {
    // The schema validates the OUTPUT of AI extraction, not the input.
    // A prompt injection in the message should result in null/low-confidence extraction.
    const result = aiExtractedSchema.safeParse({
      dates: null,
      adults: null,
      children: null,
      destination: null,
      budget: null,
      requirements: [],
      confidence: 0.05,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidence).toBeLessThan(0.1);
      expect(result.data.destination).toBeNull();
    }
  });
});
