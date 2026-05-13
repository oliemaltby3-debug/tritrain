"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-gray-100">
        <span className="text-lg font-semibold tracking-tight">the norwegian effect.</span>
        <div className="flex items-center gap-6 text-sm">
          <a href="/dashboard" className="text-black font-medium">My Plan</a>
          <button onClick={handleLogout} className="text-gray-400 hover:text-black transition-colors">Log out</button>
        </div>
      </nav>

      <div className="px-6 md:px-12 py-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">Welcome</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}.` : "Your training plan is being built."}
          </h1>
          <p className="text-gray-400 text-lg font-light mb-12">We're generating your personalised plan based on your profile. Check back shortly.</p>
        </motion.div>

        {/* Week overview placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-6">This week</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Monday", "Wednesday", "Friday", "Sunday"].map((day) => (
              <div key={day} className="border border-gray-100 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">{day}</p>
                <div className="h-4 bg-gray-100 rounded-full mb-2 w-3/4" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Profile stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-6">Your profile</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Goal race", value: profile?.goal_race },
              { label: "Weekly hours", value: profile?.weekly_hours },
              { label: "Fitness level", value: profile?.fitness_level },
            ].map((item) => (
              <div key={item.label} className="border border-gray-100 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{item.label}</p>
                <p className="text-lg font-bold">{item.value ?? "—"}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
