// components/ErrorBoundaryWrapper.tsx
// Client component wrapper for ErrorBoundary to use in server components

"use client";

import { ErrorBoundary } from "./ErrorBoundary";
import { Toaster } from "sonner";

export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  );
}

