import { z } from "zod";

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const optionalTrimmed = z
  .string()
  .trim()
  .max(5000)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalInt = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const applicationSchema = z
  .object({
    company: z.string().trim().min(1, "Company is required").max(200),
    position: z.string().trim().min(1, "Position is required").max(200),
    status: z.enum(APPLICATION_STATUSES),
    location: optionalTrimmed,
    url: z
      .union([z.literal(""), z.string().trim().url("Enter a valid URL")])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    salaryMin: optionalInt,
    salaryMax: optionalInt,
    jobDescription: optionalTrimmed,
    notes: optionalTrimmed,
  })
  .refine(
    (d) =>
      d.salaryMin == null || d.salaryMax == null || d.salaryMin <= d.salaryMax,
    { message: "Minimum salary can't exceed maximum", path: ["salaryMin"] },
  );

export type ApplicationInput = z.infer<typeof applicationSchema>;

export type ApplicationFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export const listFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});
