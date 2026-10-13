import { NextResponse, type NextRequest } from "next/server";
import { searchDemoStudents } from "@/lib/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") ?? "";
  const branch = searchParams.get("branch") ?? undefined;
  const yearStr = searchParams.get("year");
  const year = yearStr ? Number(yearStr) : undefined;

  try {
    const students = await searchDemoStudents(q, branch, year, 30);
    return NextResponse.json({ students });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to search students" }, { status: 500 });
  }
}
