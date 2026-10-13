import Link from "next/link";
import { UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentNotFound() {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <UserRoundSearch className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="text-lg font-semibold">Student not found</h1>
      <p className="text-sm text-muted-foreground">
        Either this roll number doesn&apos;t exist or the student is not assigned to you. Mentors can only open their own students.
      </p>
      <Button asChild>
        <Link href="/students">Back to students</Link>
      </Button>
    </div>
  );
}
