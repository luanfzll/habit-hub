import { describe, expect, it } from "vitest";
import { isSignupAllowed } from "./signup-policy";

describe("isSignupAllowed", () => {
  it("is closed in production unless configured", () => {
    expect(isSignupAllowed("a@example.com", { NODE_ENV: "production" })).toBe(false);
    expect(isSignupAllowed("a@example.com", { NODE_ENV: "development" })).toBe(true);
  });

  it("opens to everyone with *", () => {
    expect(isSignupAllowed("a@example.com", { NODE_ENV: "production", SIGNUP_ALLOWLIST: "*" })).toBe(true);
  });

  it("only lets listed e-mails in, ignoring case and spaces", () => {
    const env = { NODE_ENV: "production", SIGNUP_ALLOWLIST: " Me@Example.com , other@example.com " };
    expect(isSignupAllowed("me@example.com", env)).toBe(true);
    expect(isSignupAllowed("OTHER@example.com ", env)).toBe(true);
    expect(isSignupAllowed("stranger@example.com", env)).toBe(false);
  });
});
