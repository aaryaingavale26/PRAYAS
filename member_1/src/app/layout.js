import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import PrayasIntro from "@/components/ui/PrayasIntro";

export const metadata = {
  title: "PRAYAS 3.0 — Making Every Job Application Accessible",
  description:
    "Empowering candidates with disabilities to navigate, draft, and complete job applications frictionlessly with voice control, Accessibility Passports, and grounded AI assistance.",
  icons: {
    icon: "/favicon.ico",
    apple: "/images/prayas-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-[#FBFBEF] text-[#18191D] antialiased selection:bg-[#2F9BE0] selection:text-white" suppressHydrationWarning>
        <AuthProvider>
          <PrayasIntro />
          {/* Thin top header strip with small uppercase labels as in Image 1 */}
          <div className="portfolio-header-strip bg-[#F5F5E7]">
            <span className="tracking-widest font-black text-slate-700">PRAYAS 3.0</span>
            <span className="hidden sm:inline-block font-semibold text-slate-500">
              ACCESSIBLE JOB APPLICATION ASSISTANT • EMPOWERING INDEPENDENCE
            </span>
            <span className="font-bold text-slate-700">2026 EDITION</span>
          </div>

          <Navbar />

          <main id="main-content" className="flex-1 flex flex-col focus:outline-none" tabIndex={-1}>
            {children}
          </main>

          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
