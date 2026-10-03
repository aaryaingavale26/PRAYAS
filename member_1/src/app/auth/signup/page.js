"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles
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
      setSuccessMessage("Account created successfully! Taking you to upload your resume/CV...");
      setTimeout(() => {
        router.push("/onboarding");
      }, 600);
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12 bg-[#FBFBEF]">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CEEEFD] border border-[#BAE6FD] text-[#0284C7] text-xs font-bold mb-3">
            <img src="/images/prayas-icon.png" alt="PRAYAS" className="h-4 w-4 object-contain" />
            <span>Join PRAYAS 3.0</span>
          </div>
          <h1 className="font-display text-3xl font-black text-[#18191D] tracking-tight">
            Create Your Account
          </h1>
          <p className="text-sm text-[#4B4D56] mt-1.5">
            Set up your candidate profile and portable Accessibility Passport
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#E2E2D4] shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            {!isConfigured && (
              <div className="mb-5 p-3 rounded-2xl bg-[#EFF8FF] border border-[#BFDBFE] text-[#1E3A8A] text-xs flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-[#2F9BE0] shrink-0 mt-0.5" />
                <div>
                  <strong>Local Session Sync:</strong> Signing up creates your profile and immediately syncs your session with the Chrome Extension.
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-2xl bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] text-sm flex items-start gap-2.5"
              >
                <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-bold">{successMessage}</span>
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

              <div>
                <Input
                  id="signup-password"
                  label="Password (min 6 characters)"
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
                      suppressHydrationWarning
                      className="text-[#646672] hover:text-[#18191D] pointer-events-auto p-1 focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded-lg"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>

              <div>
                <Input
                  id="signup-confirm-password"
                  label="Confirm Password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  leftIcon={<Lock className="h-4 w-4" />}
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
                  Create Applicant Account
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-[#F8F8EE] justify-center border-t border-[#E2E2D4] p-4 text-center">
            <p className="text-sm text-[#4B4D56]">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-bold text-[#1F5FBF] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
