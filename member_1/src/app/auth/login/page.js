"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Loader2,
  ArrowRight
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
    <div className="bg-white rounded-3xl border border-[#E2E2D4] shadow-xl overflow-hidden">
      <div className="p-6 sm:p-8">
        {/* Status Hint */}
        {!isConfigured && (
          <div className="mb-5 p-3 rounded-2xl bg-[#EFF8FF] border border-[#BFDBFE] text-[#1E3A8A] text-xs flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-[#2F9BE0] shrink-0 mt-0.5" />
            <div>
              <strong>Demo Mode Ready:</strong> Enter any email and password, or click the 1-click Demo button below.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-2xl bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-bold">{successMessage}</span>
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
                  suppressHydrationWarning
                  className="text-[#646672] hover:text-[#18191D] pointer-events-auto p-1 focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded-lg"
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
              className="w-full font-black text-sm"
            >
              Sign In to Applicant Hub
            </Button>
          </div>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2E2D4]"></div>
          </div>
          <span className="relative bg-white px-3 text-xs font-bold text-[#646672] uppercase tracking-wider">
            Or Instant Test
          </span>
        </div>

        {/* Instant Demo Login Button */}
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleDemoLogin}
          className="w-full font-bold flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-white" />
          <span>1-Click Demo Login (Candidate)</span>
        </Button>
      </div>

      <div className="bg-[#F8F8EE] justify-center border-t border-[#E2E2D4] p-4 text-center">
        <p className="text-sm text-[#4B4D56]">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/auth/signup"
            className="font-bold text-[#1F5FBF] hover:underline"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12 bg-[#FBFBEF]">
      <div className="max-w-md w-full">
        {/* Top Branding Pill */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CEEEFD] border border-[#BAE6FD] text-[#0284C7] text-xs font-bold mb-3">
            <img src="/images/prayas-icon.png" alt="PRAYAS" className="h-4 w-4 object-contain" />
            <span>PRAYAS 3.0 Secure Handoff</span>
          </div>
          <h1 className="font-display text-3xl font-black text-[#18191D] tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-sm text-[#4B4D56] mt-1.5">
            Access your portable Accessibility Passport and documents
          </p>
        </div>

        <Suspense
          fallback={
            <div className="p-8 bg-white rounded-3xl border border-[#E2E2D4] flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#1F5FBF]" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
