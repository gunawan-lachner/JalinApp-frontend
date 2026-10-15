"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";

export function RouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
