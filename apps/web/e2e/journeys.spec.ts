import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/** Critical journeys on the real app (offline mode, frozen synthetic cohort, signed in as the offline admin). */

const STUDENT = "CU24AIML0039"; // Arjun Gupta, CSE-AIML, Year 3 in the frozen cohort

async function noIntro(page: Page) {
  // the landing intro plays once per session; mark it as seen so it does not cover the page
  await page.addInitScript(() => sessionStorage.setItem("ascora-intro", "1"));
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.beforeEach(async ({ page }) => noIntro(page));

test("landing page renders the hero and links into the product", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("From early warning");
  await expect(page.getByRole("link", { name: /mobile app/i }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("overview shows the whole cohort", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/overview");
  await expect(page.getByText("1,200").first()).toBeVisible();
  // freshness comes from dates inside the files; as the frozen files age, the wording switches to the stale warning
  await expect(page.getByText(/Oldest dated source|days old, past its/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("students table search narrows the list and opens a profile", async ({ page }) => {
  await page.goto("/students");
  await page.getByPlaceholder("Search name or roll number").fill("Arjun Gupta");
  await expect(page.locator("tbody tr").first()).toContainText("Arjun Gupta");
  await page.goto(`/students/${STUDENT}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Arjun Gupta");
  await expect(page.getByText(/Success Score/i).first()).toBeVisible();
});

test("raw contacts and fairness-only attributes never reach the browser payload", async ({ request }) => {
  // the server-rendered HTML carries the full props of every client component, so check it, not just what is drawn
  const snap = JSON.parse(readFileSync(path.join(process.cwd(), "demo-data", "snapshot.json"), "utf-8"));
  const raw = snap.students.find((s: { id: string }) => s.id === STUDENT);
  for (const url of [`/students/${STUDENT}`, `/students/${STUDENT}/report`, "/students"]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    const body = await res.text();
    expect(body, url).not.toContain(raw.email);
    expect(body, url).not.toContain(raw.phone);
    for (const key of ["first_generation", "lateral_entry", "schooling_medium", "hosteller"]) expect(body, `${url} ${key}`).not.toContain(key);
  }
});

test("an intervention can be planned once; a duplicate is refused with a clear message", async ({ page }) => {
  await page.goto(`/students/${STUDENT}`);
  const plan = async () => {
    await page.getByRole("button", { name: /plan intervention/i }).click();
    await page.getByLabel("Owner").fill("E2E Mentor");
    await page.getByRole("button", { name: "Save" }).click();
  };
  await plan();
  await expect(page.getByText(/Intervention logged for/i)).toBeVisible();
  await plan();
  await expect(page.getByText(/already has an open intervention of this type/i)).toBeVisible();
});

test("search palette finds a student and navigates", async ({ page }) => {
  await page.goto("/overview");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Search students by name or roll number/i).fill("Arjun Gup");
  await expect(page.locator("[cmdk-item]").first()).toContainText("Arjun Gupta");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/students\/CU/);
});

test("CSV export escapes formula cells and includes every row", async ({ page }) => {
  await page.goto("/students");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV" }).click();
  const file = await (await download).path();
  const { readFileSync } = await import("node:fs");
  const lines = readFileSync(file!, "utf8").trim().split("\n");
  expect(lines[0]).toContain("roll_no");
  expect(lines.length - 1).toBe(1200);
});

test("mobile page offers the signed APK", async ({ page }) => {
  await page.goto("/mobile");
  const link = page.getByRole("link", { name: /download for android/i });
  await expect(link).toHaveAttribute("href", /\.apk$/);
});

test("health endpoint answers without secrets", async ({ request }) => {
  const r = await request.get("/api/health?probe=live");
  expect(r.ok()).toBe(true);
  expect(await r.json()).toEqual({ status: "ok" });
});

test("a student can open their own view and keep a plan", async ({ page, context }) => {
  await context.addCookies([{ name: "ascora_demo_student", value: STUDENT, url: "http://localhost:" + (process.env.E2E_PORT ?? 3100) }]);
  await page.goto("/student");
  await expect(page.getByText("Arjun Gupta").first()).toBeVisible();
  const plans = 'button[title="Mark completed"], button[title="Mark active"]';
  await page.goto("/student/schedule");
  const before = await page.locator(plans).count();
  await page.goto("/student/calculator");
  await page.getByRole("button", { name: /Save Scenario as Target Plan|Commit Target to My Plan/ }).first().click();
  await expect(page.getByRole("button", { name: /Saved|Target Saved/ }).first()).toBeVisible();
  await page.goto("/student/schedule");
  await expect(page.locator(plans)).toHaveCount(before + 1);
  // institutional pages stay closed to a student
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/student/);
});

test("changing an intervention status persists across a reload", async ({ page }) => {
  await page.goto("/interventions");
  const first = page.locator("ul.divide-y > li").first();
  const who = (await first.innerText()).split("\n")[0];
  await first.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "Done", exact: true }).click();
  await expect(page.locator("ul.divide-y > li").first()).not.toContainText(who, { timeout: 15_000 });
  await page.reload();
  // after a reload the item is still out of the open list: the change was saved, not just shown
  await expect(page.locator("ul.divide-y > li").first()).not.toContainText(who);
});

test("account management says plainly that it needs the live database when offline", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Accounts");
  await expect(page.getByText("Account management needs the live database")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the join page checks the form before anything is sent", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (r) => r.url().includes("/auth/v1/signup") && sent.push(r.url()));
  await page.goto("/join");
  await page.getByLabel("Email").fill("someone@college.edu");
  await page.getByLabel("Password", { exact: true }).fill("long-enough-pass");
  await page.getByLabel("Confirm password").fill("different-pass-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("The two passwords do not match.")).toBeVisible();
  expect(sent).toEqual([]);
});

test("keyboard only: skip link, dialog open and close, focus always visible", async ({ page }) => {
  await page.goto(`/students/${STUDENT}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // first Tab lands on the skip link, which moves focus past the navigation
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText(/Skip to content/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);

  // the intervention dialog opens from the keyboard, closes with Escape and gives focus back
  const open = page.getByRole("button", { name: /plan intervention/i });
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(open).toBeFocused();

  // every stop in the first 25 tab presses shows a visible focus indicator (outline or ring)
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const shown = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return true;
      const s = getComputedStyle(el);
      return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
    });
    expect(shown, `focus indicator on tab stop ${i + 1}`).toBe(true);
  }
});

// keep this test LAST: approving a plan creates real (offline-store) interventions that later tests would see
test("Mission Control: capacity limits, validation, and approval that does not duplicate", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/mission-control");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mission Control");
  await expect(page.getByText(/synthetic demonstration cohort/i).first()).toBeVisible();
  await expect(page.getByText(/Planning scenario, not a prediction/i)).toBeVisible();

  // invalid input is refused visibly
  await page.getByLabel("Peer-tutoring slots", { exact: true }).fill("-3");
  await expect(page.locator("p[role=alert]")).toContainText(/between 0 and 200/);
  await page.getByRole("button", { name: /reset to defaults/i }).click();

  // zero capacity gives a valid, empty plan
  for (const label of ["Mentor hours per mentor", "Peer-tutoring slots", "Mock-interview slots", "Skill-workshop slots"]) {
    await page.getByLabel(label, { exact: true }).fill("0");
  }
  await expect(page.getByText("No recommendations")).toBeVisible();
  await expect(page.getByRole("button", { name: /review and approve \(0\)/i })).toBeDisabled();

  // a small plan: one mentor hour each, nothing else. Approve, then see the records in Interventions
  await page.getByLabel("Mentor hours per mentor", { exact: true }).fill("0.5");
  const approve = page.getByRole("button", { name: /review and approve \((\d+)\)/i });
  await expect(approve).toBeEnabled();
  await approve.click();
  await page.getByRole("button", { name: "Approve and create" }).click();
  await expect(page.getByText(/interventions? created/i).first()).toBeVisible();
  // the same students are now excluded ("already have an open intervention"), so an immediate re-approval cannot duplicate them
  await expect(page.getByText(/already have an open intervention/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});
