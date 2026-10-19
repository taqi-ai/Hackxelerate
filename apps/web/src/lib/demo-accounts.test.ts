import { describe, expect, it } from "vitest";
import { isDemoAccount } from "./demo-accounts";

describe("shared demo accounts", () => {
  it("flags the published evaluation logins", () => {
    expect(isDemoAccount("admin@ascora.test", "ascora.test")).toBe(true);
    expect(isDemoAccount(" Mentor@ASCORA.test ", "ascora.test")).toBe(true);
  });
  it("does not flag real institution accounts or look-alike domains", () => {
    expect(isDemoAccount("hod@cumail.in", "ascora.test")).toBe(false);
    expect(isDemoAccount("x@notascora.test.evil.com", "ascora.test")).toBe(false);
    expect(isDemoAccount("x@evilascora.test", "ascora.test")).toBe(false);
    expect(isDemoAccount(null, "ascora.test")).toBe(false);
  });
  it("can be switched off for a deployment without demo logins", () => {
    expect(isDemoAccount("admin@ascora.test", "none")).toBe(false);
  });
});
