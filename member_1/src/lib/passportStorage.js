import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export const DEFAULT_PASSPORT = {
  // 1. Personal & Contact (Core)
  fullName: "",
  email: "",
  phone: "",
  location: "",

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
  simplifiedLanguage: true,
  stepByStepForm: false,
  extendedTime: true,

  // 5. Sensitive & Optional (100% User Discretion)
  shareAccommodations: false,
  accommodationNotes: "",
  lastUpdated: new Date().toISOString(),
};

const STORAGE_KEY = "prayas_user_passport";

/**
 * Get current saved passport for user or fallback to defaults
 */
export async function getPassport(userId = null) {
  // If Supabase is configured and we have a user
  if (isSupabaseConfigured && supabase && userId) {
    try {
      const { data, error } = await supabase
        .from("passports")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!error && data?.passport_data) {
        return { ...DEFAULT_PASSPORT, ...data.passport_data };
      }
    } catch (e) {
      console.warn("Could not fetch passport from Supabase, falling back to local storage", e);
    }
  }

  // Local storage fallback
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        return { ...DEFAULT_PASSPORT, ...JSON.parse(local) };
      } catch (e) {
        console.error("Error parsing local passport", e);
      }
    }
  }

  return { ...DEFAULT_PASSPORT };
}

/**
 * Save passport data locally and to Supabase if connected
 */
export async function savePassport(passportData, userId = null) {
  const updatedData = {
    ...passportData,
    lastUpdated: new Date().toISOString(),
  };

  // 1. Save to local storage for instant access & extension synchronization
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    // Dispatch custom event for real-time reactivity in other components
    window.dispatchEvent(new CustomEvent("prayas-passport-updated", { detail: updatedData }));
  }

  // 2. Save to Supabase if configured
  if (isSupabaseConfigured && supabase && userId) {
    try {
      const { error } = await supabase.from("passports").upsert({
        user_id: userId,
        passport_data: updatedData,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("Supabase upsert warning:", error);
      }
    } catch (e) {
      console.warn("Could not sync passport with Supabase:", e);
    }
  }

  return updatedData;
}
