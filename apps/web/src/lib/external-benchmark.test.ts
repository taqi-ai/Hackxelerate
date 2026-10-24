import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OULAD_BENCHMARK as B } from "./external-benchmark";

describe("external benchmark constants", () => {
  const file = path.resolve(__dirname, "../../../../docs/benchmarks/oulad_results.json");
  it("match the committed results file", () => {
    const j = JSON.parse(readFileSync(file, "utf8"));
    expect(j.train.rows).toBe(B.train.rows);
    expect(j.train.prevalence).toBe(B.train.prevalence);
    expect(j.test.rows).toBe(B.test.rows);
    expect(j.test.prevalence).toBe(B.test.prevalence);
    for (const [key, mine] of [["logistic_baseline", B.logistic], ["lightgbm_isotonic", B.lightgbm]] as const) {
      const m = j.models[key];
      expect(m.roc_auc).toBe(mine.rocAuc);
      expect(m.roc_auc_95ci_bootstrap).toEqual(mine.rocCi);
      expect(m.pr_auc).toBe(mine.prAuc);
      expect(m.brier).toBe(mine.brier);
      expect(m.ece_10bin).toBe(mine.ece);
    }
    const f = j.models.lightgbm_isotonic.threshold_from_train_oof_for_20pct_flag_share;
    expect(f.precision).toBe(B.flag20.precision);
    expect(f.recall).toBe(B.flag20.recall);
  });
});
