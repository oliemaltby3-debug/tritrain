"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        window.location.href = profile ? "/dashboard" : "/onboarding";
      } else {
        window.location.href = "/login";
      }
    };

    handleCallback();
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Signing you in...</p>
    </main>
  );
}
