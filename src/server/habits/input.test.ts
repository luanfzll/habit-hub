import { describe, expect, it } from "vitest";
import { entryChangeSchema } from "./input";

describe("entryChangeSchema", () => {
  it("accepts a skip with or without a reason, trimming it", () => {
    expect(entryChangeSchema.parse({ skip: true })).toEqual({ skip: true });
    expect(entryChangeSchema.parse({ skip: true, reason: "  Viagem  " })).toEqual({ skip: true, reason: "Viagem" });
  });

  it("treats a blank reason as no reason", () => {
    expect(entryChangeSchema.parse({ skip: true, reason: "   " })).toEqual({ skip: true, reason: null });
  });

  it("rejects reasons longer than 200 characters", () => {
    expect(entryChangeSchema.safeParse({ skip: true, reason: "a".repeat(201) }).success).toBe(false);
  });
});
