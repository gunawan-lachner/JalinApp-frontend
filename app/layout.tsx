import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { RouteGate } from "@/components/auth/route-gate";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jalin App",
  description: "Jalin App switching platform",
  generator: "Ayash",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <RouteGate>{children}</RouteGate>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
