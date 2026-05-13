"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";

const usps = [
  {
    title: "Adaptive",
    body: "The plan moves with your life. Miss a session and it restructures. Race coming up? It tapers. No other affordable plan does this.",
    image: "/steve-lieman-iIFg_WaDZzw-unsplash.jpg",
    imagePosition: "center",
  },
  {
    title: "Science-backed with explanation",
    body: "Not just what to do — but why. Every session has a purpose rooted in real research, not generic templates copied from a coaching book.",
    image: "/pexels-2159477359-36080208.jpg",
    imagePosition: "center",
  },
  {
    title: "Built for athletes by athletes",
    body: "You're not using a faceless app. This was built by a triathlete who lived this exact problem and spent real time solving it. That authenticity is something no corporate fitness platform can replicate.",
    image: "/pexels-cristian-camilo-estrada-2152272341-35757291.jpg",
    imagePosition: "0% center",
  },
];

function USPSlideshow() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % usps.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 120 : -120 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -120 : 120 }),
  };

  return (
    <div className="relative w-full bg-black text-white h-[280px] flex flex-col justify-end overflow-hidden">
      <AnimatePresence>
        {usps[current].image && (
          <motion.div
            key={usps[current].image}
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: `url('${usps[current].image}')`, backgroundPosition: usps[current].imagePosition ?? "center" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/50" />
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute inset-x-0 bottom-24 px-6 md:px-12"
        >
          <motion.h3
            className="text-3xl md:text-4xl font-bold mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {usps[current].title}
          </motion.h3>
          <motion.p
            className="text-gray-300 text-base leading-relaxed font-light max-w-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {usps[current].body}
          </motion.p>
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-6 left-6 md:left-12 right-6 md:right-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {usps.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-4 bg-gray-600"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => goTo((current - 1 + usps.length) % usps.length)}
            className="text-gray-400 text-2xl leading-none"
            whileHover={{ scale: 1.3, color: "#ffffff" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            ←
          </motion.button>
          <motion.button
            onClick={() => goTo((current + 1) % usps.length)}
            className="text-gray-400 text-2xl leading-none"
            whileHover={{ scale: 1.3, color: "#ffffff" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            →
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function PricingModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-4xl p-8 md:p-12 z-10"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <button onClick={onClose} className="absolute top-5 right-6 text-gray-400 hover:text-black text-2xl leading-none">×</button>
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">Pricing</p>
          <h2 className="text-3xl font-bold mb-8">Simple, honest pricing.</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Free trial */}
            <div className="border border-gray-200 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-2xl font-bold mb-1">Free<span className="text-base font-normal text-gray-400"> / 30 days</span></p>
                <p className="text-gray-400 text-sm">No card required. Cancel anytime.</p>
                <p className="text-sm text-gray-500 mb-6">Then £9.99/month after your trial.</p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-center gap-2"><span>✓</span> Full access for 30 days</li>
                  <li className="flex items-center gap-2"><span>✓</span> Personalised training plan</li>
                  <li className="flex items-center gap-2"><span>✓</span> Adaptive scheduling</li>
                  <li className="flex items-center gap-2"><span>✓</span> All three disciplines</li>
                  <li className="flex items-center gap-2"><span>✓</span> Free t-shirt after 3 months</li>
                </ul>
              </div>
              <motion.a
                href="/signup"
                className="block text-center border border-black text-black px-6 py-3 rounded-full text-sm font-medium"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                Start free trial
              </motion.a>
            </div>
            {/* Annual */}
            <div className="bg-black text-white rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-2xl font-bold mb-1">£89.99<span className="text-base font-normal text-gray-400"> / year</span></p>
                <p className="text-gray-400 text-sm mb-6">Less than £7.50 a month.</p>
                <ul className="space-y-2 text-sm text-gray-300 mb-6">
                  <li className="flex items-center gap-2"><span>✓</span> Everything in the free trial</li>
                  <li className="flex items-center gap-2"><span>✓</span> Full year of adaptive training</li>
                  <li className="flex items-center gap-2"><span>✓</span> Priority support</li>
                  <li className="flex items-center gap-2"><span>✓</span> Race-day taper planning</li>
                  <li className="flex items-center gap-2"><span>✓</span> Free t-shirt after 3 months</li>
                </ul>
              </div>
              <motion.a
                href="/signup?plan=annual"
                className="block text-center bg-white text-black px-6 py-3 rounded-full text-sm font-medium"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                Get started
              </motion.a>
            </div>
            {/* Premium */}
            <div className="border-2 border-black rounded-2xl p-6 flex flex-col justify-between relative">
              <div className="absolute -top-3 left-6 bg-black text-white text-xs px-3 py-1 rounded-full">Premium</div>
              <div>
                <p className="text-2xl font-bold mb-1">£14.99<span className="text-base font-normal text-gray-400"> / month</span></p>
                <p className="text-gray-400 text-sm">Or £134.99/year.</p>
                <p className="text-gray-400 text-sm mb-6">Cancel anytime.</p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-center gap-2"><span>✓</span> Everything in the standard plan</li>
                  <li className="flex items-center gap-2"><span>✓</span> Personalised nutrition plan</li>
                  <li className="flex items-center gap-2"><span>✓</span> Race-day nutrition strategy</li>
                  <li className="flex items-center gap-2"><span>✓</span> Priority support</li>
                  <li className="flex items-center gap-2"><span>✓</span> Free t-shirt after 3 months</li>
                </ul>
              </div>
              <motion.a
                href="/signup?plan=premium"
                className="block text-center bg-black text-white px-6 py-3 rounded-full text-sm font-medium"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                Get premium
              </motion.a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.from("waitlist").insert({ email, name });

    if (error) {
      if (error.code === "23505") {
        setError("You're already on the list!");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <section className="bg-black text-white px-6 md:px-12 py-24">
      <div className="max-w-xl">
        <FadeIn>
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-4">Early access</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Be the first to train smarter.
          </h2>
          <p className="text-gray-400 text-lg font-light mb-8">
            Join the waitlist and get early access plus a free extended trial when we launch.
          </p>
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 rounded-2xl px-6 py-5"
            >
              <p className="text-white font-medium">You&apos;re on the list.</p>
              <p className="text-gray-400 text-sm mt-1">We&apos;ll be in touch when early access opens.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="What should we call you?"
                className="bg-white/10 border border-white/20 rounded-full px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
              />
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                />
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium disabled:opacity-50"
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {loading ? "Joining..." : "Join waitlist"}
                </motion.button>
              </div>
            </form>
          )}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </FadeIn>
      </div>
    </section>
  );
}

export default function Home() {
  const [pricingOpen, setPricingOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 600], [0, 150]);
  const textY = useTransform(scrollY, [0, 600], [0, -60]);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <span className="text-lg font-semibold tracking-tight">the norwegian effect.</span>
        <div className="flex items-center gap-6 text-sm">
          <a href="#science" className="text-gray-500 hover:text-black transition-colors">The Method</a>
          <button onClick={() => setPricingOpen(true)} className="text-gray-500 hover:text-black transition-colors">Pricing</button>
          <a href="/login" className="text-gray-500 hover:text-black transition-colors">Log in</a>
          <a href="/signup" className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
            Get started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: "url('/james-lee-_QvszySFByg-unsplash.jpg')",
            y: imageY,
          }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <motion.div
          className="relative z-10 px-6 md:px-12 pt-24 max-w-4xl"
          style={{ y: textY }}
        >
          <motion.p
            className="text-sm uppercase tracking-widest text-gray-300 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Science-backed, adaptive endurance sport training plan
          </motion.p>
          <motion.h1
            className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-8 text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
          >
            Built for Athletes.<br />Proved by Science.
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-gray-300 max-w-xl mb-10 leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Adaptive training plans built on Norwegian methodology — tailored to your goals, your schedule, and your current fitness. No cookie-cutter plans.
          </motion.p>
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <motion.a
              href="/signup"
              className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              Start your plan
            </motion.a>
            <a href="#science" className="text-sm text-gray-300 hover:text-white transition-colors underline underline-offset-4">
              How it works
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="border-t border-b border-gray-100 px-6 md:px-12 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { stat: "Z2", label: "Norwegian method at its core" },
            { stat: "3", label: "Disciplines, one adaptive plan" },
            { stat: "100%", label: "Tailored to your schedule" },
            { stat: "Live", label: "Plan adapts when life happens" },
          ].map((item, i) => (
            <FadeIn key={item.stat} delay={i * 0.1}>
              <p className="text-3xl font-bold">{item.stat}</p>
              <p className="text-sm text-gray-400 mt-1">{item.label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* USP Slideshow */}
      <section className="w-full">
        <USPSlideshow />
      </section>

      {/* The Method */}
      <section id="science" className="px-6 md:px-12 py-24">
        <div className="max-w-3xl">
          <FadeIn>
            <p className="text-sm uppercase tracking-widest text-gray-400 mb-4">The method</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">
              Built on the Norwegian model
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-gray-500 text-lg leading-relaxed mb-6 font-light">
              The Norwegian training method has produced some of the fastest triathletes in the world. It centres on high-volume, low-intensity aerobic work — protecting the athlete from overtraining while building an enormous aerobic engine.
            </p>
          </FadeIn>
          <FadeIn delay={0.25}>
            <p className="text-gray-500 text-lg leading-relaxed mb-6 font-light">
              Most amateur plans get this wrong — pushing athletes too hard too often. We fix that. Every session has a purpose, every week is periodised, and the load is calculated around your life — not the other way around.
            </p>
          </FadeIn>
          <FadeIn delay={0.35}>
            <p className="text-gray-500 text-lg leading-relaxed font-light">
              Miss a session? The plan restructures. Have a race coming up? The plan tapers. It is the kind of coaching that used to cost hundreds per month.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Portrait images */}
      <section className="px-6 md:px-12 py-24 flex justify-center gap-6">
        {[
          "/maksym-tymchyk-4yC5nR1PZa0-unsplash.jpg",
          "/kirsten-frank-EWdxx8m1uh4-unsplash.jpg",
          "/nick-gosset-3DJfakd6VoU-unsplash.jpg",
        ].map((src, i) => (
          <FadeIn key={src} delay={i * 0.15}>
            <div className="relative w-72 h-96 overflow-hidden rounded-2xl">
              <img
                src={src}
                alt="Athlete training"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />
            </div>
          </FadeIn>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 md:px-12 py-24 bg-gray-50">
        <div className="max-w-xl">
          <FadeIn>
            <p className="text-sm uppercase tracking-widest text-gray-400 mb-4">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Simple, honest pricing</h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <p className="text-4xl font-bold mb-1">£12<span className="text-lg font-normal text-gray-400">/month</span></p>
              <p className="text-gray-400 text-sm mb-8">Cancel anytime. No contracts.</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-black">✓</span> Fully personalised training plan</li>
                <li className="flex items-center gap-2"><span className="text-black">✓</span> Adaptive — updates when you miss sessions</li>
                <li className="flex items-center gap-2"><span className="text-black">✓</span> Norwegian method periodisation</li>
                <li className="flex items-center gap-2"><span className="text-black">✓</span> Swim, bike and run all covered</li>
                <li className="flex items-center gap-2"><span className="text-black">✓</span> Built around your weekly hours</li>
              </ul>
              <motion.a
                href="/signup"
                className="block text-center bg-black text-white px-6 py-3 rounded-full text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                Get started
              </motion.a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Founder Story */}
      <section className="px-6 md:px-12 py-24">
        <div className="flex flex-col md:flex-row gap-16 items-start max-w-5xl">
          <FadeIn>
            <div className="w-64 flex-shrink-0 overflow-hidden rounded-2xl">
              <img
                src="/oliver.png"
                alt="Oliver Maltby"
                className="w-full h-auto object-cover grayscale"
              />
            </div>
          </FadeIn>
          <div className="max-w-2xl">
          <FadeIn>
            <p className="text-sm uppercase tracking-widest text-gray-400 mb-4">Founder</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-12">my story</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-gray-500 text-lg leading-relaxed font-light mb-6">
              I started training for triathlon in 2022. No background in endurance sport, no coach, no idea what I was doing — just a desire to see how far I could push myself.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-gray-500 text-lg leading-relaxed font-light mb-6">
              When I started preparing for my first half ironman, I hit a wall that had nothing to do with fitness. Every training plan I found was either too expensive, too rigid, or completely disconnected from real life. I&apos;m a university student. I have work and late nights.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="text-gray-500 text-lg leading-relaxed font-light mb-6">
              I&apos;d finish training blocks feeling like I&apos;d either destroyed myself or left too much on the table. Never the balance. I&apos;d read about zone 2, I knew I needed threshold work in between, but nobody was explaining why — just telling me what to do. I needed to understand the science, not just follow instructions.
            </p>
          </FadeIn>
          <FadeIn delay={0.4}>
            <p className="text-gray-500 text-lg leading-relaxed font-light mb-6">
              So I started researching. Books, papers and interviews with coaches and athletes at every level. What came from this wasn&apos;t a copy of any single method — it was a plan built from the ground up, incorporating the best of what actually works. The Norwegian approach to aerobic development is part of that. So is an honest understanding of recovery, periodisation, and what an intermediate athlete&apos;s body can sustain week to week.
            </p>
          </FadeIn>
          <FadeIn delay={0.5}>
            <p className="text-gray-500 text-lg leading-relaxed font-light mb-10">
              I built this because I genuinely couldn&apos;t find it anywhere else. If you&apos;re anything like me — juggling training around a real life, wanting to understand the why behind every session, and tired of plans that don&apos;t bend — then this was made for you.
            </p>
            <p className="text-black font-medium">— Oliver Maltby, London</p>
          </FadeIn>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <WaitlistSection />

      {/* Footer */}
      <footer className="px-6 md:px-12 py-10 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">the norwegian effect</span>
          <p className="text-sm text-gray-400">© 2026</p>
        </div>
      </footer>
      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
    </main>
  );
}
