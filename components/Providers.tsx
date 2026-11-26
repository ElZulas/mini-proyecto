"use client";

import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
