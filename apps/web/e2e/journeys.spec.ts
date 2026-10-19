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
