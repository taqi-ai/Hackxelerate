"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Activity,
  Download,
  Keyboard,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  User,
  Volume2,
  Wind,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { createClient } from "@/lib/supabase/client";
import { getPrefs, resetPrefs, setPref, type Prefs } from "@/lib/prefs";
import { play, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** accounts shared by everyone evaluating Ascora: a password change would lock other people out */
const SHARED_ACCOUNTS = ["admin@ascora.test", "mentor@ascora.test"];

type Props = { name: string; email: string; role: "admin" | "mentor"; mentorId: string | null; visibleStudents: number; offline: boolean; mlUrl: string };

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "workspace", label: "Workspace", icon: SlidersHorizontal },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "data", label: "Data and privacy", icon: Download },
  { id: "system", label: "System status", icon: Activity },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
] as const;

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="edge scroll-mt-24 rounded-2xl border bg-card/80 p-6 backdrop-blur-sm">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-t py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between [&>*]:min-w-0 [&>*:last-child]:max-w-full [&>*:last-child]:overflow-x-auto">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; label: string; icon?: React.ElementType }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
            value === o.v ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon && <o.icon className="size-3.5" aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsClient({ name, email, role, mentorId, visibleStudents, offline, mlUrl }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sound, setSound] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>({ motion: "system", hours: 3, home: "/overview" });
  const [active, setActive] = useState<string>("profile");

  useEffect(() => {
    setMounted(true);
    setSound(soundEnabled());
    setPrefs(getPrefs());
    const h = (e: Event) => setPrefs((e as CustomEvent<Prefs>).detail);
    window.addEventListener("ascora-prefs", h);
    return () => window.removeEventListener("ascora-prefs", h);
  }, []);

  // highlight the section in view
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-30% 0px -60% 0px" });
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPref(k, v);
    play("toggle");
  };

  const initials = name
    .replace(/^(Dr\.|Prof\.)\s*/, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors",
                  active === s.id ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <s.icon className="size-4" aria-hidden />
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-4">
        <Section id="profile" title="Profile" description="Who you are signed in as, and what you can see.">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-brand-soft font-display text-lg font-semibold text-brand">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">{name}</p>
              <p className="truncate text-sm text-muted-foreground">{email || "Offline session"}</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { k: "Role", v: role === "admin" ? "Head of department (admin)" : "Faculty mentor" },
              { k: "Access", v: role === "admin" ? "Whole campus" : `Mentor group ${mentorId ?? "-"}` },
              { k: "Students you can see", v: visibleStudents.toLocaleString("en-IN") },
            ].map((d) => (
              <div key={d.k} className="rounded-xl bg-muted/50 px-4 py-3">
                <dt className="text-xs text-muted-foreground">{d.k}</dt>
                <dd className="mt-0.5 text-sm font-medium">{d.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Names and roles are managed by your college administrator. Access is enforced by the database, not only by this screen.</p>
        </Section>

        <Section id="appearance" title="Appearance" description="Saved in this browser.">
          <Row label="Theme" hint="System follows your device setting.">
            {mounted && (
              <Segmented
                label="Theme"
                value={(theme as "light" | "dark" | "system") ?? "system"}
                onChange={(v) => {
                  document.documentElement.classList.add("theme-fade");
                  window.setTimeout(() => document.documentElement.classList.remove("theme-fade"), 450);
                  setTheme(v);
                  play("toggle");
                }}
                options={[
                  { v: "light", label: "Light", icon: Sun },
                  { v: "dark", label: "Dark", icon: Moon },
                  { v: "system", label: "System", icon: Monitor },
                ]}
              />
            )}
          </Row>
          <Row label={<span className="inline-flex items-center gap-2"><Volume2 className="size-4" aria-hidden /> Interface sounds</span>} hint="Soft clicks and chimes on actions. Muted sounds stay muted.">
            <Segmented
              label="Interface sounds"
              value={sound ? "on" : "off"}
              onChange={(v) => {
                setSoundEnabled(v === "on");
                setSound(v === "on");
                if (v === "on") play("toggle");
              }}
              options={[
                { v: "on", label: "On" },
                { v: "off", label: "Off" },
              ]}
            />
          </Row>
          <Row label={<span className="inline-flex items-center gap-2"><Wind className="size-4" aria-hidden /> Motion</span>} hint="Reduce turns off movement and parallax, keeping simple fades.">
            <Segmented
              label="Motion"
              value={prefs.motion}
              onChange={(v) => update("motion", v)}
              options={[
                { v: "system", label: "Follow device" },
                { v: "reduce", label: "Reduce" },
              ]}
            />
          </Row>
        </Section>

        <Section id="workspace" title="Workspace" description="Defaults that save you a few clicks every week.">
          <Row label="Start page after sign-in" hint="Where Ascora opens when you sign in.">
            <Segmented
              label="Start page"
              value={prefs.home}
              onChange={(v) => update("home", v)}
              options={[
                { v: "/overview", label: "Overview" },
                { v: "/this-week", label: "This week" },
                { v: "/students", label: "Students" },
              ]}
            />
          </Row>
          <Row label="Weekly mentoring hours" hint="The planner on This week starts from this budget.">
            <div className="flex w-full max-w-64 items-center gap-3">
              <Slider min={1} max={10} step={0.5} value={[prefs.hours]} onValueChange={([v]) => setPrefs((p) => ({ ...p, hours: v }))} onValueCommit={([v]) => update("hours", v)} aria-label="Weekly mentoring hours" />
              <span className="w-12 text-right text-sm tabular">{prefs.hours}h</span>
            </div>
          </Row>
          <Row label="Reset preferences" hint="Restore the default start page, hours and motion.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetPrefs();
                play("soft");
                toast.success("Preferences reset");
              }}
            >
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </Row>
        </Section>

        <Section id="security" title="Security" description="Protect your account.">
          <PasswordForm email={email} offline={offline} />
          <Row label="Sign out other sessions" hint="Ends every session except this one, for example a lab computer you forgot to sign out of.">
            <SignOutOthers offline={offline} />
          </Row>
          <Row label="Sign out" hint="End this session on this device.">
            <Button
              variant="outline"
              size="sm"
              disabled={offline}
              onClick={async () => {
                await createClient().auth.signOut();
                router.replace("/login");
                router.refresh();
              }}
            >
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </Row>
        </Section>

        <Section id="data" title="Data and privacy" description="What Ascora stores and how you can take it with you.">
          <Row label="Export students" hint="Download the list you can see as CSV from the Students page, with any filters applied.">
            <Button asChild variant="outline" size="sm">
              <Link href="/students">
                <Download className="size-3.5" /> Open Students
              </Link>
            </Button>
          </Row>
          <Row label="Contact details" hint="Phone numbers and personal emails are masked in every view.">
            <span className="rounded-full bg-risk-low/15 px-2.5 py-1 text-xs font-medium text-risk-low">Masked</span>
          </Row>
          <Row label="Audit trail" hint="Interventions, contact reveals and pipeline runs are logged with who did them and when.">
            <span className="rounded-full bg-risk-low/15 px-2.5 py-1 text-xs font-medium text-risk-low">On</span>
          </Row>
          {role === "admin" && (
            <Row label="Fairness and privacy report" hint="How the models treat different groups, and the checks marked for review.">
              <Button asChild variant="outline" size="sm">
                <Link href="/fairness">Open report</Link>
              </Button>
            </Row>
          )}
          <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
            The students in this workspace are a generated sample cohort. No real student data is stored.
          </p>
        </Section>

        <Section id="system" title="System status" description="Live checks of the services Ascora depends on.">
          <SystemStatus mlUrl={mlUrl} offline={offline} />
        </Section>

        <Section id="shortcuts" title="Keyboard shortcuts" description="Move faster without the mouse.">
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { k: ["Ctrl", "K"], d: "Search students and pages" },
              { k: ["Esc"], d: "Close a dialog or the search" },
              { k: ["Tab"], d: "Move between controls" },
              { k: ["Enter"], d: "Open the highlighted result" },
            ].map((s) => (
              <li key={s.d} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm">
                <span>{s.d}</span>
                <span className="flex gap-1">
                  {s.k.map((k) => (
                    <kbd key={k} className="rounded-md border bg-background px-1.5 py-0.5 font-mono text-xs">
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function PasswordForm({ email, offline }: { email: string; offline: boolean }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shared = SHARED_ACCOUNTS.includes(email.toLowerCase());
  const locked = shared || offline;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) return setError("Use at least 10 characters.");
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError("Mix letters and numbers.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    start(async () => {
      const { error } = await createClient().auth.updateUser({ password: pw });
      if (error) {
        play("error");
        setError(error.message);
        return;
      }
      play("success");
      setPw("");
      setPw2("");
      toast.success("Password updated");
    });
  }

  return (
    <form onSubmit={submit} className="pb-4" noValidate>
      <p className="text-sm font-medium">Change password</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {shared
          ? "This is a shared account used by everyone reviewing Ascora, so its password can't be changed here."
          : offline
            ? "Not available while running offline."
            : "At least 10 characters, with letters and numbers."}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} disabled={locked} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pw2">Confirm</Label>
          <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} disabled={locked} />
        </div>
        <Button type="submit" disabled={locked || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Update
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function SignOutOthers({ offline }: { offline: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={offline || pending}
      onClick={() =>
        start(async () => {
          const { error } = await createClient().auth.signOut({ scope: "others" });
          if (error) {
            play("error");
            toast.error(error.message);
          } else {
            play("success");
            toast.success("Other sessions signed out");
          }
        })
      }
    >
      {pending && <Loader2 className="size-3.5 animate-spin" />} Sign out others
    </Button>
  );
}

type Check = { label: string; state: "checking" | "ok" | "down"; detail: string };

function SystemStatus({ mlUrl, offline }: { mlUrl: string; offline: boolean }) {
  const [checks, setChecks] = useState<Check[]>([
    { label: "Database and sign-in", state: "checking", detail: "" },
    { label: "Analytics service", state: "checking", detail: "" },
    { label: "AI language model", state: "checking", detail: "" },
  ]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const set = (i: number, c: Partial<Check>) => !cancelled && setChecks((cs) => cs.map((x, j) => (j === i ? { ...x, ...c } : x)));
    setChecks((cs) => cs.map((c) => ({ ...c, state: "checking", detail: "" })));

    (async () => {
      if (offline) return set(0, { state: "ok", detail: "Offline mode: reading the local snapshot" });
      const t0 = performance.now();
      const { error } = await createClient().auth.getUser();
      set(0, error ? { state: "down", detail: error.message } : { state: "ok", detail: `Responded in ${Math.round(performance.now() - t0)} ms` });
    })();

    (async () => {
      if (!mlUrl) {
        set(1, { state: "down", detail: "No service address configured" });
        set(2, { state: "down", detail: "Depends on the analytics service" });
        return;
      }
      const t0 = performance.now();
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(`${mlUrl.replace(/\/$/, "")}/health`, { signal: ctrl.signal, cache: "no-store" });
        clearTimeout(to);
        const body = (await res.json()) as { status?: string; llm?: string; llm_model?: string };
        set(1, res.ok && body.status === "ok" ? { state: "ok", detail: `Responded in ${Math.round(performance.now() - t0)} ms` } : { state: "down", detail: `HTTP ${res.status}` });
        const llmOn = body.llm && !body.llm.startsWith("disabled");
        set(2, llmOn ? { state: "ok", detail: `${body.llm}${body.llm_model ? `, ${body.llm_model}` : ""}` } : { state: "down", detail: "Not configured: answers use built-in rules instead" });
      } catch {
        set(1, { state: "down", detail: "Unreachable. It may be waking up; try again in a minute." });
        set(2, { state: "down", detail: "Depends on the analytics service" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mlUrl, offline, tick]);

  return (
    <div>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                c.state === "ok" ? "bg-risk-low shadow-[0_0_10px_var(--risk-low)]" : c.state === "down" ? "bg-risk-medium" : "animate-pulse bg-muted-foreground",
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{c.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{c.state === "checking" ? "Checking..." : c.detail}</span>
            </span>
            <span className="text-xs text-muted-foreground">{c.state === "ok" ? "Operational" : c.state === "down" ? "Unavailable" : ""}</span>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setTick((t) => t + 1)}>
        <RotateCcw className="size-3.5" /> Check again
      </Button>
    </div>
  );
}
