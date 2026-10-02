"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Menu, 
  X, 
  Sparkles, 
  ArrowRight,
  Accessibility,
  LogOut,
  User,
  LayoutDashboard,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Accessibility Passport", href: "/passport" },
    { name: "Document Hub", href: "/documents" },
    { name: "AI Assistant", href: "/assistant" },
    { name: "Scorecard", href: "/scorecard" },
    ...(user ? [{ name: "Dashboard", href: "/dashboard" }] : []),
  ];

  const isActive = (path) => pathname === path;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Skip to Main Content Link for Keyboard / Screen Reader Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-slate-900 focus:text-white focus:px-5 focus:py-3 focus:rounded-lg focus:shadow-xl focus:ring-4 focus:ring-teal-500 font-semibold text-base"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg p-1"
              aria-label="PRAYAS 3.0 - Return to homepage"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-slate-900 to-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-900/10 group-hover:scale-105 transition-transform">
                <Accessibility className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tight text-slate-900">
                    PRAYAS<span className="text-teal-600">.</span>AI
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                    v3.0
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500 -mt-1">
                  Accessible Job Application Assistant
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] inline-flex items-center ${
                    active
                      ? "bg-slate-100 text-teal-800 font-bold border-b-2 border-teal-600"
                      : "text-slate-700 hover:text-slate-950 hover:bg-slate-100/70"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* CTA & Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="md"
                    className="font-semibold text-slate-800 flex items-center gap-2"
                  >
                    <User className="h-4 w-4 text-teal-700" />
                    <span>{user.user_metadata?.full_name || user.email?.split("@")[0] || "Dashboard"}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleSignOut}
                  className="font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="md" className="font-semibold text-slate-700">
                    Log In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<ArrowRight className="h-4 w-4 ml-1" />}
                    className="bg-slate-900 hover:bg-slate-800 font-semibold"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-3 rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-base font-semibold transition-colors flex items-center justify-between ${
                  isActive(link.href)
                    ? "bg-teal-50 text-teal-800 font-bold border-l-4 border-teal-600"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{link.name}</span>
                <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-200 flex flex-col gap-2.5">
            {user ? (
              <>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                  Signed in as: <strong className="text-slate-900">{user.email}</strong>
                </div>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="primary" size="md" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="md" onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} className="w-full text-rose-600 border-rose-200 hover:bg-rose-50">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="outline" size="md" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="primary" size="md" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
