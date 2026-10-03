"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { CvReviewPanel } from "@/components/CvReviewPanel";
import { useOnboardingStatus } from "@/lib/useOnboardingStatus";
import { validateFile } from "@/lib/documentService";
import { cachePassport } from "@/lib/passportStorage";
import { confirmCvDetails, skipOnboarding, uploadCv } from "@/lib/apiClient";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { status, loading: statusLoading, supported } = useOnboardingStatus(user);

  const [stage, setStage] = useState("upload"); // upload | uploading | reading | review | fallback
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const headingRef = useRef(null);

  // Route guards
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/auth/login?redirect=/onboarding");
  }, [authLoading, user, router]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stage]);

  const goDashboard = useCallback(() => router.push("/dashboard"), [router]);

  const handleSkip = async () => {
    try {
      if (supported) await skipOnboarding();
    } catch (e) {
      /* skipping must never block the user */
    }
    goDashboard();
  };

  const processFile = async (file) => {
    setError("");
    const problem = validateFile(file);
    if (problem) {
      setError(problem);
      setAnnounce(`Error: ${problem}`);
      return;
    }
    try {
      setStage("uploading");
      setProgress(0);
      setAnnounce(`Uploading ${file.name}`);
      const res = await uploadCv(file, (pct, phase) => {
        setProgress(pct);
        if (phase === "processing") {
          setStage("reading");
          setAnnounce("Reading your CV");
        }
      });
      setResult(res);
      // Auto-fill passport cache immediately from CV
      if (res?.passport || res?.proposed || res?.current_passport) {
        cachePassport(res.passport || res.proposed || res.current_passport, user?.id);
      }
      if (res.extraction_failed) {
        setStage("fallback");
        setAnnounce("We saved your CV but could not read your details automatically.");
      } else {
        setStage("review");
        setAnnounce("Your details have been read from your CV and auto-filled into your passport.");
      }
    } catch (err) {
      setStage("upload");
      const msg = err?.message || "Something went wrong while uploading. Please try again.";
      setError(msg);
      setAnnounce(`Error: ${msg}`);
    }
  };

  const onConfirm = async ({ fields, overwriteFields, destination = "dashboard" }) => {
    setSaving(true);
    setError("");
    try {
      const res = await confirmCvDetails({
        fields,
        overwriteFields,
        documentId: result?.document_id,
        extractedProfile: result?.extracted_profile,
      });
      cachePassport(res.passport, user?.id);
      setAnnounce("Saved. Taking you to your destination.");
      if (destination === "passport") {
        router.push("/passport");
      } else {
        goDashboard();
      }
    } catch (err) {
      setError(err?.message || "We couldn't save your details. Please try again.");
      setAnnounce("Saving failed.");
    } finally {
      setSaving(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const busy = stage === "uploading" || stage === "reading";

  if (authLoading || !user || statusLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FBFBEF] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F5FBF]" aria-label="Loading" />
      </div>
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-[#FBFBEF]" aria-labelledby="onb-title">
      {/* Polite live region for screen readers: progress & results */}
      <div className="sr-only" aria-live="polite" role="status">{announce}</div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="folder-tab-header">
          <span>Welcome to PRAYAS</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="bg-[#1E1F24] text-[#F8F8F0] rounded-b-3xl rounded-tr-3xl border-2 border-[#2C2D35] p-6 sm:p-10 shadow-2xl">
          <h1
            id="onb-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl sm:text-5xl font-black tracking-tight leading-[1.05] outline-none"
          >
            {stage === "review"
              ? "Review your details"
              : stage === "fallback"
              ? "CV saved. Let's finish by hand"
              : "Upload your CV/Resume to get started"}
          </h1>

          {(stage === "upload" || busy) && (
            <p className="mt-3 text-[#C9CAD2] text-sm sm:text-base max-w-xl">
              PRAYAS reads your CV to fill your passport and to answer application questions from <em>your</em> real
              experience. Your files stay private to your account.
            </p>
          )}

          {error && (
            <div role="alert" className="mt-6 p-4 rounded-2xl bg-[#FEE2E2] border-2 border-[#FECACA] text-[#991B1B] text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {!supported && stage === "upload" && (
            <div role="status" className="mt-6 p-4 rounded-2xl bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#92400E] text-sm font-semibold">
              We couldn&apos;t connect your verified account to the PRAYAS server, so CV upload isn&apos;t available right now.
              You can continue to the dashboard and upload later.
            </div>
          )}

          {stage === "upload" && (
            <div className="mt-8">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
                  dragging ? "border-[#2F9BE0] bg-[#2F9BE0]/15" : "border-[#4B4D56] bg-[#18191D]"
                }`}
              >
                <div className="h-16 w-16 mx-auto rounded-2xl bg-[#2F9BE0] text-white flex items-center justify-center mb-4">
                  <UploadCloud className="h-8 w-8" aria-hidden="true" />
                </div>
                <p className="font-display text-xl font-extrabold">Drag &amp; drop your CV here</p>
                <p className="text-sm text-[#9A9CA8] mt-1">or</p>
                <input
                  ref={inputRef}
                  id="cv-file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="sr-only"
                  aria-describedby="cv-hint"
                  disabled={!supported}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="blue"
                  size="lg"
                  className="mt-3"
                  disabled={!supported}
                  onClick={() => inputRef.current?.click()}
                  leftIcon={<FileText className="h-5 w-5" />}
                  aria-label="Browse files to upload your CV or resume"
                >
                  Browse files
                </Button>
                <p id="cv-hint" className="mt-4 text-xs text-[#9A9CA8]">
                  PDF, DOCX or TXT · up to 10 MB
                </p>
              </div>
            </div>
          )}

          {busy && (
            <div className="mt-8 rounded-3xl bg-[#18191D] border border-[#2C2D35] p-6">
              <div className="flex items-center gap-3 font-bold">
                <Loader2 className="h-5 w-5 animate-spin text-[#2F9BE0]" aria-hidden="true" />
                <span>{stage === "reading" ? "Reading your CV..." : "Uploading..."}</span>
              </div>
              <div
                className="mt-4 h-3 rounded-full bg-[#2C2D35] overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={stage === "reading" ? 100 : progress}
                aria-label="CV upload progress"
              >
                <div
                  className={`h-3 rounded-full bg-[#2F9BE0] transition-all duration-300 ${stage === "reading" ? "animate-pulse" : ""}`}
                  style={{ width: `${stage === "reading" ? 100 : progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[#9A9CA8]">
                {stage === "reading" ? "Extracting your details. This can take a few seconds." : `${progress}%`}
              </p>
            </div>
          )}

          {stage === "fallback" && (
            <div className="mt-6 space-y-5">
              <p className="text-[#C9CAD2]">{result?.message || "We couldn't read your details automatically."}</p>
              <p className="text-sm text-[#9A9CA8]">
                Your CV is saved and the AI assistant can still use it. You can fill in your passport yourself.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="blue" size="lg" onClick={() => router.push("/passport")}>Fill in my passport</Button>
                <Button variant="outline" size="lg" onClick={goDashboard}>Go to dashboard</Button>
              </div>
            </div>
          )}

          {stage === "review" && result && (
            <div className="mt-6 bg-[#FBFBEF] text-[#18191D] rounded-3xl p-5 sm:p-7">
              <CvReviewPanel
                result={result}
                mode="review"
                saving={saving}
                onConfirm={onConfirm}
                onCancel={() => { setStage("upload"); setResult(null); }}
              />
            </div>
          )}

          {(stage === "upload" || busy) && (
            <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-[#9A9CA8] inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Private to you. Nothing is saved to your passport until you confirm.
              </p>
              <button
                type="button"
                onClick={handleSkip}
                disabled={busy}
                className="text-sm font-bold underline underline-offset-4 text-[#F8F8F0] hover:text-[#2F9BE0] disabled:opacity-40 cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
