"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPassport, savePassport, DEFAULT_PASSPORT } from "@/lib/passportStorage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import {
  Sliders,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  Code,
  Link2,
  FileCheck,
  Keyboard,
  Mic,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Save,
  MousePointer,
  Check,
  ArrowRight
} from "lucide-react";

export default function PassportPage() {
  const { user } = useAuth();

  const [formData, setFormData] = useState(DEFAULT_PASSPORT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Load initial passport data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getPassport(user?.id);
        
        // If user is logged in and fields are empty, prefill from auth
        if (user) {
          if (!data.fullName && user.user_metadata?.full_name) {
            data.fullName = user.user_metadata.full_name;
          }
          if (!data.email && user.email) {
            data.email = user.email;
          }
        }
        setFormData(data);
      } catch (err) {
        console.error("Failed to load passport", err);
        setErrorMessage("Could not load your saved passport. Using defaults.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Handle text input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required for your applicant profile.";
    }
    if (!formData.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save handler
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSaveSuccess(false);

    if (!validateForm()) {
      setErrorMessage("Please correct the errors in the form before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      await savePassport(formData, user?.id);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (err) {
      setErrorMessage("An error occurred while saving your passport. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Reset handler
  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all preferences to default values?")) {
      setFormData({
        ...DEFAULT_PASSPORT,
        fullName: user?.user_metadata?.full_name || "",
        email: user?.email || "",
      });
      setSaveSuccess(false);
      setErrorMessage("");
    }
  };

  // Export JSON handler for Chrome Extension / offline backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `prayas-passport-${formData.fullName || "applicant"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Calculate profile completeness score
  const completenessItems = [
    Boolean(formData.fullName),
    Boolean(formData.email),
    Boolean(formData.phone),
    Boolean(formData.location),
    Boolean(formData.dob),
    Boolean(formData.education),
    Boolean(formData.skills),
    Boolean(formData.workExperience),
    Boolean(formData.idDetails),
    Boolean(formData.preferredMethod),
  ];
  const completenessPct = Math.round((completenessItems.filter(Boolean).length / completenessItems.length) * 100);

  const interactionOptions = [
    {
      id: "keyboard-only",
      title: "Keyboard Only",
      desc: "Full tabbing, skip shortcuts & arrow key navigation",
      icon: Keyboard,
    },
    {
      id: "voice-control",
      title: "Voice & Speech",
      desc: "Voice commands, speech-to-text & dictation",
      icon: Mic,
    },
    {
      id: "screen-reader",
      title: "Screen Reader",
      desc: "High-contrast ARIA landmarks & verbose announcements",
      icon: Sparkles,
    },
    {
      id: "mouse-pointer",
      title: "Mouse & Pointer",
      desc: "Large clickable buttons & cursor aids",
      icon: MousePointer,
    },
    {
      id: "standard",
      title: "Hybrid / Standard",
      desc: "Balanced inputs with assistive AI overlay",
      icon: Sliders,
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 p-8">
          <div className="h-8 w-8 border-4 border-[#1F5FBF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base font-semibold text-[#18191D]">Loading your Accessibility Passport...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-8">
      
      {/* 1. IMAGE 1 FOLDER-TAB SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="folder-tab-header">
          <span>ACCESSIBILITY PASSPORT</span>
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="text-xs font-bold text-[#646672] uppercase tracking-wider">
          PORTABLE CANDIDATE PROFILE
        </div>
      </div>

      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E2E2D4]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#18191D] tracking-tight">
            Universal Profile &amp; Preferences
          </h1>
          <p className="mt-1 text-[#4B4D56] text-sm sm:text-base max-w-2xl leading-relaxed">
            Configure your interaction, education, and accommodation preferences once. The PRAYAS Extension automatically syncs these details into employer job applications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleExportJSON}
            leftIcon={<Download className="h-4 w-4" />}
            className="font-bold text-xs sm:text-sm"
          >
            Export JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            className="font-bold text-xs sm:text-sm"
          >
            Save Passport
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {saveSuccess && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#D1FAE5] border-2 border-[#A7F3D0] text-[#065F46] text-base flex items-center justify-between shadow-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-[#059669] shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Accessibility Passport successfully saved!</p>
              <p className="text-sm text-[#047857]">Your profile data and preferences are synced with your Chrome Companion Extension.</p>
            </div>
          </div>
          <Badge variant="success" className="hidden sm:inline-flex">Sync Active</Badge>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FEE2E2] border-2 border-[#FECACA] text-[#991B1B] text-base flex items-center gap-3 shadow-xs animate-in fade-in duration-200"
        >
          <AlertCircle className="h-6 w-6 text-[#DC2626] shrink-0" aria-hidden="true" />
          <p className="font-semibold">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: Form Sections */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-8">
          
          {/* SECTION 1: CANDIDATE IDENTITY & CONTACT (Structured Data for Autofill) */}
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">1. Candidate Identity &amp; Contact Details</span>
              </div>
              <span className="text-[11px] font-bold text-[#2F9BE0]">Core Autofill</span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="passport-name"
                  label="Full Name"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  error={fieldErrors.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  leftIcon={<User className="h-4 w-4" />}
                />
                <Input
                  id="passport-email"
                  label="Email Address"
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={formData.email}
                  error={fieldErrors.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  id="passport-phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  leftIcon={<Phone className="h-4 w-4" />}
                />
                <Input
                  id="passport-dob"
                  label="Date of Birth"
                  type="date"
                  value={formData.dob || ""}
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  leftIcon={<Calendar className="h-4 w-4" />}
                />
                <Input
                  id="passport-location"
                  label="City, State / Country"
                  placeholder="e.g. Bengaluru, India"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  leftIcon={<MapPin className="h-4 w-4" />}
                />
              </div>

              <div>
                <Input
                  id="passport-address"
                  label="Street Address / Postal Code"
                  placeholder="e.g. 124 Park Avenue, Indiranagar, Bengaluru 560038"
                  value={formData.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  leftIcon={<MapPin className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: EDUCATION, EXPERIENCE & SKILLS (Structured RAG Data) */}
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">2. Education, Experience &amp; Professional Qualifications</span>
              </div>
              <span className="text-[11px] font-bold text-[#065F46]">Autofill + AI Draft</span>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="passport-education" className="block text-sm font-bold text-[#18191D] mb-1">
                  Highest Degree &amp; Education Details
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute top-3 left-3 text-[#646672]">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <textarea
                    id="passport-education"
                    rows={2}
                    placeholder="e.g. B.Tech in Computer Science from National Institute of Technology (2018 - 2022). GPA: 8.9/10."
                    value={formData.education || ""}
                    onChange={(e) => handleInputChange("education", e.target.value)}
                    className="w-full rounded-xl border-2 border-[#D5D5C8] pl-10 pr-4 py-2.5 text-sm text-[#18191D] focus:border-[#1F5FBF] hover:border-[#18191D]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="passport-skills" className="block text-sm font-bold text-[#18191D] mb-1">
                  Core Skills &amp; Competencies
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute top-3 left-3 text-[#646672]">
                    <Code className="h-4 w-4" />
                  </div>
                  <textarea
                    id="passport-skills"
                    rows={2}
                    placeholder="e.g. JavaScript, React, Python, Web Accessibility (WCAG 2.2 AA), ARIA, Node.js, Next.js, Git."
                    value={formData.skills || ""}
                    onChange={(e) => handleInputChange("skills", e.target.value)}
                    className="w-full rounded-xl border-2 border-[#D5D5C8] pl-10 pr-4 py-2.5 text-sm text-[#18191D] focus:border-[#1F5FBF] hover:border-[#18191D]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="passport-experience" className="block text-sm font-bold text-[#18191D] mb-1">
                  Work Experience Summary
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute top-3 left-3 text-[#646672]">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <textarea
                    id="passport-experience"
                    rows={3}
                    placeholder="e.g. Frontend Engineer at TechCorp (2022 - Present, 2+ yrs). Built accessible design systems, improved WCAG compliance from 64% to 98%."
                    value={formData.workExperience || ""}
                    onChange={(e) => handleInputChange("workExperience", e.target.value)}
                    className="w-full rounded-xl border-2 border-[#D5D5C8] pl-10 pr-4 py-2.5 text-sm text-[#18191D] focus:border-[#1F5FBF] hover:border-[#18191D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Input
                  id="passport-portfolio"
                  label="Portfolio URL"
                  placeholder="https://myportfolio.dev"
                  value={formData.portfolioUrl || ""}
                  onChange={(e) => handleInputChange("portfolioUrl", e.target.value)}
                  leftIcon={<Link2 className="h-4 w-4" />}
                />
                <Input
                  id="passport-linkedin"
                  label="LinkedIn Profile"
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedinUrl || ""}
                  onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                  leftIcon={<Link2 className="h-4 w-4" />}
                />
                <Input
                  id="passport-github"
                  label="GitHub / Code URL"
                  placeholder="https://github.com/username"
                  value={formData.githubUrl || ""}
                  onChange={(e) => handleInputChange("githubUrl", e.target.value)}
                  leftIcon={<Code className="h-4 w-4" />}
                />
              </div>

              <div className="pt-2">
                <Input
                  id="passport-id-details"
                  label="Passport / National ID Details (for Verification)"
                  placeholder="e.g. Passport No. Z1234567 / Aadhaar / Gov ID"
                  value={formData.idDetails || ""}
                  onChange={(e) => handleInputChange("idDetails", e.target.value)}
                  leftIcon={<FileCheck className="h-4 w-4" />}
                  helperText="Stored locally and encrypted for identity verification on corporate employer forms."
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: INTERACTION MODALITY */}
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">3. Primary Interaction Mode</span>
              </div>
              <span className="text-[11px] font-bold text-[#2F9BE0]">Assistive Layer</span>
            </div>

            <div className="p-6 space-y-6">
              <fieldset>
                <legend className="text-sm font-bold text-[#18191D] mb-3">
                  Select Your Preferred Form Filling Mode:
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                  {interactionOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = formData.preferredMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        suppressHydrationWarning
                        onClick={() => handleInputChange("preferredMethod", opt.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 min-h-[72px] cursor-pointer ${
                          isSelected
                            ? "border-[#1F5FBF] bg-[#D4F1FE] shadow-sm"
                            : "border-[#E2E2D4] hover:border-[#2F9BE0] bg-white"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-[#1F5FBF] text-white" : "bg-[#F3F3E3] text-[#18191D]"
                          }`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#18191D]">{opt.title}</p>
                          <p className="text-xs text-[#4B4D56] mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="border-t border-[#E2E2D4] pt-4 space-y-1">
                <Toggle
                  id="passport-voice-assist"
                  label="Voice Assistance & Speech-to-Text"
                  description="Inject a voice microphone icon onto every long-form text area for hands-free dictation."
                  checked={formData.voiceAssist}
                  onChange={(val) => handleInputChange("voiceAssist", val)}
                />
                <Toggle
                  id="passport-keyboard-nav"
                  label="Enhanced Keyboard Navigation"
                  description="Bypass modal tab-traps and enable single-key shortcuts (J/K next field, Space select)."
                  checked={formData.keyboardNav}
                  onChange={(val) => handleInputChange("keyboardNav", val)}
                />
                <Toggle
                  id="passport-autofocus"
                  label="Auto-Focus Application Fields"
                  description="Immediately place keyboard focus on the next required empty input on step advance."
                  checked={formData.autoFocusForms}
                  onChange={(val) => handleInputChange("autoFocusForms", val)}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: COGNITIVE, DISPLAY & ACCOMMODATION NOTES */}
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">4. Accommodations &amp; Visual Settings</span>
              </div>
              <span className="text-[11px] font-bold text-[#0284C7]">WCAG 2.2</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <Toggle
                  id="passport-simplified-lang"
                  label="Simplified Language (Plain-English AI Explainer)"
                  description="Translates complex corporate jargon and multi-clause questions into straightforward bullet points."
                  checked={formData.simplifiedLanguage}
                  onChange={(val) => handleInputChange("simplifiedLanguage", val)}
                />
                <Toggle
                  id="passport-extended-time"
                  label="Extended Time Accommodation Alerts"
                  description="Automatically notifies hiring portals and prompts for timer pauses on timed candidate assessments."
                  checked={formData.extendedTime}
                  onChange={(val) => handleInputChange("extendedTime", val)}
                />
                <Toggle
                  id="passport-dyslexic-font"
                  label="Dyslexia-Friendly Letter Spacing"
                  description="Increases character and line spacing to enhance distinct readability."
                  checked={formData.dyslexicFont}
                  onChange={(val) => handleInputChange("dyslexicFont", val)}
                />
              </div>

              {/* Accommodation Notes */}
              <div className="border-t border-[#E2E2D4] pt-4 space-y-3">
                <Toggle
                  id="passport-share-notes"
                  label="Include Accommodation Request in Application Notes"
                  description="When enabled, PRAYAS appends a polite standard accommodation note to employer cover forms."
                  checked={formData.shareAccommodations}
                  onChange={(val) => handleInputChange("shareAccommodations", val)}
                />

                {formData.shareAccommodations && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label htmlFor="custom-notes" className="block text-sm font-bold text-[#18191D]">
                      Custom Interview Accommodations Description
                    </label>
                    <textarea
                      id="custom-notes"
                      rows={3}
                      placeholder="e.g. 'I require live captions and an accessible screen-reader-friendly code environment for technical interview sessions.'"
                      value={formData.accommodationNotes || ""}
                      onChange={(e) => handleInputChange("accommodationNotes", e.target.value)}
                      className="w-full rounded-xl border-2 border-[#D5D5C8] p-3 text-sm text-[#18191D] focus:border-[#1F5FBF] hover:border-[#18191D]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleReset}
              leftIcon={<RotateCcw className="h-4 w-4" />}
              className="text-[#646672] hover:text-rose-600 font-bold text-sm"
            >
              Reset to Defaults
            </Button>

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              isLoading={saving}
              leftIcon={<Save className="h-5 w-5" />}
              className="w-full sm:w-auto font-black px-8"
            >
              Save All Passport Preferences
            </Button>
          </div>
        </form>

        {/* RIGHT COLUMN: Live Digital Passport Card (Image 1 Charcoal Aesthetic) */}
        <div className="space-y-6">
          <div className="sticky top-28 space-y-6">
            
            {/* Completeness Stat Badge */}
            <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="circular-stat-badge w-18 h-18 shrink-0 bg-[#E8E8DC]">
                <span className="font-display text-2xl font-black text-[#18191D]">
                  {completenessPct}%
                </span>
                <span className="text-[9px] font-black text-[#646672] uppercase">COMPLETED</span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Profile Ready</span>
                <span className="font-display text-sm font-bold text-[#18191D] truncate block">
                  {completenessPct >= 80 ? "Autofill Optimized" : "Needs More Details"}
                </span>
                <span className="text-[11px] text-[#2F9BE0] font-bold block mt-0.5">
                  10 Key Attributes Tracked
                </span>
              </div>
            </div>

            {/* Live Card Preview */}
            <div className="bg-[#18191D] border-2 border-[#2C2D35] rounded-3xl text-white shadow-xl overflow-hidden">
              <div className="p-6 border-b border-[#2C2D35] flex items-center justify-between bg-[#121316]">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#2F9BE0] flex items-center justify-center text-white font-black text-sm">
                    P
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base tracking-tight">PRAYAS PASSPORT</h3>
                    <p className="text-[10px] uppercase font-bold text-[#2F9BE0] tracking-wider">Portable Candidate Card</p>
                  </div>
                </div>
                <Badge variant="blue" className="bg-[#2F9BE0] text-white border-transparent font-bold">
                  Active
                </Badge>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div>
                  <span className="text-[10px] font-bold text-[#A0A2AB] block uppercase tracking-wider">APPLICANT</span>
                  <p className="font-display text-lg font-black text-white mt-0.5">
                    {formData.fullName || "Unspecified Candidate"}
                  </p>
                  <p className="text-xs text-[#A0A2AB]">{formData.email || "No email provided"}</p>
                  {formData.phone && <p className="text-xs text-[#A0A2AB]">{formData.phone}</p>}
                </div>

                {formData.education && (
                  <div className="pt-2 border-t border-[#2C2D35]">
                    <span className="text-[10px] font-bold text-[#A0A2AB] block uppercase tracking-wider">Education</span>
                    <p className="text-xs text-white font-medium line-clamp-2 mt-0.5">{formData.education}</p>
                  </div>
                )}

                {formData.skills && (
                  <div className="pt-2 border-t border-[#2C2D35]">
                    <span className="text-[10px] font-bold text-[#A0A2AB] block uppercase tracking-wider">Skills</span>
                    <p className="text-xs text-[#2F9BE0] font-medium line-clamp-2 mt-0.5">{formData.skills}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2C2D35] text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#A0A2AB] block uppercase tracking-wider">Mode</span>
                    <span className="font-bold text-[#2F9BE0] capitalize mt-0.5 block">
                      {formData.preferredMethod?.replace("-", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#A0A2AB] block uppercase tracking-wider">City</span>
                    <span className="font-bold text-white capitalize mt-0.5 block truncate">
                      {formData.location || "Not Set"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2C2D35]">
                  <span className="text-[10px] font-bold text-[#A0A2AB] block uppercase tracking-wider mb-2">
                    Active Accommodations
                  </span>
                  <div className="space-y-1.5">
                    {formData.voiceAssist && (
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <Check className="h-3.5 w-3.5 text-[#2F9BE0] stroke-[3]" />
                        <span>Voice Dictation &amp; Read-Aloud</span>
                      </div>
                    )}
                    {formData.keyboardNav && (
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <Check className="h-3.5 w-3.5 text-[#2F9BE0] stroke-[3]" />
                        <span>Enhanced Keyboard Navigation</span>
                      </div>
                    )}
                    {formData.simplifiedLanguage && (
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <Check className="h-3.5 w-3.5 text-[#2F9BE0] stroke-[3]" />
                        <span>Plain-English AI Explainer</span>
                      </div>
                    )}
                    {formData.extendedTime && (
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <Check className="h-3.5 w-3.5 text-[#2F9BE0] stroke-[3]" />
                        <span>Extended Time Accommodation</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#121316] border-t border-[#2C2D35] flex items-center justify-between text-[11px] text-[#A0A2AB]">
                <span className="font-semibold">Synced with Chrome Companion</span>
                <span className="font-mono text-[#2F9BE0] text-[10px] font-bold">PRAYAS 3.0</span>
              </div>
            </div>

            {/* Quick Companion Box */}
            <div className="p-5 rounded-2xl bg-[#CEEEFD] border-2 border-[#BAE6FD] text-[#18191D] space-y-2">
              <p className="font-display font-extrabold text-sm text-[#0284C7] flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Next Step: Upload Resumes</span>
              </p>
              <p className="text-xs text-[#0369A1] leading-relaxed">
                Now head to the <strong>Document Hub</strong> to upload your CV and cover letters so PRAYAS can draft personalized answers to open questions.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
