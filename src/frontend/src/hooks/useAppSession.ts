import { useCallback, useState } from "react";
import type { AppRole } from "../backend.d";

const SESSION_KEY = "pottikadai-session";

export interface AppSession {
  username: string;
  name: string;
  appRole: AppRole;
}

function readSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AppSession) : null;
  } catch {
    return null;
  }
}

export function useAppSession() {
  const [session, setSession] = useState<AppSession | null>(readSession);

  const login = useCallback((sess: AppSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setSession(sess);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return { session, login, logout };
}
