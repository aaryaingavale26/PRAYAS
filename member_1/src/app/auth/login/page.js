"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { 
  Accessibility, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Loader2
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const { signIn, signInAsDemo, isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !password) {
      setError("Please fill in both your email address and password.");
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      setSuccessMessage("Sign in successful! Redirecting...");
      setTimeout(() => {
        router.push(redirectUrl);
      }, 600);
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setError("");
    signInAsDemo();
    setSuccessMessage("Logged in as Demo Applicant! Redirecting to Dashboard...");
    setTimeout(() => {
      router.push(redirectUrl);
    }, 600);
  };

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardContent className="pt-6">
        {/* Supabase Status Hint */}
        {!isConfigured && (
          <div className="mb-5 p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 text-xs flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <strong>Hackathon Demo Mode Active:</strong> You can enter any email/password, or use the 1-click Demo button below.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="login-email"
            label="Email Address"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <div>
            <Input
              id="login-password"
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-700 pointer-events-auto p-1 focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 font-bold"
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative bg-white px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Or Instant Test
          </span>
        </div>

        {/* Instant Demo Login Button */}
        <Button
          type="button"
          variant="tealOutline"
          size="md"
          onClick={handleDemoLogin}
          className="w-full font-bold flex items-center justify-center gap-2 border-2 border-teal-600 text-teal-800 hover:bg-teal-50"
        >
          <Sparkles className="h-4 w-4 text-teal-600" />
          <span>1-Click Demo Login (Applicant)</span>
        </Button>
      </CardContent>

      <CardFooter className="bg-slate-50/60 justify-center border-t border-slate-100 py-4">
        <p className="text-sm text-slate-600">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/auth/signup"
            className="font-bold text-teal-700 hover:text-teal-900 hover:underline focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
          >
            Create Account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full">
        {/* Top Branding Pill */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
            <Accessibility className="h-3.5 w-3.5" />
            <span>PRAYAS 3.0 Secure Access</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Access your Accessibility Passport and documents
          </p>
        </div>

        <Suspense
          fallback={
            <div className="p-8 bg-white rounded-xl border border-slate-200 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
