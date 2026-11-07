import { z } from "zod";

export const enquiryFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name is too long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  travelDates: z.string().optional(),
  adults: z.coerce.number().min(1).max(50).optional(),
  children: z.coerce.number().min(0).max(20).optional(),
  budget: z.string().optional(),
  message: z.string().min(1, "Please enter your message").max(5000, "Message is too long"),
  packageId: z.string().optional(),
});

export type EnquiryFormData = z.infer<typeof enquiryFormSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const itineraryDaySchema = z.object({
  day: z.number(),
  title: z.string().min(1),
  location: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  description: z.string().min(1),
  activities: z.array(z.string()),
});

export const seasonalPriceSchema = z.object({
  id: z.string().optional(),
  seasonName: z.string().min(1),
  seasonStartMonth: z.number().min(1).max(12),
  seasonEndMonth: z.number().min(1).max(12),
  pricePerPerson: z.number().min(0),
  basis: z.string().default("Per person, twin sharing"),
  gstInclusive: z.boolean().default(true),
});

export const packageFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(3),
  destination: z.string().min(2),
  days: z.coerce.number().min(1).max(30),
  description: z.string().min(10),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  hotelTier: z.string().min(1),
  itinerary: z.array(itineraryDaySchema),
  photos: z.array(z.string()),
  mapCenter: z.object({ lat: z.number(), lng: z.number(), zoom: z.number() }).optional(),
  seasonalPrices: z.array(seasonalPriceSchema),
});

export type PackageFormData = z.infer<typeof packageFormSchema>;

export const aiExtractedSchema = z.object({
  dates: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
    flexible: z.boolean(),
    raw: z.string().nullable(),
  }).nullable(),
  adults: z.number().nullable(),
  children: z.number().nullable(),
  destination: z.string().nullable(),
  budget: z.object({
    total: z.number().nullable(),
    perPerson: z.number().nullable(),
    currency: z.string(),
  }).nullable(),
  requirements: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type AIExtracted = z.infer<typeof aiExtractedSchema>;
