/** Result of the separate OULAD experiment (docs/EXTERNAL_PUBLIC_DATA_BENCHMARK.md, docs/benchmarks/oulad_results.json).
 *  Copied here because the deployed app cannot read the docs folder; `external-benchmark.test.ts` fails if these
 *  numbers drift from the committed results file. This is NOT the accuracy of Ascora's models. */
export const OULAD_BENCHMARK = {
  name: "Open University Learning Analytics Dataset (OULAD)",
  kind: "Real, anonymised public data (CC BY 4.0)",
  citation: "Kuzilek, Hlosta and Zdrahal, Scientific Data 4:170171 (2017), doi:10.1038/sdata.2017.171",
  target: "Fail or Withdrawn versus Pass or Distinction, from the first 28 days of a course presentation",
  protocol: "Trained on presentations 2013B, 2013J and 2014B; tested once on 2014J (out of time). Demographics not used.",
  train: { rows: 18334, prevalence: 0.4585 },
  test: { rows: 7932, prevalence: 0.3836 },
  logistic: { rocAuc: 0.6996, rocCi: [0.6881, 0.7109], prAuc: 0.5458, brier: 0.225, ece: 0.0615 },
  lightgbm: { rocAuc: 0.6993, rocCi: [0.6879, 0.7105], prAuc: 0.5431, brier: 0.2281, ece: 0.0788 },
  flag20: { precision: 0.6242, recall: 0.3385 },
} as const;
