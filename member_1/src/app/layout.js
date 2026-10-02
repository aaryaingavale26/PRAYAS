import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "PRAYAS 3.0 | AI-Powered Accessible Job Application Assistant",
  description:
    "Helping individuals with disabilities apply for jobs frictionlessly across any web platform with AI answer generation, Accessibility Passports, and real-time accessibility auditing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <AuthProvider>
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
