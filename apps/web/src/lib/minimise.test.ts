import { describe, expect, it } from "vitest";
import { maskContactsDeep, maskedEmail, publicStudent } from "./minimise";

describe("data minimisation for staff screens", () => {
  const raw = {
    id: "CU25CSE0001", name: "Asha Verma", email: "asha.verma@cumail.in", phone: "9876543210",
    branch: "CSE", year: 2, section: "A", mentor_id: "M01", mentors: { name: "Dr. K" },
    gender: "F", hosteller: true, first_generation: true, lateral_entry: false, schooling_medium: "Hindi",
  };

  it("drops fairness-only attributes and masks contacts before anything reaches the browser", () => {
    const s = publicStudent(raw);
    for (const k of ["gender", "hosteller", "first_generation", "lateral_entry", "schooling_medium"]) expect(s).not.toHaveProperty(k);
    expect(JSON.stringify(s)).not.toContain("asha.verma@");
    expect(JSON.stringify(s)).not.toContain("9876543210");
    expect(s.email).toBe("as••••••••@cumail.in");
    expect(s.phone).toBe("98••••••10");
    expect(s.name).toBe("Asha Verma");
  });

  it("masks contacts nested anywhere: lineage, link keys, free text", () => {
    const v = maskContactsDeep({
      lms: { lineage: { file: "lms_activity_log.csv", rows: 12, accounts: ["asha.verma@cumail.in"] } },
      links: [{ raw_key: "asha.verma@cumail.in", raw_ref: "lms_activity_log.csv row 4106" }, { raw_key: "24-CSE-1", raw_ref: "erp_academics.csv row 15728" }],
      feedback: [{ comment: "call me on 9876543210 or +91 9876543210", rating: 4 }],
      score: { success_score: 61.5, id: "CU25CSE0001" },
    });
    const s = JSON.stringify(v);
    expect(s).not.toContain("asha.verma@");
    expect(s).not.toContain("9876543210");
    expect(v.links[1]).toEqual({ raw_key: "24-CSE-1", raw_ref: "erp_academics.csv row 15728" });
    expect(v.score).toEqual({ success_score: 61.5, id: "CU25CSE0001" });
    expect(maskContactsDeep(v)).toEqual(v);
  });

  it("is safe to apply twice (display code masks again)", () => {
    const once = publicStudent(raw);
    expect(publicStudent(once as unknown as Record<string, unknown>)).toEqual(once);
    expect(maskedEmail(null)).toBeNull();
  });
});
