"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccessToken, getOnboardingStatus } from "@/lib/apiClient";

/**
 * Loads the user's onboarding state from the backend.
 * `supported` is false for local fallback sessions that the backend cannot verify; in that
 * case we never block the dashboard.
 */
export function useOnboardingStatus(user) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [supported, setSupported] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSupported(false);
        setStatus(null);
        return null;
      }
      const s = await getOnboardingStatus();
      setSupported(true);
      setStatus(s);
      return s;
    } catch (e) {
      // Backend offline or not migrated yet: never lock the user out
      setSupported(false);
      setStatus(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, supported, refresh };
}
