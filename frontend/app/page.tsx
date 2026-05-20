"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const GOLD = "#d6a63f";
const GOLD_BRIGHT = "#f4cf77";
const INK = "#1a1714";
const MUTED = "#5e564d";

const platforms = [
  {
    name: "99acres",
    displayName: "99acres",
    logo: "/99acres.png",
    desc: "Massive verified inventory across India's major rental markets.",
  },
  {
    name: "NoBroker",
    displayName: "NoBroker",
    logo: "/nobroker.png",
    desc: "Direct owner-first listings with zero brokerage friction.",
  },
  {
    name: "MagicBricks",
    displayName: "MagicBricks",
    logo: "/magicbricks.png",
    desc: "High-quality listings with rich locality and amenity coverage.",
  },
];

const steps = [
  {
    num: "01",
    title: "Describe your ideal home",
    desc: "Speak naturally about locality, budget, BHK, commute, and deal-breakers.",
  },
  {
    num: "02",
    title: "Ghosla searches everything",
    desc: "We scan every partner platform in parallel and normalize the results instantly.",
  },
  {
    num: "03",
    title: "Shortlist with confidence",
    desc: "Get ranked homes with locality context so your final decision is faster and smarter.",
  },
];

const profileExamples = [
  {
    headline: "Whitefield · 2BHK · ₹20k–₹35k",
    chips: ["Near metro", "Lift", "Covered parking", "Family friendly"],
    insight: "Great for tech professionals with quick ORR commute.",
  },
  {
    headline: "HSR Layout · 1BHK · ₹18k–₹28k",
    chips: ["Pet friendly", "Balcony", "Low noise", "Gym nearby"],
    insight: "Popular with young couples and startup teams.",
  },
  {
    headline: "Indiranagar · 3BHK · ₹45k–₹70k",
    chips: ["Semi-furnished", "Power backup", "Near metro", "Parking"],
    insight: "Best for premium rentals with walkable lifestyle access.",
  },
];

const defaultCardFloat = {
  rotateX: 0,
  rotateY: 0,
  scale: 1,
  depthX: 0,
  depthY: 0,
  glowX: 50,
  glowY: 50,
};

const lightBg: React.CSSProperties = {
  backgroundColor: "#e2ded7",
  backgroundImage: [
    "radial-gradient(ellipse 75% 58% at 0% 0%, rgba(214,166,63,0.35) 0%, transparent 60%)",
    "radial-gradient(ellipse 70% 55% at 100% 100%, rgba(244,207,119,0.22) 0%, transparent 58%)",
    "radial-gradient(rgba(26,23,20,0.14) 1.2px, transparent 1.2px)",
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%, 24px 24px",
};

export default function Home() {
  const shouldReduceMotion = useReducedMotion();
  const [activeExample, setActiveExample] = useState(0);
  const [cardFloat, setCardFloat] = useState(defaultCardFloat);
  const [partnersFloat, setPartnersFloat] = useState(defaultCardFloat);
  const resetFloatTimeoutRef = useRef<number | null>(null);
  const resetPartnersFloatTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = window.setInterval(() => {
      setActiveExample((current) => (current + 1) % profileExamples.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [shouldReduceMotion]);

  const reveal = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.35 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
      };

  const applyCardFloat = (
    event: ReactPointerEvent<HTMLDivElement>,
    isClick: boolean
  ) => {
    if (shouldReduceMotion || event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const yRatio = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    const nx = xRatio - 0.5;
    const ny = yRatio - 0.5;

    const intensity = isClick ? 15 : 8;

    setCardFloat({
      rotateX: ny * intensity,
      rotateY: -nx * intensity,
      scale: isClick ? 1.02 : 1.01,
      depthX: -nx * 20,
      depthY: -ny * 20,
      glowX: xRatio * 100,
      glowY: yRatio * 100,
    });

    if (isClick) {
      if (resetFloatTimeoutRef.current) {
        window.clearTimeout(resetFloatTimeoutRef.current);
      }
      resetFloatTimeoutRef.current = window.setTimeout(() => {
        setCardFloat(defaultCardFloat);
      }, 850);
    }
  };

  const applyPartnersFloat = (
    event: ReactPointerEvent<HTMLDivElement>,
    isClick: boolean
  ) => {
    if (shouldReduceMotion || event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const yRatio = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    const nx = xRatio - 0.5;
    const ny = yRatio - 0.5;

    const intensity = isClick ? 13 : 7;

    setPartnersFloat({
      rotateX: ny * intensity,
      rotateY: -nx * intensity,
      scale: isClick ? 1.012 : 1.006,
      depthX: -nx * 26,
      depthY: -ny * 26,
      glowX: xRatio * 100,
      glowY: yRatio * 100,
    });

    if (isClick) {
      if (resetPartnersFloatTimeoutRef.current) {
        window.clearTimeout(resetPartnersFloatTimeoutRef.current);
      }
      resetPartnersFloatTimeoutRef.current = window.setTimeout(() => {
        setPartnersFloat(defaultCardFloat);
      }, 900);
    }
  };

  useEffect(() => {
    return () => {
      if (resetFloatTimeoutRef.current) {
        window.clearTimeout(resetFloatTimeoutRef.current);
      }
      if (resetPartnersFloatTimeoutRef.current) {
        window.clearTimeout(resetPartnersFloatTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen text-[17px] text-[#1a1714] md:text-[18px]" style={lightBg}>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b px-5 py-4 backdrop-blur-xl md:px-8"
        style={{
          backgroundColor: "rgba(226,222,215,0.88)",
          borderColor: "rgba(26,23,20,0.11)",
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href="/#home"
            style={{ fontFamily: "var(--font-display)" }}
            className="text-xl font-bold tracking-tight transition-opacity hover:opacity-80 md:text-2xl"
          >
            Ghosla
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-[rgba(26,23,20,0.13)] bg-[rgba(255,255,255,0.46)] p-1 md:flex">
            <Link
              href="/#home"
              className="rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1a1714] transition-colors hover:bg-[rgba(26,23,20,0.08)]"
            >
              Home
            </Link>
            <a
              href="#platforms"
              className="rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#6b635a] transition-colors hover:bg-[rgba(26,23,20,0.08)] hover:text-[#1a1714]"
            >
              Platforms
            </a>
            <a
              href="#process"
              className="rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#6b635a] transition-colors hover:bg-[rgba(26,23,20,0.08)] hover:text-[#1a1714]"
            >
              How it works
            </a>
          </nav>

          <Link
            href="/call"
            className="rounded-full px-6 py-2.5 text-sm font-bold uppercase tracking-[0.12em] transition-transform hover:scale-[1.02]"
            style={{
              backgroundImage: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`,
              color: INK,
              boxShadow: "0 10px 28px -10px rgba(214,166,63,0.92)",
            }}
          >
            Start your search
          </Link>
        </div>
      </header>

      <section
        id="home"
        className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 pt-28 pb-16 md:grid-cols-[1.15fr_0.85fr] md:px-8"
      >
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-7"
        >
          <motion.p
            style={{ fontFamily: "var(--font-serif)", color: INK }}
            initial={shouldReduceMotion ? undefined : { textShadow: "0 0 0 rgba(214,166,63,0)" }}
            animate={
              shouldReduceMotion
                ? undefined
                : { textShadow: "0 0 16px rgba(214,166,63,0.33), 0 2px 8px rgba(214,166,63,0.2)" }
            }
            transition={shouldReduceMotion ? undefined : { duration: 1.15, ease: "easeOut" }}
            className="text-2xl italic md:text-3xl"
          >
            Rental search, redesigned for speed.
          </motion.p>

          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="text-6xl leading-[0.92] tracking-[-0.04em] md:text-8xl"
          >
            Speak once.
            <br />
            Get your
            <span className="block text-transparent" style={{ backgroundImage: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text" }}>
              perfect shortlist.
            </span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-[#5e564d] md:text-xl">
            Tell Ghosla your budget, locality, BHK, and non-negotiables. We search every partner
            platform instantly and return the best-fit homes with locality intelligence.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/call"
              className="inline-flex items-center rounded-full px-9 py-4 text-base font-bold tracking-wide transition-transform hover:scale-[1.02]"
              style={{
                backgroundImage: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`,
                color: INK,
                boxShadow: "0 16px 34px -14px rgba(214,166,63,0.9)",
              }}
            >
              Connect to find your next home
            </Link>
            <a
              href="#platforms"
              className="inline-flex items-center rounded-full border px-9 py-4 text-base font-bold tracking-wide text-[#1a1714] transition-colors hover:bg-[rgba(26,23,20,0.05)]"
              style={{ borderColor: "rgba(26,23,20,0.2)" }}
            >
              See all platform logos
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
          animate={
            shouldReduceMotion
                ? undefined
                : {
                    opacity: 1,
                    rotateX: cardFloat.rotateX,
                    rotateY: cardFloat.rotateY,
                    scale: cardFloat.scale,
                  x: cardFloat.depthX * 0.12,
                  y: cardFloat.depthY * 0.12,
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  opacity: { duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] },
                  y: { type: "spring", stiffness: 180, damping: 20 },
                  rotateX: { type: "spring", stiffness: 220, damping: 16 },
                  rotateY: { type: "spring", stiffness: 220, damping: 16 },
                  scale: { type: "spring", stiffness: 210, damping: 16 },
                  x: { type: "spring", stiffness: 180, damping: 18 },
                }
          }
          className="relative overflow-hidden rounded-3xl border p-6 md:p-7"
          onPointerMove={(event) => applyCardFloat(event, false)}
          onPointerDown={(event) => applyCardFloat(event, true)}
          onPointerLeave={() => setCardFloat(defaultCardFloat)}
          style={{
            borderColor: "rgba(26,23,20,0.14)",
            backgroundColor: "rgba(255,255,255,0.58)",
            boxShadow: `${cardFloat.depthX}px ${cardFloat.depthY}px 58px -34px rgba(26,23,20,0.35), inset ${-cardFloat.depthX * 0.18}px ${-cardFloat.depthY * 0.18}px 0 rgba(255,255,255,0.5)`,
            transformStyle: "preserve-3d",
            transformPerspective: 1100,
          }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background: `radial-gradient(circle at ${cardFloat.glowX}% ${cardFloat.glowY}%, rgba(244,207,119,0.28) 0%, rgba(244,207,119,0.14) 20%, transparent 55%)`,
            }}
            animate={shouldReduceMotion ? undefined : { opacity: cardFloat.scale > 1.01 ? 1 : 0.6 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.25 }}
          />
          <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
            Live preference profile
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={profileExamples[activeExample]?.headline}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={shouldReduceMotion ? undefined : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 style={{ fontFamily: "var(--font-display)" }} className="mt-3 text-3xl font-bold tracking-tight md:text-[2.15rem]">
                {profileExamples[activeExample].headline}
              </h2>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {profileExamples[activeExample].chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border px-4 py-1.5 text-sm font-semibold md:text-base"
                    style={{ borderColor: "rgba(26,23,20,0.16)", color: MUTED }}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-base leading-relaxed text-[#6b635a] md:text-lg">
                {profileExamples[activeExample].insight}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center gap-2">
            {profileExamples.map((example, i) => (
              <button
                key={example.headline}
                type="button"
                onClick={() => setActiveExample(i)}
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: i === activeExample ? 30 : 10,
                  backgroundColor: i === activeExample ? GOLD : "rgba(26,23,20,0.2)",
                }}
                aria-label={`Show preference example ${i + 1}`}
              />
            ))}
          </div>

          <div className="mt-7 space-y-3">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-between rounded-2xl border bg-white/75 px-4 py-3"
                style={{ borderColor: "rgba(26,23,20,0.1)" }}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="relative h-8 w-24">
                    <Image
                      src={platform.logo}
                      alt={platform.name}
                      fill
                      sizes="(max-width: 768px) 96px, 96px"
                      className="object-contain object-left"
                    />
                  </div>
                  <span className="text-base font-bold tracking-tight text-[#2e2a25] md:text-lg">
                    {platform.displayName}
                  </span>
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.16em] md:text-sm" style={{ color: GOLD }}>
                  Synced
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="platforms" className="px-5 pb-20 md:px-8">
        <motion.div
          {...reveal}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  rotateX: partnersFloat.rotateX,
                  rotateY: partnersFloat.rotateY,
                  scale: partnersFloat.scale,
                  x: partnersFloat.depthX * 0.08,
                  y: partnersFloat.depthY * 0.08,
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  rotateX: { type: "spring", stiffness: 170, damping: 18 },
                  rotateY: { type: "spring", stiffness: 170, damping: 18 },
                  scale: { type: "spring", stiffness: 170, damping: 18 },
                  x: { type: "spring", stiffness: 160, damping: 18 },
                  y: { type: "spring", stiffness: 160, damping: 18 },
                }
          }
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border px-6 py-12 md:px-10"
          onPointerMove={(event) => applyPartnersFloat(event, false)}
          onPointerDown={(event) => applyPartnersFloat(event, true)}
          onPointerLeave={() => setPartnersFloat(defaultCardFloat)}
          style={{
            borderColor: "rgba(255,255,255,0.45)",
            background:
              "linear-gradient(140deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.14) 52%, rgba(214,166,63,0.16) 100%)",
            boxShadow:
              `${partnersFloat.depthX}px ${partnersFloat.depthY}px 65px -30px rgba(26,23,20,0.45), inset ${-partnersFloat.depthX * 0.12}px ${-partnersFloat.depthY * 0.12}px 0 rgba(255,255,255,0.42)`,
            backdropFilter: "blur(14px)",
            transformStyle: "preserve-3d",
            transformPerspective: 1200,
          }}
        >
          <motion.div
            className="pointer-events-none absolute -inset-24 -z-10 rounded-[3rem]"
            style={{
              background: `radial-gradient(circle at ${partnersFloat.glowX}% ${partnersFloat.glowY}%, rgba(244,207,119,0.5) 0%, rgba(214,166,63,0.26) 28%, transparent 66%)`,
              filter: "blur(28px)",
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    opacity: 0.45 + (Math.max(Math.abs(partnersFloat.depthX), Math.abs(partnersFloat.depthY)) / 40),
                    scale: 1.03 + (Math.max(Math.abs(partnersFloat.depthX), Math.abs(partnersFloat.depthY)) / 200),
                    x: -partnersFloat.depthX * 0.4,
                    y: -partnersFloat.depthY * 0.4,
                  }
            }
            transition={shouldReduceMotion ? undefined : { type: "spring", stiffness: 150, damping: 18 }}
          />
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[2rem]"
            style={{
              background: `radial-gradient(circle at ${partnersFloat.glowX}% ${partnersFloat.glowY}%, rgba(244,207,119,0.28) 0%, rgba(244,207,119,0.08) 24%, transparent 58%)`,
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : { opacity: 0.45 + (Math.max(Math.abs(partnersFloat.depthX), Math.abs(partnersFloat.depthY)) / 58) }
            }
            transition={shouldReduceMotion ? undefined : { duration: 0.22 }}
          />
          <div
            className="pointer-events-none absolute -top-20 -left-10 h-48 w-48 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(244,207,119,0.3) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 right-8 h-64 w-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(214,166,63,0.22) 0%, transparent 70%)" }}
          />

          <p
            style={{ fontFamily: "var(--font-serif)", color: "#8d651a" }}
            className="text-center text-3xl italic md:text-4xl"
          >
            Search across top platforms
          </p>
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="mx-auto mt-4 max-w-4xl text-center text-4xl font-bold leading-tight tracking-[-0.03em] text-[#1a1714] md:text-5xl"
          >
            We pull listings from major rental platforms and bring them into one easy view.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg leading-relaxed text-[#4b4339] md:text-xl">
            One request from you. Compare options from multiple sources in one place.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {platforms.map((platform, i) => (
              <motion.article
                key={platform.name}
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 22 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={shouldReduceMotion ? undefined : { once: true, amount: 0.3 }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }
                }
                className="rounded-2xl border p-5"
                style={{
                  borderColor: "rgba(255,255,255,0.42)",
                  background:
                    "linear-gradient(150deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.28) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 16px 28px -24px rgba(26,23,20,0.4)",
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="inline-flex rounded-xl bg-white px-4 py-3 shadow-[0_8px_20px_-16px_rgba(26,23,20,0.55)]">
                    <div className="relative h-9 w-28">
                      <Image
                        src={platform.logo}
                        alt={platform.name}
                        fill
                        sizes="(max-width: 768px) 112px, 112px"
                        className="object-contain object-left"
                      />
                    </div>
                  </div>
                  <span className="text-base font-bold tracking-tight text-[#2d2922] md:text-lg">
                    {platform.displayName}
                  </span>
                </div>
                <p className="text-base leading-relaxed text-[#4f463d] md:text-lg">
                  {platform.desc}
                </p>
                <div className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.13em] text-[#8d651a] md:text-sm">
                  Live feed integrated
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="process" className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <motion.p
          {...reveal}
          style={{ fontFamily: "var(--font-serif)", color: GOLD }}
          className="text-center text-2xl italic md:text-3xl"
        >
          How Ghosla works
        </motion.p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.article
              key={step.num}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 22 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={shouldReduceMotion ? undefined : { once: true, amount: 0.3 }}
              transition={
                shouldReduceMotion
                  ? undefined
                  : { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }
              }
              className="rounded-2xl border p-6"
              style={{
                borderColor: "rgba(26,23,20,0.12)",
                backgroundColor: "rgba(255,255,255,0.5)",
              }}
            >
              <p style={{ fontFamily: "var(--font-serif)", color: GOLD }} className="text-5xl md:text-6xl">
                {step.num}
              </p>
              <h3
                style={{ fontFamily: "var(--font-display)" }}
                className="mt-4 text-2xl font-bold tracking-tight md:text-3xl"
              >
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[#5e564d] md:text-lg">{step.desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="bg-[#0f0d0a] px-5 py-24 text-center md:px-8">
        <motion.div {...reveal} className="mx-auto max-w-2xl space-y-8">
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="text-5xl font-bold leading-tight tracking-[-0.04em] text-white md:text-6xl"
          >
            Your next home is one
            <span
              style={{
                color: GOLD_BRIGHT,
                fontFamily: "var(--font-serif)",
              }}
              className="ml-2 italic font-normal"
            >
              smart conversation
            </span>
            away.
          </h2>
          <Link
            href="/call"
            className="inline-flex items-center rounded-full px-10 py-4 text-base font-bold tracking-wide transition-transform hover:scale-[1.02]"
            style={{
              backgroundImage: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`,
              color: INK,
              boxShadow: "0 16px 34px -14px rgba(214,166,63,0.9)",
            }}
          >
            Start your search
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
