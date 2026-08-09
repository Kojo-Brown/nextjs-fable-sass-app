import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  listFiltersSchema,
} from "@/lib/validation/application";

describe("applicationSchema", () => {
  const base = { company: "Acme", position: "Engineer", status: "saved" };

  it("accepts a minimal valid application", () => {
    const result = applicationSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("normalizes empty optional strings to null", () => {
    const result = applicationSchema.parse({
      ...base,
      location: "",
      url: "",
      notes: "",
    });
    expect(result.location).toBeNull();
    expect(result.url).toBeNull();
    expect(result.notes).toBeNull();
  });

  it("rejects salaryMin greater than salaryMax", () => {
    const result = applicationSchema.safeParse({
      ...base,
      salaryMin: "200000",
      salaryMax: "100000",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["salaryMin"]);
    }
  });

  it("coerces numeric strings from form data", () => {
    const result = applicationSchema.parse({ ...base, salaryMin: "90000" });
    expect(result.salaryMin).toBe(90000);
  });

  it("rejects an invalid URL", () => {
    const result = applicationSchema.safeParse({ ...base, url: "not a url" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing company", () => {
    const result = applicationSchema.safeParse({
      position: "Engineer",
      status: "saved",
      company: "  ",
    });
    expect(result.success).toBe(false);
  });
});

describe("listFiltersSchema", () => {
  it("defaults page to 1 and swallows junk page values", () => {
    expect(listFiltersSchema.parse({}).page).toBe(1);
    expect(listFiltersSchema.parse({ page: "banana" }).page).toBe(1);
    expect(listFiltersSchema.parse({ page: "-3" }).page).toBe(1);
  });

  it("rejects unknown statuses", () => {
    const result = listFiltersSchema.safeParse({ status: "ghosted" });
    expect(result.success).toBe(false);
  });
});
