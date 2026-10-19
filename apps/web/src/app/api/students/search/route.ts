import { NextResponse, type NextRequest } from "next/server";
import { searchDemoStudents } from "@/lib/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = (searchParams.get("q") ?? "").slice(0, 40);
  const branch = (searchParams.get("branch") ?? "").slice(0, 40) || undefined;
  const yearNum = Number(searchParams.get("year"));
  const year = Number.isInteger(yearNum) && yearNum >= 1 && yearNum <= 6 ? yearNum : undefined;

  try {
    const students = await searchDemoStudents(q, branch, year, 30);
    return NextResponse.json({ students });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to search students" }, { status: 500 });
  }
}
