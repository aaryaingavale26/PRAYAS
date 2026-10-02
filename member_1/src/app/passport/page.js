"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPassport, savePassport, DEFAULT_PASSPORT } from "@/lib/passportStorage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import {
  Sliders,
  User,
  Mail,
  Phone,
  MapPin,
  Keyboard,
  Mic,
  Eye,
  Sparkles,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Save,
  MousePointer,
  HelpCircle,
  FileCheck2,
  Lock
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
      // Focus first error field if any
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 p-8">
          <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base font-semibold text-slate-700">Loading your Accessibility Passport...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Title & Mission */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-2">
            <Sliders className="h-3.5 w-3.5" />
            <span>PRAYAS Core Module</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Accessibility Passport
          </h1>
          <p className="mt-1 text-slate-600 text-base max-w-2xl leading-relaxed">
            Configure your interaction, visual, and language preferences once. PRAYAS automatically injects these settings into every job application portal.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleExportJSON}
            leftIcon={<Download className="h-4 w-4" />}
            className="font-semibold text-xs sm:text-sm"
            title="Download JSON file to sync with Chrome extension"
          >
            Export JSON
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            className="bg-slate-900 hover:bg-slate-800 font-bold"
          >
            Save Passport
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {saveSuccess && (
        <div
          role="status"
          className="mb-8 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-base flex items-center justify-between shadow-sm animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Accessibility Passport successfully saved!</p>
              <p className="text-sm text-emerald-800">Your preferences are synced with your session and Chrome companion extension.</p>
            </div>
          </div>
          <Badge variant="success" className="hidden sm:inline-flex">Sync Active</Badge>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-base flex items-center gap-3 shadow-sm animate-in fade-in duration-200"
        >
          <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" aria-hidden="true" />
          <p className="font-semibold">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLUMNS: The Full Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-8">
          
          {/* 1. PERSONAL DETAILS SECTION */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Applicant Details</CardTitle>
                  <CardDescription>Primary information used to auto-populate job application header fields.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="passport-phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  leftIcon={<Phone className="h-4 w-4" />}
                  helperText="Format with country code if applicable"
                />
                <Input
                  id="passport-location"
                  label="Current City / Location"
                  placeholder="e.g. Bengaluru, India"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  leftIcon={<MapPin className="h-4 w-4" />}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. INTERACTION & ASSISTIVE TECH SECTION */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Preferred Interaction Method</CardTitle>
                  <CardDescription>Select the input modality you rely on most when filling forms online.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <fieldset>
                <legend className="text-sm font-bold text-slate-800 mb-3">
                  Select Primary Interaction Mode:
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
                        onClick={() => handleInputChange("preferredMethod", opt.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 min-h-[72px] cursor-pointer ${
                          isSelected
                            ? "border-teal-700 bg-teal-50/80 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{opt.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="border-t border-slate-100 pt-4 space-y-1">
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
            </CardContent>
          </Card>

          {/* 3. DISPLAY & CONTRAST SECTION */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Text Size & Contrast Preferences</CardTitle>
                  <CardDescription>Customize visual typography scale and contrast themes applied to application portals.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {/* Text Size Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Base Typography Scale
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "normal", label: "Normal (100%)", size: "text-sm" },
                    { id: "large", label: "Large (125%)", size: "text-base font-semibold" },
                    { id: "xlarge", label: "Extra Large (150%)", size: "text-lg font-bold" },
                  ].map((sizeOpt) => (
                    <button
                      key={sizeOpt.id}
                      type="button"
                      onClick={() => handleInputChange("textSize", sizeOpt.id)}
                      className={`p-3.5 rounded-xl border-2 text-center transition-all ${
                        formData.textSize === sizeOpt.id
                          ? "border-teal-700 bg-teal-50 text-teal-900 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                      aria-pressed={formData.textSize === sizeOpt.id}
                    >
                      <span className={sizeOpt.size}>{sizeOpt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrast Mode Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Contrast &amp; Theme Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "standard", label: "Standard Crisp", previewBg: "bg-white text-slate-900 border-slate-300" },
                    { id: "high-contrast", label: "High Navy/Teal", previewBg: "bg-slate-900 text-teal-300 border-teal-500" },
                    { id: "dark-contrast", label: "Dark High Contrast", previewBg: "bg-black text-white border-slate-500" },
                    { id: "yellow-on-black", label: "Yellow on Black", previewBg: "bg-black text-amber-300 border-amber-400" },
                  ].map((cOpt) => (
                    <button
                      key={cOpt.id}
                      type="button"
                      onClick={() => handleInputChange("contrast", cOpt.id)}
                      className={`p-3 rounded-xl border-2 text-center flex flex-col items-center gap-2 transition-all ${
                        formData.contrast === cOpt.id
                          ? "border-teal-700 ring-2 ring-teal-600/30 font-bold"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      aria-pressed={formData.contrast === cOpt.id}
                    >
                      <div className={`w-full py-2 px-2 rounded-md border text-xs font-bold ${cOpt.previewBg}`}>
                        Sample
                      </div>
                      <span className="text-xs text-slate-800">{cOpt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-1">
                <Toggle
                  id="passport-dyslexic-font"
                  label="Dyslexia-Friendly Letter Spacing"
                  description="Increases letter and line spacing to enhance character distinction and readability."
                  checked={formData.dyslexicFont}
                  onChange={(val) => handleInputChange("dyslexicFont", val)}
                />
                <Toggle
                  id="passport-reduced-motion"
                  label="Reduced Motion Mode"
                  description="Eliminates all layout transitions, sliding banners, and background animations."
                  checked={formData.reducedMotion}
                  onChange={(val) => handleInputChange("reducedMotion", val)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. COGNITIVE & LANGUAGE PREFERENCES */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Cognitive &amp; Language Assistance</CardTitle>
                  <CardDescription>AI tools to clarify ambiguous questions and reduce cognitive load.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-2">
              <Toggle
                id="passport-simplified-lang"
                label="Simplified Language (Plain-English AI Explainer)"
                description="Translates complex corporate jargon and multi-clause job questions into straightforward bullet points."
                checked={formData.simplifiedLanguage}
                onChange={(val) => handleInputChange("simplifiedLanguage", val)}
              />
              <Toggle
                id="passport-step-by-step"
                label="Step-by-Step Form Focus"
                description="Hides overwhelming 30-field pages and focuses on one input section at a time."
                checked={formData.stepByStepForm}
                onChange={(val) => handleInputChange("stepByStepForm", val)}
              />
              <Toggle
                id="passport-extended-time"
                label="Extended Time Accommodation Alerts"
                description="Automatically notifies hiring portals and prompts for timer pauses on timed candidate assessments."
                checked={formData.extendedTime}
                onChange={(val) => handleInputChange("extendedTime", val)}
              />
            </CardContent>
          </Card>

          {/* 5. OPTIONAL ACCOMMODATION DISCLOSURE */}
          <Card className="border-slate-200 shadow-sm bg-slate-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                    5
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <span>Optional Accommodation Note</span>
                      <Badge variant="teal">100% Optional</Badge>
                    </CardTitle>
                    <CardDescription>
                      Share specific accommodations you need for interviews (e.g., ASL interpreter, live captions).
                    </CardDescription>
                  </div>
                </div>
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy Safeguard:</strong> This information is stored privately and is never shared without your explicit consent.
                </span>
              </div>

              <Toggle
                id="passport-share-notes"
                label="Include Accommodation Request in Application Notes"
                description="When enabled, PRAYAS appends a polite standard accommodation note to employer cover forms."
                checked={formData.shareAccommodations}
                onChange={(val) => handleInputChange("shareAccommodations", val)}
              />

              {formData.shareAccommodations && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label htmlFor="custom-notes" className="block text-sm font-bold text-slate-800">
                    Custom Interview Accommodations Description
                  </label>
                  <textarea
                    id="custom-notes"
                    rows={3}
                    placeholder="e.g. 'I will require real-time captioning or a quiet environment for technical interview sessions.'"
                    value={formData.accommodationNotes}
                    onChange={(e) => handleInputChange("accommodationNotes", e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-300 p-3 text-sm text-slate-900 focus:border-teal-600 hover:border-slate-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleReset}
              leftIcon={<RotateCcw className="h-4 w-4" />}
              className="text-slate-600 hover:text-rose-600 font-semibold text-sm"
            >
              Reset to Defaults
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={saving}
              leftIcon={<Save className="h-5 w-5" />}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 font-bold px-8"
            >
              Save All Passport Preferences
            </Button>
          </div>
        </form>

        {/* RIGHT COLUMN: Live Digital Passport Card Preview */}
        <div className="space-y-6">
          <div className="sticky top-28">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>Live Passport Badge Preview</span>
            </h2>

            <Card className="border-2 border-slate-900 bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-black text-sm">
                    P3
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base tracking-tight">PRAYAS PASSPORT</h3>
                    <p className="text-[10px] uppercase font-semibold text-teal-400">Universal Job Profile</p>
                  </div>
                </div>
                <Badge variant="teal" className="bg-teal-900/80 text-teal-300 border-teal-600 font-bold">
                  Active
                </Badge>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">APPLICANT</span>
                  <p className="text-base font-bold text-white mt-0.5">
                    {formData.fullName || "Unspecified Candidate"}
                  </p>
                  <p className="text-xs text-slate-300">{formData.email || "No email provided"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Interaction Mode</span>
                    <span className="font-semibold text-teal-300 capitalize mt-0.5 block">
                      {formData.preferredMethod.replace("-", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Text Scale</span>
                    <span className="font-semibold text-teal-300 capitalize mt-0.5 block">
                      {formData.textSize}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">
                    Active Accommodations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.voiceAssist && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-200">
                        Voice Assist
                      </span>
                    )}
                    {formData.keyboardNav && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-200">
                        Keyboard Nav
                      </span>
                    )}
                    {formData.simplifiedLanguage && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-200">
                        Plain English AI
                      </span>
                    )}
                    {formData.extendedTime && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-200">
                        Extended Time
                      </span>
                    )}
                    {formData.dyslexicFont && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-200">
                        Dyslexia Spacing
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Verified for Chrome Extension</span>
                <span className="font-mono text-teal-400 text-[10px]">PRAYAS-v3</span>
              </div>
            </Card>

            {/* Quick Tip Box */}
            <div className="mt-4 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-700" />
                <span>Next Step: Document Hub</span>
              </p>
              <p className="text-slate-600 leading-relaxed">
                After configuring your passport, upload your resumes so PRAYAS can pair your interaction preferences with personalized AI answers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
