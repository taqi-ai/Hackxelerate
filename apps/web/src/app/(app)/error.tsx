"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <TriangleAlert className="size-8 text-risk-medium" strokeWidth={1.5} />
      <h1 className="text-lg font-semibold">This page couldn&apos;t load</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while fetching the data. Your work is safe. Try again, and if it keeps failing the database may be waking up from idle.
      </p>
      <Button onClick={reset}>
        <RotateCw className="size-4" /> Try again
      </Button>
    </div>
  );
}
