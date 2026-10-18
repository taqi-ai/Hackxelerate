import { describe, expect, it } from "vitest";
import { levenshteinDistance, matchesStudentQuery, normalizeString } from "./search-utils";

describe("search-utils", () => {
  describe("normalizeString", () => {
    it("removes hyphens, spaces, and special characters", () => {
      expect(normalizeString("CU-24-CSE-0042")).toBe("cu24cse0042");
      expect(normalizeString("Dr. John Doe")).toBe("drjohndoe");
    });
  });

  describe("levenshteinDistance", () => {
    it("computes edit distance correctly", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(levenshteinDistance("rohit", "rohit")).toBe(0);
      expect(levenshteinDistance("priya", "priya")).toBe(0);
      expect(levenshteinDistance("priya", "priyaa")).toBe(1);
    });
  });

  describe("matchesStudentQuery", () => {
    const student = { name: "Rohit Yadav", id: "CU24ECE0134" };

    it("matches full name exactly (case-insensitive)", () => {
      expect(matchesStudentQuery(student.name, student.id, "Rohit Yadav")).toBe(true);
      expect(matchesStudentQuery(student.name, student.id, "rohit yadav")).toBe(true);
    });

    it("matches partial name", () => {
      expect(matchesStudentQuery(student.name, student.id, "Roh")).toBe(true);
      expect(matchesStudentQuery(student.name, student.id, "Yad")).toBe(true);
    });

    it("matches exact roll number", () => {
      expect(matchesStudentQuery(student.name, student.id, "CU24ECE0134")).toBe(true);
      expect(matchesStudentQuery(student.name, student.id, "cu24ece0134")).toBe(true);
    });

    it("matches partial roll number", () => {
      expect(matchesStudentQuery(student.name, student.id, "0134")).toBe(true);
      expect(matchesStudentQuery(student.name, student.id, "24ECE")).toBe(true);
    });

    it("matches normalized roll number with hyphens or spaces", () => {
      expect(matchesStudentQuery(student.name, student.id, "CU-24-ECE-0134")).toBe(true);
    });

    it("handles minor typos in name search", () => {
      // 1-character typo in 'Rohit' -> 'Rohyt'
      expect(matchesStudentQuery(student.name, student.id, "Rohyt")).toBe(true);
      // 1-character typo in 'Yadav' -> 'Yadaw'
      expect(matchesStudentQuery(student.name, student.id, "Yadaw")).toBe(true);
    });

    it("returns false for non-matching queries", () => {
      expect(matchesStudentQuery(student.name, student.id, "Ananya Sharma")).toBe(false);
      expect(matchesStudentQuery(student.name, student.id, "CU25ME9999")).toBe(false);
    });

    it("returns false for empty query", () => {
      expect(matchesStudentQuery(student.name, student.id, "")).toBe(false);
      expect(matchesStudentQuery(student.name, student.id, "   ")).toBe(false);
    });
  });
});
