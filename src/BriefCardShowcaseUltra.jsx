import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Activity, Zap } from "lucide-react";

/**
 * BriefCardShowcaseUltra (smooth version)
 * - Assemble step-by-step (slower, readable)
 * - Short stabilize pulse
 * - Micro glitch
 * - Smooth 3D flip to next card
 */
export const BriefCardShowcaseUltra = () => {
  const cards = useMemo(
    () => [
      {
        state: "TRADEABLE",
        ticker: "$LUNR",
        timestamp: "LIVE • 09:34:12 ET",
        catalyst: "Confirmed catalyst; clean headline + follow-through",
        confidence: "Confirmed",
        priceAction: { changePct: "+9.6%", last: "$6.58", relVol: "3.1x", float: "Low Float" },
        riskFlags: ["No active offering detected", "Liquidity improving", "Halt risk elevated"],
        levels: [
          { label: "PM High", value: "$6.70" },
          { label: "VWAP", value: "$6.18" },
          { label: "PDC", value: "$5.92" },
          { label: "Support", value: "$6.20" },
        ],
        plan: {
          trigger: "Engage only on reclaim + hold of PM High with clean tape.",
          invalidation: "Step aside if VWAP breaks on rising sell volume.",
          note: "Abort on any offering/ATM headline.",
        },
      },
      {
        state: "CAUTION",
        ticker: "$GNS",
        timestamp: "LIVE • 10:07:41 ET",
        catalyst: "Headline present, but tape is choppy + spreads unstable",
        confidence: "Mixed",
        priceAction: { changePct: "+4.2%", last: "$1.36", relVol: "1.6x", float: "Mid Float" },
        riskFlags: ["Wide spreads", "Overhead supply likely", "False breakouts common"],
        levels: [
          { label: "PM High", value: "$1.44" },
          { label: "VWAP", value: "$1.31" },
          { label: "PDC", value: "$1.22" },
          { label: "Support", value: "$1.28" },
        ],
        plan: {
          trigger: "Wait for clean break + hold above PM High; avoid mid-range.",
          invalidation: "If it rejects PM High twice, no trade.",
          note: "Only A+ tape; otherwise pass.",
        },
      },
      {
        state: "SKIP",
        ticker: "$MULN",
        timestamp: "LIVE • 11:22:09 ET",
        catalyst: "Momentum present, but dilution/offering risk dominates",
        confidence: "High Risk",
        priceAction: { changePct: "+2.1%", last: "$0.094", relVol: "1.1x", float: "Heavy Dilution" },
        riskFlags: ["Offering risk detected", "Unfavorable liquidity", "Failed reclaim attempts"],
        levels: [
          { label: "PM High", value: "$0.101" },
          { label: "VWAP", value: "$0.096" },
          { label: "PDC", value: "$0.091" },
          { label: "Support", value: "$0.090" },
        ],
        plan: {
          trigger: "Do not engage.",
          invalidation: "N/A",
          note: "Protect capital—wait for a cleaner setup elsewhere.",
        },
      },
    ],
    []
  );

  // Visual theme per state
  const theme = {
    TRADEABLE: {
      pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      glow: "from-emerald-500/18 to-cyan-500/18",
      accent: "rgba(16,185,129,0.38)",
    },
    CAUTION: {
      pill: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      glow: "from-yellow-500/18 to-cyan-500/18",
      accent: "rgba(234,179,8,0.34)",
    },
    SKIP: {
      pill: "bg-red-500/15 text-red-300 border-red-500/30",
      glow: "from-red-500/18 to-cyan-500/18",
      accent: "rgba(239,68,68,0.33)",
    },
  };

  /**
   * Timing (tuned for “seamless / premium”)
   * - Assemble is readable
   * - Hold is long enough to actually see the card
   * - Glitch is a quick punctuation mark
   * - Flip is smooth
   */
  const STEPS = 6; // header, catalyst, stats, risk, levels+plan, sources
  const STEP_MS = 520;          // slower build
  const COMPLETE_HOLD_MS = 1400; // linger on finished card
  const PULSE_ON_MS = 140;
  const PULSE_OFF_MS = 520;
  const GLITCH_MS = 160;
  const BEFORE_FLIP_MS = 160;   // tiny gap after glitch before flip
  const FLIP_MS = 1150;         // slower, smoother flip
  const BETWEEN_MS = 260;       // breathing room before next build starts

  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(1);

  const [step, setStep] = useState(0);
  const [flip, setFlip] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [pulse, setPulse] = useState(false);

  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    clearTimers();

    // Reset state for new cycle
    setStep(0);
    setPulse(false);
    setGlitch(false);
    setFlip(false);

    // Assemble steps using interval (smoother than chained recursive timeouts)
    let current = 0;
    const buildInterval = setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= STEPS) {
        clearInterval(buildInterval);
      }
    }, STEP_MS);

    timersRef.current.push(buildInterval);

    const builtAt = STEP_MS * STEPS;

    // Stabilize pulse shortly after fully built
    const tPulseOn = setTimeout(() => setPulse(true), builtAt + PULSE_ON_MS);
    const tPulseOff = setTimeout(() => setPulse(false), builtAt + PULSE_OFF_MS);

    // Glitch near the end of the hold, right before flipping (feels intentional)
    const tGlitchOn = setTimeout(() => setGlitch(true), builtAt + COMPLETE_HOLD_MS);
    const tGlitchOff = setTimeout(() => setGlitch(false), builtAt + COMPLETE_HOLD_MS + GLITCH_MS);

    // Flip after glitch
    const tFlipOn = setTimeout(() => setFlip(true), builtAt + COMPLETE_HOLD_MS + GLITCH_MS + BEFORE_FLIP_MS);

    // After flip completes, advance indices and restart cycle
    const tFlipDone = setTimeout(() => {
      setFlip(false);

      const nextFront = backIdx;
      const nextBack = (backIdx + 1) % cards.length;

      setFrontIdx(nextFront);
      setBackIdx(nextBack);
      // effect re-runs naturally due to idx state change
    }, builtAt + COMPLETE_HOLD_MS + GLITCH_MS + BEFORE_FLIP_MS + FLIP_MS + BETWEEN_MS);

    timersRef.current.push(tPulseOn, tPulseOff, tGlitchOn, tGlitchOff, tFlipOn, tFlipDone);

    return () => clearTimers();
  }, [frontIdx, backIdx, cards.length]);

  const frontCard = cards[frontIdx];
  const backCard = cards[backIdx];
  const frontTheme = theme[frontCard.state];

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <style>{`
        @keyframes kairosGlitchShift {
          0%   { transform: translate3d(0,0,0); opacity: 0; }
          10%  { opacity: .92; }
          20%  { transform: translate3d(-8px,0,0); }
          35%  { transform: translate3d(8px,0,0); }
          50%  { transform: translate3d(-4px,0,0); }
          70%  { transform: translate3d(4px,0,0); }
          100% { transform: translate3d(0,0,0); opacity: 0; }
        }
        @keyframes kairosScanline {
          0%   { transform: translateY(-120%); opacity: 0.10; }
          20%  { opacity: 0.55; }
          100% { transform: translateY(160%); opacity: 0.12; }
        }
      `}</style>

      {/* Slot frame + state glow */}
      <div className="absolute -inset-3 rounded-3xl border border-white/10 bg-white/5" />
      <div
        className={`absolute -inset-6 rounded-[28px] bg-gradient-to-r ${frontTheme.glow} blur-2xl opacity-70`}
      />

      {/* Continuous scanline, subtle */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
        <div
          className="absolute left-0 w-full h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent"
          style={{ animation: "kairosScanline 3.6s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://transparenttextures.com/patterns/diagmonds-light.png')]" />
      </div>

      {/* Glitch overlay */}
      {glitch && (
        <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden z-30">
          <div
            className="absolute inset-0"
            style={{
              animation: `kairosGlitchShift ${GLITCH_MS}ms linear forwards`,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.0), rgba(6,182,212,0.12), rgba(255,255,255,0.0))",
              mixBlendMode: "screen",
            }}
          />
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0"
              style={{
                top: `${10 + i * 12}%`,
                height: `${2 + (i % 3)}px`,
                background:
                  i % 2 === 0 ? "rgba(6,182,212,0.22)" : "rgba(255,255,255,0.10)",
                transform: `translateX(${(i % 2 === 0 ? -1 : 1) * (10 + i * 2)}px)`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      )}

      {/* 3D flip stage */}
      <div className="relative z-10 perspective-[1800px]">
        <motion.div
          className="relative"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flip ? 180 : 0 }}
          transition={{
            duration: FLIP_MS / 1000,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {/* FRONT FACE */}
          <div style={{ backfaceVisibility: "hidden", transform: "translateZ(0px)" }}>
            <CardAssembled card={frontCard} theme={theme} step={step} pulse={pulse} />
          </div>

          {/* BACK FACE (always fully assembled for clean flip) */}
          <div
            className="absolute inset-0"
            style={{
              transform: "rotateY(180deg) translateZ(0px)",
              backfaceVisibility: "hidden",
            }}
          >
            <CardAssembled card={backCard} theme={theme} step={STEPS} pulse={false} />
          </div>
        </motion.div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-2">
        {cards.map((c, i) => (
          <div
            key={c.state}
            className={`h-1.5 w-6 rounded-full transition ${
              i === frontIdx ? "bg-cyan-300/70" : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const CardAssembled = ({ card, theme, step, pulse }) => {
  const t = theme[card.state];

  return (
    <div className="relative">
      {/* Stabilize pulse */}
      {pulse && (
        <motion.div
          className="absolute -inset-3 rounded-3xl"
          initial={{ opacity: 0, scale: 0.997 }}
          animate={{ opacity: 1, scale: 1.01 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: `radial-gradient(circle at 50% 30%, ${t.accent}, transparent 62%)`,
            filter: "blur(16px)",
          }}
        />
      )}

      <div className="relative bg-slate-950 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        {/* HEADER */}
        <AssembleGate show={step >= 1} delay={0.00}>
          <div className="px-5 py-4 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-white font-extrabold tracking-tight text-lg">{card.ticker}</div>
              <div className="text-xs font-mono text-slate-400">{card.timestamp}</div>
            </div>
            <div className={`text-xs font-bold px-3 py-1 rounded-full border ${t.pill}`}>
              {card.state}
            </div>
          </div>
        </AssembleGate>

        <div className="p-5 space-y-4">
          {/* CATALYST */}
          <AssembleGate show={step >= 2} delay={0.06}>
            <MachineBlock accent={t.accent}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-xs font-mono">CATALYST</div>
                <div className="text-cyan-300 text-xs font-mono">CONFIDENCE: {card.confidence}</div>
              </div>
              <div className="text-white font-semibold leading-snug">{card.catalyst}</div>
            </MachineBlock>
          </AssembleGate>

          {/* STATS */}
          <AssembleGate show={step >= 3} delay={0.08}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatMini label="MOVE" value={card.priceAction.changePct} />
              <StatMini label="LAST" value={card.priceAction.last} />
              <StatMini label="REL VOL" value={card.priceAction.relVol} />
              <StatMini label="FLOAT" value={card.priceAction.float} />
            </div>
          </AssembleGate>

          {/* RISK */}
          <AssembleGate show={step >= 4} delay={0.10}>
            <MachineBlock accent={t.accent}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-cyan-300" />
                <div className="text-slate-300 text-xs font-mono">RISK FLAGS</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {card.riskFlags.map((r, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-900/70 border border-slate-700 text-slate-200"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </MachineBlock>
          </AssembleGate>

          {/* LEVELS + PLAN */}
          <AssembleGate show={step >= 5} delay={0.12}>
            <div className="grid md:grid-cols-2 gap-4">
              <MachineBlock accent={t.accent}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={14} className="text-emerald-300" />
                  <div className="text-slate-300 text-xs font-mono">KEY LEVELS</div>
                </div>
                <div className="space-y-2">
                  {card.levels.map((lv, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="text-slate-400 text-sm">{lv.label}</div>
                      <div className="text-white font-bold">{lv.value}</div>
                    </div>
                  ))}
                </div>
              </MachineBlock>

              <MachineBlock accent={t.accent}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-cyan-300" />
                  <div className="text-slate-300 text-xs font-mono">PLAN</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-mono text-xs">TRIGGER:</span>{" "}
                    {card.plan.trigger}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-mono text-xs">INVALIDATE:</span>{" "}
                    {card.plan.invalidation}
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500 font-mono text-xs">NOTE:</span>{" "}
                    {card.plan.note}
                  </div>
                </div>
              </MachineBlock>
            </div>
          </AssembleGate>

          {/* SOURCES */}
          <AssembleGate show={step >= 6} delay={0.14}>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Press Release", "SEC Filings", "Headlines"].map((x, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-700 text-slate-200"
                >
                  {x} <span className="opacity-60">↗</span>
                </span>
              ))}
            </div>
          </AssembleGate>
        </div>
      </div>
    </div>
  );
};

// Reveal gate with smoother easing + optional delay
const AssembleGate = ({ show, delay = 0, children }) => {
  return (
    <motion.div
      initial={false}
      animate={
        show
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: 12, filter: "blur(8px)" }
      }
      transition={{
        duration: 0.55,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ willChange: "transform, opacity, filter" }}
    >
      <motion.div
        initial={false}
        animate={show ? { clipPath: "inset(0% 0% 0% 0%)" } : { clipPath: "inset(0% 0% 100% 0%)" }}
        transition={{
          duration: 0.70,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

const MachineBlock = ({ accent, children }) => {
  return (
    <div className="relative bg-white/5 border border-white/10 rounded-xl p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.10]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "100% 10px",
          }}
        />
      </div>

      <motion.div
        className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2"
        initial={{ x: "-40%" }}
        animate={{ x: "240%" }}
        transition={{ duration: 1.55, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.9 }}
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.16,
          filter: "blur(12px)",
        }}
      />

      <div className="relative">{children}</div>
    </div>
  );
};

const StatMini = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
    <div className="text-slate-500 text-[10px] font-mono">{label}</div>
    <div className="text-white font-bold">{value}</div>
  </div>
);

export default BriefCardShowcaseUltra;
