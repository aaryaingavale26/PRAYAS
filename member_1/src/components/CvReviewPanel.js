"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const FIELD_LABELS = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  location: "City / State / Country",
  address: "Address",
  dob: "Date of birth",
  nationality: "Nationality",
  passportNumber: "Passport number",
  passportExpiry: "Passport expiry",
  professionalSummary: "Summary",
  education: "Education",
  workExperience: "Work experience",
  skills: "Skills",
  languages: "Languages",
  certifications: "Certifications",
  projects: "Projects",
  linkedinUrl: "LinkedIn",
  githubUrl: "GitHub",
  portfolioUrl: "Portfolio",
};

const LONG_FIELDS = new Set([
  "address", "professionalSummary", "education", "workExperience",
  "skills", "languages", "certifications", "projects",
]);

/**
 * mode="review": first-time "Review your details" with editable fields.
 * mode="update": diff of what a newly uploaded CV would change; user picks values to apply.
 */
export function CvReviewPanel({ result, mode = "review", saving = false, onConfirm, onCancel }) {
  const fields = result.fields || [];
  const current = result.current_passport || {};

  // ---- review mode state: editable values (existing value wins; otherwise CV value)
  const [values, setValues] = useState(() => {
    const v = {};
    fields.forEach((f) => {
      v[f.key] = f.current ? f.current : f.proposed || "";
    });
    return v;
  });

  // ---- update mode state: which proposed values to apply
  const diff = result.diff || [];
  const [selected, setSelected] = useState(() => {
    const s = {};
    diff.forEach((d) => {
      s[d.field] = d.change === "new"; // new = pre-selected; changed = opt-in
    });
    return s;
  });

  const missingCount = useMemo(
    () => fields.filter((f) => !(values[f.key] || "").trim()).length,
    [fields, values]
  );

  const submitReview = () => {
    const out = {};
    const overwrite = [];
    fields.forEach((f) => {
      const val = (values[f.key] || "").trim();
      if (!val) return;
      out[f.key] = val;
      // The user explicitly edited an already-saved value in this screen
      if (f.current && val !== String(f.current).trim()) overwrite.push(f.key);
    });
    onConfirm({ fields: out, overwriteFields: overwrite });
  };

  const submitUpdate = () => {
    const out = {};
    const overwrite = [];
    diff.forEach((d) => {
      if (!selected[d.field]) return;
      out[d.field] = d.proposed;
      if (d.change === "changed") overwrite.push(d.field);
    });
    onConfirm({ fields: out, overwriteFields: overwrite });
  };

  if (mode === "update") {
    const chosen = Object.values(selected).filter(Boolean).length;
    return (
      <div className="space-y-4">
        {diff.length === 0 ? (
          <p className="text-sm font-semibold text-[#18191D] p-4 rounded-2xl bg-[#FBFBEF] border border-[#E2E2D4]" role="status">
            Your passport already matches this CV. Nothing to update.
          </p>
        ) : (
          <>
            <p className="text-sm text-[#4B4D56]">
              Choose which values from your new CV should update your passport. Nothing changes until you confirm.
            </p>
            <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {diff.map((d) => (
                <li key={d.field} className="rounded-2xl border-2 border-[#E2E2D4] bg-white p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-[#1F5FBF]"
                      checked={Boolean(selected[d.field])}
                      onChange={(e) => setSelected((s) => ({ ...s, [d.field]: e.target.checked }))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-display font-extrabold text-[#18191D]">
                        {FIELD_LABELS[d.field] || d.field}
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${d.change === "new" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
                          {d.change === "new" ? "New" : "Changed"}
                        </span>
                      </span>
                      {d.change === "changed" && (
                        <span className="block mt-2 text-xs text-[#646672]">
                          <span className="font-bold">Current:</span>{" "}
                          <span className="whitespace-pre-wrap line-through decoration-[#DC2626]/50">{String(d.current)}</span>
                        </span>
                      )}
                      <span className="block mt-1 text-sm text-[#18191D]">
                        <span className="font-bold text-xs text-[#1F5FBF]">From CV:</span>{" "}
                        <span className="whitespace-pre-wrap">{d.proposed}</span>
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          {diff.length > 0 && (
            <Button variant="primary" onClick={submitUpdate} isLoading={saving} disabled={chosen === 0}>
              Apply {chosen} change{chosen === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#4B4D56]" id="review-help">
        We filled in what we found in your CV. Anything we couldn&apos;t find is left blank (we never guess).
        Fix anything that&apos;s wrong, then confirm. Nothing is saved until you do.
      </p>
      {missingCount > 0 && (
        <p className="text-xs font-bold text-[#92400E] flex items-center gap-1.5" role="status">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {missingCount} field{missingCount === 1 ? "" : "s"} not found in your CV. You can add them now or later.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => {
          const val = values[f.key] || "";
          const empty = !val.trim();
          const lowConf = f.auto_filled && f.confidence === "low" && !empty;
          const long = LONG_FIELDS.has(f.key);
          const id = `review-${f.key}`;
          const warn = empty || lowConf;
          const common = {
            id,
            value: val,
            onChange: (e) => setValues((v) => ({ ...v, [f.key]: e.target.value })),
            "aria-describedby": `${id}-note`,
            className: `prayas-input-field ${warn ? "!border-[#F59E0B] !bg-[#FFFBEB]" : ""}`,
          };
          return (
            <div key={f.key} className={long ? "sm:col-span-2" : ""}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label htmlFor={id} className="text-sm font-bold text-[#18191D]">
                  {FIELD_LABELS[f.key] || f.key}
                </label>
                {f.auto_filled && !empty && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D4F1FE] text-[#1F5FBF]">
                    <Sparkles className="h-3 w-3" aria-hidden="true" /> Auto-filled from CV
                  </span>
                )}
              </div>
              {long ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
              <p id={`${id}-note`} className={`mt-1 text-xs ${warn ? "text-[#92400E] font-semibold" : "text-[#646672]"}`}>
                {empty
                  ? "Not found in your CV. Add it if you like."
                  : lowConf
                  ? "Low confidence. Please double-check this."
                  : f.current && !f.auto_filled
                  ? "Already saved in your passport (kept)."
                  : "Looks right? Edit if needed."}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
        {onCancel && <Button variant="outline" onClick={onCancel}>Back</Button>}
        <Button variant="primary" size="lg" onClick={submitReview} isLoading={saving} leftIcon={<CheckCircle2 className="h-5 w-5" />}>
          Looks good, save
        </Button>
      </div>
    </div>
  );
}
