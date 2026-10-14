import Image from "next/image";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { ClosingCta, PageHero, PrimaryCta, SectionHead } from "@/components/landing/site-kit";
import { Reveal } from "@/components/motion";
import { getProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Product",
  description: "The screens inside Ascora: campus overview, student 360, mentor week planner, segments, data integration and model transparency.",
};

const FEATURES = [
  {
    kicker: "Overview",
    title: "One calm view of campus health",
    body: "Start with three numbers and the one insight that matters most. Everything else is a click away, not crammed onto the first screen.",
    points: ["Success Score distribution and risk counts", "Plain-language insights, ranked by impact", "Upcoming check-ins and follow-ups"],
    img: "/assets/ui/overview.webp",
    alt: "Ascora overview dashboard",
  },
  {
    kicker: "Student 360",
    title: "Every reason behind a flag, in plain words",
    body: "Each student's score is broken into its parts and compared with the cohort. Drivers a mentor can change are marked, with the smallest changes that would help.",
    points: ["Score ring with five components", "Model drivers explained, not just ranked", "What-if sliders that re-score live"],
    img: "/assets/ui/student.webp",
    alt: "Student 360 profile",
  },
  {
    kicker: "This week",
    title: "A plan that fits a mentor's real hours",
    body: "Mentors enter how much time they have. Ascora ranks who to meet for the most expected benefit and suggests the right kind of support.",
    points: ["Time-boxed meeting list", "Intervention pre-suggested from the top driver", "Logged with a baseline to measure later"],
    img: "/assets/ui/thisweek.webp",
    alt: "Mentor weekly planner",
  },
  {
    kicker: "Segments",
    title: "Groups that need the same kind of help",
    body: "Students are clustered by pattern, not by a single score, so a department can run one programme for many students instead of many one-off talks.",
    points: ["Named segments with their defining traits", "Recommended action per segment", "Open members in one click"],
    img: "/assets/ui/segments.webp",
    alt: "Student segments view",
  },
  {
    kicker: "Data integration",
    title: "Seven messy exports, one trustworthy record",
    body: "Roll numbers in five formats, typos in names, duplicate rows and conflicting values are resolved by rule, and anything ambiguous waits for a person.",
    points: ["Header auto-mapping for CSV, Excel and JSON", "Fuzzy matching with precision and recall reported", "Review queue for uncertain links"],
    img: "/assets/ui/data.webp",
    alt: "Data integration pipeline",
  },
  {
    kicker: "Score and models",
    title: "Open formula, audited models",
    body: "The Success Score formula and weights are published inside the product. Model accuracy, calibration, stability and fairness are on their own pages.",
    points: ["Weights and stability under perturbation", "AUC, calibration and early-warning curve", "Fairness checks, including the ones that need review"],
    img: "/assets/ui/model.webp",
    alt: "Score and model transparency",
  },
];

const ROLES = [
  { feature: "Whole-campus overview and segments", hod: true, mentor: false },
  { feature: "Assigned students only", hod: false, mentor: true },
  { feature: "Student 360 and what-if", hod: true, mentor: true },
  { feature: "Weekly meeting planner", hod: true, mentor: true },
  { feature: "Plan and log interventions", hod: true, mentor: true },
  { feature: "Run the data pipeline", hod: true, mentor: false },
  { feature: "Fairness audit", hod: true, mentor: false },
  { feature: "Ask Ascora in plain English", hod: true, mentor: true },
];

export default async function ProductPage() {
  const profile = await getProfile().catch(() => null);
  return (
    <>
      <PageHero
        eyebrow="Product"
        title="Six screens. One job: help the right student, this week."
        lead="Ascora keeps each page focused on one decision, and hides detail until you ask for it."
      >
        <div className="mt-9">
          <PrimaryCta href={profile ? "/overview" : "/login"}>{profile ? "Open dashboard" : "Open live demo"}</PrimaryCta>
        </div>
      </PageHero>

      <div className="mx-auto max-w-7xl space-y-28 px-4 sm:px-6">
        {FEATURES.map((f, i) => (
          <section key={f.kicker} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className={cn(i % 2 === 1 && "lg:order-2")}>
              <p className="text-sm font-medium text-[oklch(0.8_0.07_272)]">{f.kicker}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{f.title}</h2>
              <p className="mt-4 text-lg leading-relaxed text-white/60">{f.body}</p>
              <ul className="mt-6 space-y-2.5">
                {f.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-white/80">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[oklch(0.8_0.07_272/0.15)]">
                      <Check className="size-3 text-[oklch(0.85_0.08_272)]" aria-hidden />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1} className={cn(i % 2 === 1 && "lg:order-1")}>
              <div className="relative">
                <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,oklch(0.62_0.16_272/0.25),transparent)] blur-2xl" />
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14] shadow-[0_40px_100px_-30px_oklch(0.8_0.07_272/0.35)]">
                  <div className="flex h-8 items-center gap-1.5 border-b border-white/10 px-3.5" aria-hidden>
                    <span className="size-2 rounded-full bg-white/15" />
                    <span className="size-2 rounded-full bg-white/15" />
                    <span className="size-2 rounded-full bg-white/15" />
                  </div>
                  <Image src={f.img} alt={f.alt} width={2400} height={1500} className="h-auto w-full" loading="lazy" sizes="(min-width: 1024px) 50vw, 100vw" />
                </div>
              </div>
            </Reveal>
          </section>
        ))}
      </div>

      <section className="mx-auto max-w-5xl px-4 pt-32 sm:px-6">
        <SectionHead center kicker="Roles" title="The right view for each person" lead="Access is enforced by the database itself, not just hidden in the interface." />
        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-3xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/70">
                <tr>
                  <th scope="col" className="px-5 py-4 font-medium">Capability</th>
                  <th scope="col" className="px-5 py-4 text-center font-medium">Head of department</th>
                  <th scope="col" className="px-5 py-4 text-center font-medium">Faculty mentor</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.feature} className="border-t border-white/5">
                    <th scope="row" className="px-5 py-3.5 font-normal text-white/80">{r.feature}</th>
                    {[r.hod, r.mentor].map((v, j) => (
                      <td key={j} className="px-5 py-3.5 text-center">
                        {v ? <Check className="mx-auto size-4 text-[oklch(0.82_0.12_162)]" aria-label="Yes" /> : <span className="text-white/25" aria-label="No">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      <ClosingCta signedIn={!!profile} />
    </>
  );
}
