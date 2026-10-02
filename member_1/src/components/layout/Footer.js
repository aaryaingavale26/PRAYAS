import React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#18191D] text-[#E2E2D6] border-t border-[#2C2D35]" role="contentinfo" aria-label="Site Footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Col 1: Brand & Tagline with Image 4 Logo */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-md inline-block">
                <img
                  src="/images/prayas-logo.png"
                  alt="PRAYAS Logo - Making Every Job Application Accessible"
                  className="h-9 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              Empowering job seekers with disabilities to navigate existing job portals with confidence, autonomy, and zero barriers through voice calls, live ARIA repairs, and document-grounded AI.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#2C2D35] text-[#2F9BE0] border border-[#2F9BE0]/40">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#2F9BE0]" aria-hidden="true" />
                WCAG 2.2 AA Accessible • 100% Keyboard Navigable
              </span>
            </div>
          </div>

          {/* Col 2: Core Platform Links */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2F9BE0] mb-4">
              Platform Modules
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300 font-medium" role="list">
              <li>
                <Link href="/passport" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded">
                  Accessibility Passport
                </Link>
              </li>
              <li>
                <Link href="/documents" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded">
                  Document Hub & RAG
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded">
                  AI Q&A Assistant
                </Link>
              </li>
              <li>
                <Link href="/scorecard" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded">
                  Accessibility Scorecard
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded">
                  Controlled Testbed Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Assistive Architecture */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2F9BE0] mb-4">
              Assistive Features
            </h3>
            <ul className="space-y-2 text-sm text-slate-300" role="list">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2F9BE0]"></span>
                <span>Natural Voice Call Engine</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2F9BE0]"></span>
                <span>Non-Destructive ARIA Repairs</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2F9BE0]"></span>
                <span>Consent-Gated Autofill</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2F9BE0]"></span>
                <span>Zero Auto-Submission Guarantee</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2F9BE0]"></span>
                <span>Strict Anti-Hallucination Guard</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#2C2D35] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 PRAYAS 3.0 • Team ByteShastra (PS003). Making Every Job Application Accessible.</p>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-[#2F9BE0]">Warm Cream & Grotesque Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
