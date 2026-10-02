import React from "react";
import Link from "next/link";
import { Accessibility, Shield, CheckCircle2, Heart, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200 border-t border-slate-800" role="contentinfo" aria-label="Site Footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                <Accessibility className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                PRAYAS <span className="text-teal-400">3.0</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              Empowering people with disabilities to navigate, complete, and submit job applications independently on any web platform with AI-driven accessibility adaptation.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-teal-300 border border-teal-800/60">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                WCAG 2.2 AA/AAA Compliant Design
              </span>
            </div>
          </div>

          {/* Col 2: Core Platform */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Platform Features
            </h3>
            <ul className="space-y-3 text-sm text-slate-300" role="list">
              <li>
                <Link href="/passport" className="hover:text-teal-300 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
                  Accessibility Passport
                </Link>
              </li>
              <li>
                <Link href="/documents" className="hover:text-teal-300 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
                  Document Hub & RAG
                </Link>
              </li>
              <li>
                <Link href="/scorecard" className="hover:text-teal-300 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
                  Accessibility Scorecard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal-300 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
                  Applicant Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Accessibility & Assistance */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Accessibility
            </h3>
            <ul className="space-y-3 text-sm text-slate-300" role="list">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                <span>Keyboard Navigable (Tab & Esc)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                <span>High Contrast Mode Support</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                <span>Screen Reader ARIA Optimized</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                <span>Voice Navigation Enabled</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 PRAYAS 3.0. Built for accessibility and inclusive hiring opportunities.</p>
          <div className="flex items-center gap-2">
            <span>Built with precision for 36-Hour Hackathon</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
