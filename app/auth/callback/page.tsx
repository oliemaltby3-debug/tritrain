"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        window.location.href = profile ? "/dashboard" : "/onboarding";
      }
    });

    // Also check for existing session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        window.location.href = profile ? "/dashboard" : "/onboarding";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Signing you in...</p>
    </main>
  );
}
