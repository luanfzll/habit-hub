import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameProblem } from "./username";

describe("usernames", () => {
  it("are lowercased and trimmed", () => {
    expect(normalizeUsername("  Luan-Dev ")).toBe("luan-dev");
  });

  it.each(["luan", "luan-dev", "a1b", "x".repeat(20)])("accept %j", (name) => {
    expect(usernameProblem(name)).toBeNull();
  });

  it.each(["ab", "x".repeat(21), "-luan", "luan-", "luan_dev", "luã", "Luan"])("reject %j", (name) => {
    expect(usernameProblem(name)).toBe("format");
  });

  it("refuses names that could pass as the app", () => {
    expect(usernameProblem("habithub")).toBe("reserved");
    expect(usernameProblem("suporte")).toBe("reserved");
  });
});
