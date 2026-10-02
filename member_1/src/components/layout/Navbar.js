"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Menu, 
  X, 
  ArrowRight,
  LogOut,
  User,
  Sliders,
  FileText,
  Bot,
  Award,
  Sparkles
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
    { name: "Passport", href: "/passport" },
    { name: "Documents", href: "/documents" },
    { name: "AI Assistant", href: "/assistant" },
    { name: "Scorecard", href: "/scorecard" },
    { name: "Demo Portal", href: "/demo" },
    ...(user ? [{ name: "Dashboard", href: "/dashboard" }] : []),
  ];

  const isActive = (path) => pathname === path;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FBFBEF]/95 backdrop-blur-md border-b border-[#E5E5D5]">
      {/* Skip to Main Content Link for Keyboard / Screen Reader Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-[#1E1F24] focus:text-white focus:px-5 focus:py-3 focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-[#1F5FBF] font-bold text-base"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo (Image 4) */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-3.5 group rounded-xl p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1F5FBF]"
              aria-label="PRAYAS - Return to homepage"
            >
              <img
                src="/images/prayas-logo.png"
                alt="PRAYAS - Making Every Job Application Accessible"
                className="h-11 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px] inline-flex items-center ${
                    active
                      ? "bg-[#2F9BE0] text-white shadow-sm"
                      : "text-[#18191D] hover:bg-[#EAEAD8] hover:text-black"
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
                    className="font-bold text-[#18191D] border-2 border-[#18191D] hover:bg-[#EAEAD8] rounded-xl flex items-center gap-2"
                  >
                    <User className="h-4 w-4 text-[#1F5FBF]" />
                    <span>{user.user_metadata?.full_name || user.email?.split("@")[0] || "Dashboard"}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleSignOut}
                  className="font-bold text-[#18191D] hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button 
                    variant="ghost" 
                    size="md" 
                    className="font-bold text-[#18191D] hover:bg-[#EAEAD8] rounded-xl"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    size="md"
                    rightIcon={<ArrowRight className="h-4 w-4 ml-1" />}
                    className="bg-[#1F5FBF] hover:bg-[#184EA6] text-white font-extrabold rounded-xl shadow-md border-0"
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
              className="inline-flex items-center justify-center p-3 rounded-xl text-[#18191D] hover:bg-[#EAEAD8] focus-visible:ring-4 focus-visible:ring-[#1F5FBF]"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              suppressHydrationWarning
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
        <div className="md:hidden border-t border-[#E5E5D5] bg-[#FBFBEF] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-colors flex items-center justify-between ${
                  isActive(link.href)
                    ? "bg-[#2F9BE0] text-white"
                    : "text-[#18191D] hover:bg-[#EAEAD8]"
                }`}
              >
                <span>{link.name}</span>
                <ArrowRight className="h-4 w-4 opacity-70" aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-[#E5E5D5] flex flex-col gap-2.5">
            {user ? (
              <>
                <div className="p-3 bg-[#F3F3E3] rounded-xl border border-[#E5E5D5] text-xs text-[#18191D]">
                  Signed in as: <strong className="text-black">{user.email}</strong>
                </div>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button size="md" className="w-full bg-[#1F5FBF] text-white font-bold rounded-xl">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="md" 
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} 
                  className="w-full text-rose-600 border-rose-300 hover:bg-rose-50 font-bold rounded-xl"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="outline" size="md" className="w-full font-bold border-2 border-[#18191D] rounded-xl">
                    Log In
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button size="md" className="w-full bg-[#1F5FBF] hover:bg-[#184EA6] text-white font-bold rounded-xl">
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
