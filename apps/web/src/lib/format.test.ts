import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone, suggestIntervention } from "./format";

describe("Format helpers (format.ts)", () => {
  it("masks emails preserving first two characters and domain", () => {
    expect(maskEmail("arjun.gupta@cumail.in")).toBe("ar•••••••••@cumail.in");
    expect(maskEmail("me@college.edu")).toBe("me••@college.edu");
    expect(maskEmail(null)).toBe("-");
  });

  it("masks phone numbers keeping first and last two digits", () => {
    expect(maskPhone("9876543210")).toBe("98••••••10");
    expect(maskPhone(null)).toBe("-");
  });

  it("suggests appropriate interventions based on drivers", () => {
    expect(suggestIntervention("mocks")).toBe("mock_interview");
    expect(suggestIntervention("coding")).toBe("mock_interview");
    expect(suggestIntervention("soft_avg")).toBe("skill_workshop");
    expect(suggestIntervention("backlogs")).toBe("peer_tutoring");
    expect(suggestIntervention("cgpa")).toBe("peer_tutoring");
    expect(suggestIntervention(undefined)).toBe("mentor_meeting");
    expect(suggestIntervention("attendance")).toBe("mentor_meeting");
  });
});
