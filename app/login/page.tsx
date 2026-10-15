"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        // Check if result.data and result.data.user exist before accessing properties
        if (result.data?.user) {
          console.log(
            "Login successful:",
            result.data.user.username,
            result.data.user.role_name
          );
          router.push("/"); // Redirect to dashboard or home page
        } else {
          setError("Login successful, but user data was not returned.");
        }
      } else {
        const errorMsg =
          result.error || "Login failed. Please check your credentials.";
        setError(errorMsg);
        toast({
          title: "Login Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMsg = "An unexpected error occurred during login.";
      setError(errorMsg);
      console.error("Login error:", err);
      toast({
        title: "Login Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/jalin-logo.webp"
              alt="Jalin Logo"
              width={120}
              height={120}
              className="h-24 w-24 object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Welcome
          </CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="rounded-full border-gray-300"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-full bg-blue-600 py-2 text-lg font-semibold text-white hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
