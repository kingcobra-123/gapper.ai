import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Activity,
  Zap,
  Shield,
  ArrowRight,
  Layers,
  ChevronRight,
} from "lucide-react";
import PipelineTelemetry from "./PipelineTelemetry";
import { BriefCardShowcaseUltra } from "./BriefCardShowcaseUltra";

// --- UTILITY: SMOOTH REVEAL TEXT ---
const SmoothRevealText = ({ text, trigger, delay = 0 }) => {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!trigger) return;

    let timeout;
    let interval;

    timeout = setTimeout(() => {
      let index = 0;
      interval = setInterval(() => {
        setDisplay(text.substring(0, index + 1));
        index++;
        if (index >= text.length) clearInterval(interval);
      }, 50);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, trigger, delay]);

  return <span className="font-mono tracking-normal">{display}</span>;
};

/**
 * Gapper.ai Agent Stack Mark
 */
const GapperMark = ({ className = "w-7 h-7" }) => {
  return (
    <svg
      viewBox="0 0 62 62"
      className={className}
      style={{ filter: "drop-shadow(0 0 10px rgba(34,211,238,.22))" }}
    >
      <defs>
        <filter id="gapperGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="gapperCutEdge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(34,211,238,0)" />
          <stop offset=".55" stopColor="rgba(34,211,238,.55)" />
          <stop offset="1" stopColor="rgba(52,211,153,0)" />
        </linearGradient>
        <mask id="gapperRevealCut">
          <rect x="0" y="0" width="62" height="62" fill="black" />
          <rect x="0" y="50" width="62" height="0" fill="white">
            <animate
              attributeName="y"
              values="50;8;8;50"
              dur="1.8s"
              repeatCount="indefinite"
              keyTimes="0;0.55;0.75;1"
            />
            <animate
              attributeName="height"
              values="0;42;42;0"
              dur="1.8s"
              repeatCount="indefinite"
              keyTimes="0;0.55;0.75;1"
            />
          </rect>
        </mask>
      </defs>
      <style>{`
        .g-layer{ fill: rgba(255,255,255,.03); stroke: rgba(148,163,184,.22); stroke-width: 2.2; stroke-linejoin: round; }
        .g-a{ stroke: rgba(34,211,238,.85); fill: rgba(34,211,238,.10); filter: url(#gapperGlow); }
        .g-b{ stroke: rgba(52,211,153,.85); fill: rgba(52,211,153,.10); filter: url(#gapperGlow); }
        @keyframes glowPulse { 0%, 12% { opacity: .20; } 18%, 34% { opacity: 1; } 45%, 100% { opacity: .22; } }
        #gL3 { animation: glowPulse 1.8s ease-in-out infinite; }
        #gL2 { animation: glowPulse 1.8s ease-in-out infinite .22s; }
        #gL1 { animation: glowPulse 1.8s ease-in-out infinite .44s; }
      `}</style>
      <path
        id="gL1"
        className="g-layer g-a"
        d="M31 10 49 22 31 34 13 22 31 10Z"
      />
      <path
        id="gL2"
        className="g-layer g-b"
        d="M31 18 49 30 31 42 13 30 31 18Z"
      />
      <path id="gL3" className="g-layer" d="M31 26 49 38 31 50 13 38 31 26Z" />
      <g mask="url(#gapperRevealCut)">
        <rect
          x="29"
          y="8"
          width="4"
          height="42"
          rx="2"
          fill="#030712"
          opacity=".98"
        />
        <rect
          x="28.6"
          y="8"
          width="4.8"
          height="42"
          rx="2.4"
          fill="url(#gapperCutEdge)"
          opacity=".55"
        />
      </g>
    </svg>
  );
};

// --- BACKGROUND ANIMATION ---
const ParticleNetwork = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId;
    let particles = [];
    const particleCount = window.innerWidth < 768 ? 30 : 80;
    const connectionDistance = 150;
    const moveSpeed = 0.3;
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      init();
    };
    class Particle {
      constructor() {
        this.x = Math.random() * (canvas.width / window.devicePixelRatio);
        this.y = Math.random() * (canvas.height / window.devicePixelRatio);
        this.vx = (Math.random() - 0.5) * moveSpeed;
        this.vy = (Math.random() - 0.5) * moveSpeed;
        this.size = Math.random() * 2 + 1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        const w = canvas.width / window.devicePixelRatio;
        const h = canvas.height / window.devicePixelRatio;
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
      }
      draw() {
        ctx.fillStyle = "rgba(6, 182, 212, 0.5)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };
    const animate = () => {
      ctx.clearRect(
        0,
        0,
        canvas.width / window.devicePixelRatio,
        canvas.height / window.devicePixelRatio
      );
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${
              1 - (dist / connectionDistance) * 0.4
            })`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    resize();
    animate();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 opacity-40 pointer-events-none w-full h-full"
    />
  );
};

// --- TERMINAL ANIMATION ---
const TerminalAnimation = () => {
  const [logs, setLogs] = useState([]);
  const [currentTicker, setCurrentTicker] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  const logContainerRef = useRef(null);

  const sampleTickers = [
    { t: "$LUNR", cat: "NASA Contract Award" },
    { t: "$SPCE", cat: "Test Flight Success" },
    { t: "$AI", cat: "Earnings Beat + Guidance" },
    { t: "$MARA", cat: "Bitcoin Rally Correlation" },
    { t: "$PLTR", cat: "New Defense Contract" },
  ];

  const processingSteps = [
    "SCANNING_MARKET_FEED...",
    "VOLUME_SPIKE_DETECTED...",
    "INITIATING_MCP_AGENTS...",
    "AGENT[NEWS]: SCRAPING_PR_WIRES...",
    "AGENT[SEC]: PARSING_EDGAR_8K...",
    "AGENT[RISK]: CHECKING_DILUTION_S3...",
    "SYNTHESIZING_BRIEF_CARD...",
    "STATUS: READY_FOR_EXECUTION",
  ];

  useEffect(() => {
    let stepCounter = 0;
    let tickerIndex = 0;
    const processInterval = setInterval(() => {
      if (stepCounter === 0) {
        setCurrentTicker(sampleTickers[tickerIndex]);
        setLogs((prev) => [
          ...prev,
          `> [${new Date().toLocaleTimeString()}] NEW TARGET ACQUIRED: ${
            sampleTickers[tickerIndex].t
          }`,
        ]);
      }
      setProcessingStep(stepCounter);
      setLogs((prev) => [...prev, `> ${processingSteps[stepCounter]}`]);
      stepCounter++;
      if (stepCounter >= processingSteps.length) {
        stepCounter = 0;
        tickerIndex = (tickerIndex + 1) % sampleTickers.length;
        setLogs((prev) => [...prev, `--- WAITING FOR NEXT EVENT ---`]);
      }
    }, 1500);
    return () => clearInterval(processInterval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current)
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="relative group">
      <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-xl blur-xl opacity-70 group-hover:opacity-100 transition duration-1000"></div>
      <div className="relative bg-slate-950 border border-slate-800/60 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <span className="text-xs font-mono text-slate-400 ml-2">
              MOMENTUM_ENGINE.exe - PID: 8821
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400">LIVE</span>
          </div>
        </div>
        <div className="p-6 font-mono text-xs md:text-sm h-[400px] flex flex-col relative">
          <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none"></div>
          <div className="mb-6 p-4 bg-slate-900/50 border border-cyan-500/30 rounded-lg grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-slate-500 mb-1">TARGET</div>
              <div className="text-xl font-bold text-white animate-pulse">
                {currentTicker ? currentTicker.t : "---"}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-slate-500 mb-1">UNLEASHING GAPPER.AI</div>
              <div className="h-6 bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500 ease-out relative"
                  style={{
                    width: `${
                      ((processingStep + 1) / processingSteps.length) * 100
                    }%`,
                  }}
                >
                  <div className="absolute right-0 top-0 h-full w-1 bg-white blur-[2px] animate-pulse"></div>
                </div>
              </div>
              <div className="text-xs text-cyan-400 mt-1 text-right">
                {processingSteps[processingStep]}
              </div>
            </div>
          </div>
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto space-y-1 text-slate-300 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-2"
          >
            {logs.map((log, index) => (
              <div
                key={index}
                className={`${
                  log.includes("NEW TARGET")
                    ? "text-emerald-400 pt-2"
                    : log.includes("WAITING")
                    ? "text-slate-600 py-2"
                    : ""
                }`}
              >
                {log}
              </div>
            ))}
            <div className="flex items-center text-cyan-400">
              <span>{">"}</span>
              <span className="ml-2 w-2 h-4 bg-cyan-400 animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NAVBAR ---
const Navbar = () => {
  const scrollToAccess = () => {
    const accessSection = document.getElementById("access");
    if (accessSection) {
      accessSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="fixed w-full z-50 bg-slate-950/60 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GapperMark className="w-12 h-12" />
          <span className="text-xl font-bold text-white tracking-tight leading-none">
            Gapper
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              .ai
            </span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
          <a href="#technology" className="hover:text-white transition">
            Technology
          </a>
          <a href="#features" className="hover:text-white transition">
            Features
          </a>
          <a href="#access" className="hover:text-white transition">
            Early Access
          </a>
        </div>
        <div>
          <button
            onClick={scrollToAccess}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 group"
          >
            Join Waitlist{" "}
            <ChevronRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </div>
    </nav>
  );
};

const FeatureBox = ({ icon: Icon, title, desc }) => (
  <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition duration-300 hover:border-cyan-500/30 group relative overflow-hidden">
    <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
    <div className="relative">
      <div className="bg-slate-900/80 p-3 inline-block rounded-xl border border-white/10 mb-6 group-hover:border-cyan-400/50 transition">
        <Icon className="text-cyan-400" size={24} />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default function App() {
  const [startAnim, setStartAnim] = useState(false);
  useEffect(() => {
    setStartAnim(true);
  }, []);

  const scrollToAccess = () => {
    const accessSection = document.getElementById("access");
    if (accessSection) {
      accessSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans overflow-x-hidden selection:bg-cyan-500/20">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <ParticleNetwork />

        {/* Telemetry: Visible on Mobile & Desktop */}
        <div className="absolute inset-x-0 top-0 pointer-events-none">
          <div className="relative max-w-7xl mx-auto h-[640px] md:h-[760px] lg:h-[860px]">
            <PipelineTelemetry />
          </div>
        </div>

        {/* Mobile Atmosphere */}
        <div className="absolute inset-0 md:hidden pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs md:text-sm font-mono text-cyan-300 mb-8 backdrop-blur-sm">
              <Zap size={14} /> NEXT-GEN MOMENTUM INTELLIGENCE
            </div>

            {/* FIXED HEADLINE: Removed whitespace-nowrap, adjusted sizing */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              <span className="block text-white whitespace-nowrap">
                The Move Happens
              </span>
              <span className="block text-slate-500">
                Before You Find The Reason.
              </span>
            </h1>

            {/* FIXED PUNCHLINE: Sizing adjusted */}
            <div className="text-lg md:text-xl font-bold font-mono tracking-wide mb-8">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                <SmoothRevealText
                  text="STOP BEING LIQUIDITY."
                  trigger={startAnim}
                  delay={1000}
                />
              </span>
            </div>

            {/* Subtext */}
            <p className="text-base md:text-lg text-slate-400 mb-10 leading-relaxed max-w-xl">
              The crowd guesses. You don’t. Gapper’s multi-agent system reads
              news, SEC filings, PR, and socials, scans dilution risk, and
              delivers the only question that matters:
              <span className="font-bold ml-2">
                <span className="text-emerald-400">Treadable</span> or{" "}
                <span className="text-red-500">Trap</span>?
              </span>
            </p>

            {/* FIXED BUTTONS: Full width on mobile, auto on desktop */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={scrollToAccess}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white px-8 py-4 rounded-lg text-lg font-bold transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-3"
              >
                Request Terminal Access <ArrowRight />
              </button>
              <button
                onClick={scrollToAccess}
                className="w-full sm:w-auto bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 px-8 py-4 rounded-lg text-lg font-bold transition flex items-center justify-center gap-3"
              >
                Watch the Demo
              </button>
            </div>
          </div>
        </div>

        {/* TERMINAL */}
        <div className="relative z-10 mt-16 md:mt-20">
          <div className="max-w-4xl mx-auto">
            <div className="perspective-[2000px]">
              <div className="transform-gpu rotate-y-[-5deg] rotate-x-[2deg] hover:rotate-0 transition-all duration-1000 ease-out origin-top scale-[1] md:scale-[1.10]">
                <TerminalAnimation />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRIEF CARD */}
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Intelligence Cards
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Every signal is synthesized into an actionable brief card with
              risk flags, key levels, and execution plan.
            </p>
          </div>
          <BriefCardShowcaseUltra />
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">
              Complete Market Situational Awareness
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Close the browser tabs. Ignore the noise. Gapper condenses the
              entire market narrative into a single stream of high-conviction
              intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureBox
              icon={Layers}
              title="Multi-Agent Synthesis"
              desc="Multi specialized agents work in concert to cross-reference news, SEC filings, and technicals—hallucination-proofing every signal."
            />
            <FeatureBox
              icon={Shield}
              title="The Dilution Shield"
              desc="Rug pulls hide in the filings. We instantly parse active S-3 and ATM shelf registrations to detect toxic financing before the trap snaps shut."
            />
            <FeatureBox
              icon={Terminal}
              title="Sub-200ms Latency"
              desc="Speed is safety. From catalyst detection to full brief generation, our pipeline executes faster than a human blink. By the time you read it, the work is done."
            />
          </div>
        </div>
      </section>

      {/* FIXED ACCESS SECTION: Adjusted padding and width */}
      <section id="access" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-cyan-950/20 to-[#030712]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10 bg-slate-900/50 border border-white/10 p-8 md:p-16 rounded-3xl backdrop-blur-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            Get the unfair advantage—before it’s public.
          </h2>
          <p className="text-slate-300 mb-10 text-base md:text-lg">
            Gapper is currently restricted to a small group of high-volume
            traders. Secure your position in line for early access.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto w-full">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-6 py-4 text-white focus:outline-none focus:border-cyan-500 transition"
            />
            <button className="w-full sm:w-auto bg-white text-slate-950 px-8 py-4 rounded-lg font-bold hover:bg-cyan-50 transition whitespace-nowrap">
              Secure My Edge
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-6">
            Limited spots. Rolling invites.
          </p>
        </div>
      </section>

      <footer className="py-10 text-center border-t border-white/5 text-slate-500 text-sm">
        <p>
          © 2026 Gapper.ai. <br className="md:hidden" />
          Built for the next generation of traders.
        </p>
      </footer>
    </div>
  );
}
