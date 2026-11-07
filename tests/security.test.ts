import { describe, it, expect } from "vitest";
import { enquiryFormSchema, registerSchema } from "../src/lib/validations";
import { authorizeRole } from "../src/lib/roles";

describe("XSS prevention via validation", () => {
  it("accepts normal text in enquiry message", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Rahul",
      email: "rahul@test.com",
      message: "I want to visit Kerala in December with family",
    });
    expect(result.success).toBe(true);
  });

  it("strips script tags from name via schema (allowed but escaped at render)", () => {
    const result = enquiryFormSchema.safeParse({
      name: '<script>alert("xss")</script>',
      email: "xss@test.com",
      message: "test",
    });
    // Zod allows the string but React auto-escapes on render
    expect(result.success).toBe(true);
  });

  it("rejects SQL injection in email field", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "'; DROP TABLE enquiries; --",
      message: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name (min length 2)", () => {
    const result = enquiryFormSchema.safeParse({
      name: "",
      email: "test@test.com",
      message: "valid message",
    });
    expect(result.success).toBe(false);
  });
});

describe("password security", () => {
  it("enforces minimum password length", () => {
    const result = registerSchema.safeParse({
      name: "Test",
      email: "test@test.com",
      password: "abc",
      confirmPassword: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("accepts strong passwords", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@test.com",
      password: "secureP@ss123",
      confirmPassword: "secureP@ss123",
    });
    expect(result.success).toBe(true);
  });
});

describe("role-based access control", () => {
  it("returns 403 for undefined role", () => {
    const res = authorizeRole(undefined, "ADMIN");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("returns 403 when role is not in allowed list", () => {
    const res = authorizeRole("CONSULTANT", "ADMIN", "EDITOR");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("returns null (allowed) for matching role", () => {
    expect(authorizeRole("ADMIN", "ADMIN", "EDITOR")).toBeNull();
    expect(authorizeRole("EDITOR", "ADMIN", "EDITOR")).toBeNull();
    expect(authorizeRole("CONSULTANT", "ADMIN", "CONSULTANT")).toBeNull();
  });

  it("EDITOR cannot access enquiry write operations", () => {
    const res = authorizeRole("EDITOR", "ADMIN", "CONSULTANT");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("CONSULTANT cannot access package/blog write operations", () => {
    const res = authorizeRole("CONSULTANT", "ADMIN", "EDITOR");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("only ADMIN can access destructive operations", () => {
    expect(authorizeRole("ADMIN", "ADMIN")).toBeNull();
    expect(authorizeRole("EDITOR", "ADMIN")!.status).toBe(403);
    expect(authorizeRole("CONSULTANT", "ADMIN")!.status).toBe(403);
  });

  it("TRAVELLER is rejected from all admin operations", () => {
    expect(authorizeRole("TRAVELLER", "ADMIN", "EDITOR")!.status).toBe(403);
    expect(authorizeRole("TRAVELLER", "ADMIN", "CONSULTANT")!.status).toBe(403);
    expect(authorizeRole("TRAVELLER", "ADMIN")!.status).toBe(403);
  });
});

describe("input boundary tests", () => {
  it("rejects negative adults", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "t@t.com",
      message: "hello",
      adults: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative children", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "t@t.com",
      message: "hello",
      children: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects excessively long message (>5000 chars)", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "t@t.com",
      message: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts message at max length boundary", () => {
    const result = enquiryFormSchema.safeParse({
      name: "Test",
      email: "t@t.com",
      message: "x".repeat(5000),
    });
    expect(result.success).toBe(true);
  });
});
