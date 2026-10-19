import { describe, expect, it } from "vitest";
import { canTransition } from "./intervention-rules";

describe("intervention state machine", () => {
  it("allows the working path and reopening", () => {
    expect(canTransition("open", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "done")).toBe(true);
    expect(canTransition("done", "open")).toBe(true);
    expect(canTransition("cancelled", "open")).toBe(true);
    expect(canTransition("open", "open")).toBe(true);
  });
  it("refuses jumps out of a closed state", () => {
    expect(canTransition("cancelled", "done")).toBe(false);
    expect(canTransition("cancelled", "in_progress")).toBe(false);
    expect(canTransition("done", "cancelled")).toBe(false);
    expect(canTransition("done", "in_progress")).toBe(false);
  });
});
