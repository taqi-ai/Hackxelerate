/** Campus calendar dates are always Asia/Kolkata, never the server's or browser's zone.
 *  `toISOString().slice(0, 10)` is the UTC date, which is the previous day in IST before 05:30. */
const IST = "Asia/Kolkata";

export function istParts(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** Today's campus date (YYYY-MM-DD), optionally shifted by whole days. */
export function campusDate(offsetDays = 0, now: Date = new Date()) {
  const [y, m, d] = istParts(now).date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return t.toISOString().slice(0, 10);
}
