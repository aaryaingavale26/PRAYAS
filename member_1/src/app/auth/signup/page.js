"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { 
  Accessibility, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, isConfigured } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!fullName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, fullName);
      setSuccessMessage("Account created successfully! Taking you to create your Accessibility Passport...");
      setTimeout(() => {
        router.push("/passport");
      }, 700);
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
            <Accessibility className="h-3.5 w-3.5" />
            <span>Join PRAYAS 3.0</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Set up your profile and portable Accessibility Passport
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardContent className="pt-6">
            {!isConfigured && (
              <div className="mb-5 p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 text-xs flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Local Demo Mode Active:</strong> Creating an account will automatically save your session locally and navigate to the Accessibility Passport.
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="signup-name"
                label="Full Name"
                required
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                leftIcon={<User className="h-4 w-4" />}
              />

              <Input
                id="signup-email"
                label="Email Address"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <Input
                id="signup-password"
                label="Password (min. 6 characters)"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

              <Input
                id="signup-confirm-password"
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                leftIcon={<Lock className="h-4 w-4" />}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 font-bold"
                  rightIcon={<ArrowRight className="h-4 w-4 ml-1" />}
                >
                  Create Account &amp; Proceed
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="bg-slate-50/60 justify-center border-t border-slate-100 py-4">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-bold text-teal-700 hover:text-teal-900 hover:underline focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
