import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { apiRequest, canCallBackend } from "@/lib/apiClient";

// Personal fields start EMPTY. They are only ever filled from the user's own CV or manual entry,
// so CV autofill can populate them and the assistant never sees placeholder/fake data.
export const DEFAULT_PASSPORT = {
  // 1. Personal & Contact (Core Structured Data)
  fullName: "",
  email: "",
  phone: "",
  location: "",
  address: "",
  dob: "",
  nationality: "",
  passportNumber: "",
  passportExpiry: "",
  professionalSummary: "",
  education: "",
  skills: "",
  workExperience: "",
  languages: "",
  certifications: "",
  projects: "",
  portfolioUrl: "",
  linkedinUrl: "",
  githubUrl: "",
  idDetails: "",

  // 2. Interaction & Assistive Tech
  preferredMethod: "standard", // "keyboard-only" | "screen-reader" | "voice-control" | "mouse-pointer" | "switch-device" | "standard"
  voiceAssist: true,
  keyboardNav: true,
  autoFocusForms: true,

  // 3. Display & Visual
  textSize: "normal", // "normal" | "large" | "xlarge"
  contrast: "standard", // "standard" | "high-contrast" | "dark-contrast" | "yellow-on-black"
  dyslexicFont: false,
  reducedMotion: false,

  // 4. Cognitive & Language
  simplifiedLanguage: false,
  stepByStepForm: false,
  extendedTime: false,

  // 5. Sensitive & Optional (100% User Discretion)
  shareAccommodations: false,
  accommodationNotes: "",
  lastUpdated: new Date().toISOString(),
};

const STORAGE_KEY = "prayas_user_passport";
const storageKeyFor = (userId) => (userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY);

function readLocal(userId) {
  if (typeof window === "undefined") return null;
  const local = localStorage.getItem(storageKeyFor(userId));
  if (!local) return null;
  try {
    return JSON.parse(local);
  } catch (e) {
    console.error("Error parsing local passport", e);
    return null;
  }
}

function broadcast(data) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("prayas-passport-updated", { detail: data }));
  window.postMessage({ type: "PRAYAS_PASSPORT_SYNC", passport: data }, "*");
}

/**
 * Get the signed-in user's passport. The backend is the source of truth (per-user, authenticated);
 * a per-user local cache is used only when the backend is unreachable.
 */
export async function getPassport(userId = null) {
  if (await canCallBackend()) {
    try {
      const data = await apiRequest("/api/profile");
      const merged = { ...DEFAULT_PASSPORT, ...(data.passport || {}) };
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKeyFor(userId), JSON.stringify(merged));
      }
      return merged;
    } catch (e) {
      console.warn("Could not fetch passport from backend, falling back to local cache", e);
    }
  }

  const local = readLocal(userId);
  if (local) return { ...DEFAULT_PASSPORT, ...local };
  return { ...DEFAULT_PASSPORT };
}

/**
 * Save passport data through the backend (which also re-indexes it for the AI assistant),
 * with a per-user local cache for instant access and extension synchronization.
 */
export async function savePassport(passportData, userId = null) {
  const updatedData = {
    ...passportData,
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(updatedData));
    broadcast(updatedData);
  }

  if (await canCallBackend()) {
    try {
      await apiRequest("/api/profile", { method: "PUT", body: updatedData });
      return updatedData;
    } catch (e) {
      console.warn("Could not save passport through the backend:", e);
    }
  }

  // Fallback: direct Supabase upsert (RLS-protected)
  if (isSupabaseConfigured && supabase && userId) {
    try {
      const { error } = await supabase.from("passports").upsert({
        user_id: userId,
        passport_data: updatedData,
        updated_at: new Date().toISOString(),
      });
      if (error) console.warn("Supabase upsert warning:", error);
    } catch (e) {
      console.warn("Could not sync passport with Supabase:", e);
    }
  }

  return updatedData;
}

/** Update the local cache + notify listeners after the backend changed the passport (e.g. CV confirm). */
export function cachePassport(passport, userId = null) {
  const merged = { ...DEFAULT_PASSPORT, ...(passport || {}), lastUpdated: new Date().toISOString() };
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(merged));
    broadcast(merged);
  }
  return merged;
}
