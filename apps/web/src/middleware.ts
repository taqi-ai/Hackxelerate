import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/api/ml-token",
  "/product",
  "/how-it-works",
  "/trust",
  "/about",
  "/manifest.webmanifest",
  "/mobile",
];

const INSTITUTIONAL_PREFIXES = [
  "/overview",
  "/this-week",
  "/students",
  "/segments",
  "/interventions",
  "/data",
  "/model",
  "/fairness",
  "/ask",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const demoStudentCookie = request.cookies.get("ascora_demo_student")?.value;

  // Offline mode: no Supabase, no auth (local machine only; see lib/offline.ts)
  if (process.env.ASCORA_OFFLINE === "1" && !process.env.VERCEL) {
    if (path === "/login") {
      return NextResponse.redirect(new URL(demoStudentCookie ? "/student" : "/overview", request.url));
    }
    if (demoStudentCookie && INSTITUTIONAL_PREFIXES.some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    return NextResponse.next();
  }

  // If user is accessing via Demo Student session
  if (demoStudentCookie) {
    if (path === "/login") {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    if (INSTITUTIONAL_PREFIXES.some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = path === "/" || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  // Not authenticated and trying to access private page
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // User is signed in and visits login page
  if (user && path === "/login") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const destination = profile?.role === "student" ? "/student" : "/overview";
    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|mobile-sim|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
