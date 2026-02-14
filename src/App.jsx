import React, { useState, useEffect, useRef, useCallback } from "react";
import posthog from "posthog-js";
import Manifesto from "./Manifesto"; // <--- 1. IMPORT MANIFESTO
import AuthModal from "./auth/AuthModal";
import { useAuth } from "./auth/AuthProvider";
import { AuthPlanProvider } from "./gapper_fe/src/auth/AuthPlanContext";
import { TerminalPlanGate } from "./gapper_fe/src/components/auth/TerminalPlanGate";
import TerminalWorkspacePage from "./terminal/TerminalWorkspacePage";
import {
  Terminal,
  Activity,
  Zap,
  Shield,
  ArrowRight,
  Layers,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  FileText,
  AlertTriangle, // Added for Read Protocol button effect
} from "lucide-react";
import PipelineTelemetry from "./PipelineTelemetry";
import { BriefCardShowcaseUltra } from "./BriefCardShowcaseUltra";

// --- UTILITY FUNCTIONS ---
const getClientMeta = () => {
  return {
    user_agent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
    referrer: document.referrer || "direct",
  };
};

const getIntelligence = async () => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    return {
      worker_center: data.city || "Unknown",
      device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
        ? "Mobile"
        : "Desktop",
      timezone: data.timezone || "Unknown",
    };
  } catch (error) {
    return {
      worker_center: "Unknown",
      device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
        ? "Mobile"
        : "Desktop",
      timezone: "Unknown",
    };
  }
};

const AUTH_BUTTONS_DISABLED_TITLE =
  "Supabase auth is unavailable. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
const NAV_PRIMARY_BUTTON_CLASS =
  "bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed";
const NAV_SECONDARY_BUTTON_CLASS =
  "bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed";
const AUTH_PLACEHOLDER_CLASS = "w-[240px] opacity-0 pointer-events-none";

function premiumGateEnabled() {
  const raw =
    import.meta.env.VITE_PREMIUM_GATE_ENABLED ??
    import.meta.env.NEXT_PUBLIC_PREMIUM_GATE_ENABLED;
  const normalized = String(raw ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

const VIEW_LANDING = "landing";
const VIEW_TERMINAL = "terminal";

function pathForView(view) {
  return view === VIEW_TERMINAL ? "/terminal" : "/";
}

function viewForPath(pathname) {
  return pathname === "/terminal" ? VIEW_TERMINAL : VIEW_LANDING;
}

function getInitialView() {
  if (typeof window === "undefined") {
    return VIEW_LANDING;
  }
  return viewForPath(window.location.pathname);
}

function syncPathToView(view, { replace = false } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const nextPath = pathForView(view);
  if (window.location.pathname === nextPath) {
    return;
  }

  if (replace) {
    window.history.replaceState(null, "", nextPath);
    return;
  }

  window.history.pushState(null, "", nextPath);
}

// --- COMPONENTS ---
const SmoothRevealText = ({ text, trigger, delay = 0 }) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => setRevealed(true), delay);
      return () => clearTimeout(timer);
    }
  }, [trigger, delay]);

  return (
    <span className="inline-block">
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={`inline-block transition-all duration-500 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: `${delay + i * 30}ms` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
};

const GapperMark = ({ className }) => {
  // Generate unique IDs for this instance to avoid conflicts
  const uniqueId = useRef(Math.random().toString(36).substr(2, 9)).current;
  const glowFilterId = `gapperGlow-${uniqueId}`;
  const cutEdgeId = `cutEdge-${uniqueId}`;
  const revealCutId = `revealCut-${uniqueId}`;

  return (
    <svg
      className={className}
      viewBox="0 0 62 62"
      role="img"
      aria-label="Gapper.ai Agent Stack Mark"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={glowFilterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={cutEdgeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(34,211,238,0)" />
          <stop offset="0.55" stopColor="rgba(34,211,238,0.55)" />
          <stop offset="1" stopColor="rgba(52,211,153,0)" />
        </linearGradient>
        <mask id={revealCutId}>
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

      {/* BOTTOM LAYER */}
      <path
        d="M31 26 49 38 31 50 13 38 31 26Z"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(148,163,184,0.22)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        className="gapper-layer"
        style={{
          animation: "gapperGlowPulse 1.8s ease-in-out infinite",
        }}
      />

      {/* MID LAYER */}
      <path
        d="M31 18 49 30 31 42 13 30 31 18Z"
        fill="rgba(52,211,153,0.10)"
        stroke="rgba(52,211,153,0.85)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        className="gapper-layer"
        style={{
          animation: "gapperGlowPulse 1.8s ease-in-out infinite 0.22s",
        }}
      />

      {/* TOP LAYER */}
      <path
        d="M31 10 49 22 31 34 13 22 31 10Z"
        fill="rgba(34,211,238,0.10)"
        stroke="rgba(34,211,238,0.85)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        className="gapper-layer"
        style={{
          animation: "gapperGlowPulse 1.8s ease-in-out infinite 0.44s",
        }}
      />

      {/* CUT with reveal animation */}
      <g mask={`url(#${revealCutId})`}>
        <rect
          x="29"
          y="8"
          width="4"
          height="42"
          rx="2"
          fill="#030712"
          opacity="0.98"
        />
        <rect
          x="28.6"
          y="8"
          width="4.8"
          height="42"
          rx="2.4"
          fill={`url(#${cutEdgeId})`}
          opacity="0.55"
        />
      </g>
    </svg>
  );
};

const ParticleNetwork = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    const particles = [];
    const particleCount = 50;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
    });

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.1)";
      ctx.fillStyle = "rgba(34, 211, 238, 0.5)";

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

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
      className="absolute inset-0 w-full h-full pointer-events-none"
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

const FeatureBox = ({ icon: Icon, title, desc }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-cyan-500/10 rounded-lg">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
};

// --- UPDATE NAVBAR COMPONENT ---
// Pass actions as props
const Navbar = ({
  onOpenManifesto,
  onOpenSignIn,
  onOpenSignUp,
  onSignOut,
  onOpenWebTerminal,
  onJoinWaitlist,
  authLoading,
  authActionBusy,
  supabaseConfigured,
  user,
  authDisplayName,
}) => {
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

        {/* CENTER LINKS */}
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
          {/* --- NEW HIGH ATTENTION MANIFESTO TRIGGER --- */}
          <button
            onClick={onOpenManifesto}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 hover:border-red-500/60 px-3 py-1.5 rounded transition-all group animate-[pulse_3s_ease-in-out_infinite] hover:animate-none hover:bg-red-500/20"
          >
            <AlertTriangle size={14} className="text-red-500" />
            <span className="font-mono text-xs font-bold text-red-200 tracking-wider">
              READ_PROTOCOL
            </span>
          </button>
          {/* ------------------------- */}

          <a href="#features" className="hover:text-white transition">
            Features
          </a>
          <a href="#access" className="hover:text-white transition">
            Early Access
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center justify-end min-w-[240px]">
            {authLoading ? (
              <div className={AUTH_PLACEHOLDER_CLASS}>
                <button className={NAV_PRIMARY_BUTTON_CLASS}>Sign up</button>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenWebTerminal}
                  className={NAV_PRIMARY_BUTTON_CLASS}
                  disabled={authActionBusy}
                >
                  Web Terminal
                </button>
                <button
                  onClick={onSignOut}
                  className={NAV_SECONDARY_BUTTON_CLASS}
                  disabled={authActionBusy}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSignIn}
                  className={NAV_SECONDARY_BUTTON_CLASS}
                  disabled={!supabaseConfigured}
                  title={!supabaseConfigured ? AUTH_BUTTONS_DISABLED_TITLE : ""}
                >
                  Sign in
                </button>
                <button
                  onClick={onOpenSignUp}
                  className={NAV_PRIMARY_BUTTON_CLASS}
                  disabled={!supabaseConfigured}
                  title={!supabaseConfigured ? AUTH_BUTTONS_DISABLED_TITLE : ""}
                >
                  Sign up
                </button>
              </div>
            )}
          </div>

          {authLoading ? (
            <div className="w-[154px] opacity-0 pointer-events-none">
              <button className={NAV_PRIMARY_BUTTON_CLASS}>Join Waitlist</button>
            </div>
          ) : !user ? (
            <button onClick={onJoinWaitlist} className={NAV_PRIMARY_BUTTON_CLASS}>
              Join Waitlist{" "}
              <ChevronRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenWebTerminal}
                className="md:hidden bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg text-xs font-semibold transition"
                disabled={authActionBusy}
              >
                Terminal
              </button>
              <button
                onClick={onSignOut}
                className="md:hidden bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-xs font-semibold transition"
                disabled={authActionBusy}
              >
                Sign out
              </button>
              <span
                className="hidden md:inline-flex max-w-[220px] truncate text-xs text-slate-300 border border-white/10 rounded-lg px-3 py-2.5"
                title={authDisplayName}
              >
                Logged in as {authDisplayName}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const {
    session,
    loading,
    profileLoading,
    profile,
    user,
    supabaseConfigured,
    signOut,
  } = useAuth();
  const [startAnim, setStartAnim] = useState(false);

  // 2. STATE FOR MANIFESTO
  const [showManifesto, setShowManifesto] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("signin");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authActionBusy, setAuthActionBusy] = useState(false);
  const [activeView, setActiveView] = useState(getInitialView);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const authUiLoading = loading || profileLoading;
  const authDisplayName =
    user?.user_metadata?.username?.trim() ||
    profile?.email ||
    user?.email ||
    "Authenticated User";
  const gateEnabled = premiumGateEnabled();
  const setActiveViewWithPath = useCallback((nextView, { replace = false } = {}) => {
    syncPathToView(nextView, { replace });
    setActiveView(nextView);
  }, []);

  useEffect(() => {
    setStartAnim(true);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(viewForPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (activeView === VIEW_TERMINAL && !loading && !user) {
      setAuthModalMode("signin");
      setAuthModalOpen(true);
    }
  }, [activeView, loading, user]);

  const scrollToAccess = () => {
    const accessSection = document.getElementById("access");
    if (accessSection) {
      accessSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle "Secure Your Edge" button in Manifesto modal
  const handleManifestoSecureEdge = () => {
    setShowManifesto(false); // Close modal
    setTimeout(() => {
      scrollToAccess(); // Scroll to email form after modal closes
    }, 100);
  };

  const openAuthModal = (mode) => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    setAuthActionBusy(true);
    const { error } = await signOut();

    if (error) {
      console.error("[auth] signOut error", error);
    }

    setAuthActionBusy(false);
  };

  const handleOpenWebTerminal = () => {
    if (!user) {
      openAuthModal("signin");
      return;
    }

    setActiveViewWithPath(VIEW_TERMINAL);
  };

  const handleJoinWaitlist = async (e) => {
    // ... (Keep your exact existing handleJoinWaitlist logic) ...
    // I am omitting it here for brevity, but DO NOT DELETE IT in your file.
    // Just paste the function body you already have.
    e.preventDefault();
    setErrorMessage("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    const [clientData, intelligenceData] = await Promise.all([
      Promise.resolve(getClientMeta()),
      getIntelligence(),
    ]);
    const payload = {
      email,
      _subject: `New Lead (${
        intelligenceData.worker_center || "Unknown"
      }): ${email}`,
      ...clientData,
      ...intelligenceData,
    };
    const FORMSPREE_ENDPOINT = "https://formspree.io/f/xnjnejje";
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setStatus("success");
        posthog.identify(email);
        posthog.capture("waitlist_submitted", {
          location_center: intelligenceData.worker_center,
          device_type: intelligenceData.device_type,
        });
        setEmail("");
      } else {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again later.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection.");
    }
  };

  if (activeView === VIEW_TERMINAL) {
    return (
      <>
        <AuthModal
          mode={authModalMode}
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSwitchMode={setAuthModalMode}
        />
        <AuthPlanProvider
          sessionToken={session?.access_token ?? null}
          gateEnabled={gateEnabled}
        >
          <TerminalPlanGate
            authenticated={Boolean(user)}
            onOpenSignIn={() => openAuthModal("signin")}
            onSignOut={() => {
              void handleSignOut();
            }}
          >
            <TerminalWorkspacePage />
          </TerminalPlanGate>
        </AuthPlanProvider>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans overflow-x-hidden selection:bg-cyan-500/20">
      {/* 3. RENDER MANIFESTO MODAL */}
      <Manifesto
        isOpen={showManifesto}
        onClose={() => setShowManifesto(false)}
        onSecureEdge={handleManifestoSecureEdge}
      />
      <AuthModal
        mode={authModalMode}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSwitchMode={setAuthModalMode}
      />

      {/* 4. PASS OPEN FUNCTION TO NAVBAR */}
      <Navbar
        onOpenManifesto={() => setShowManifesto(true)}
        onOpenSignIn={() => openAuthModal("signin")}
        onOpenSignUp={() => openAuthModal("signup")}
        onSignOut={handleSignOut}
        onOpenWebTerminal={handleOpenWebTerminal}
        onJoinWaitlist={scrollToAccess}
        authLoading={authUiLoading}
        authActionBusy={authActionBusy}
        supabaseConfigured={supabaseConfigured}
        user={user}
        authDisplayName={authDisplayName}
      />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* ... (Keep existing ParticleNetwork) ... */}
        <ParticleNetwork />

        <div className="absolute inset-x-0 top-0 pointer-events-none">
          <div className="relative max-w-7xl mx-auto h-[640px] md:h-[760px] lg:h-[860px]">
            <PipelineTelemetry />
          </div>
        </div>

        {/* ... (Keep existing mobile atmosphere) ... */}
        <div className="absolute inset-0 md:hidden pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs md:text-sm font-mono text-cyan-300 mb-8 backdrop-blur-sm">
              <Zap size={14} /> NEXT-GEN MOMENTUM INTELLIGENCE
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              <span className="block text-white whitespace-nowrap">
                The Move Happens
              </span>
              <span className="block text-slate-500">
                Before You Find The Reason.
              </span>
            </h1>

            <div className="text-lg md:text-xl font-bold font-mono tracking-wide mb-8">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                <SmoothRevealText
                  text="STOP BEING LIQUIDITY."
                  trigger={startAnim}
                  delay={1000}
                />
              </span>
            </div>

            <p className="text-base md:text-lg text-slate-400 mb-10 leading-relaxed max-w-xl">
              The crowd guesses. You don’t. Gapper’s multi-agent system reads
              news, SEC filings, PR, and socials, scans dilution risk, and
              delivers the only question that matters:
              <span className="font-bold ml-2">
                <span className="text-emerald-400">Treadable</span> or{" "}
                <span className="text-red-500">Trap</span>?
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={scrollToAccess}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white px-8 py-4 rounded-lg text-lg font-bold transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-3"
              >
                Request Terminal Access <ArrowRight />
              </button>

              {/* SECONDARY BUTTON ALSO TRIGGERS MANIFESTO NOW */}
              <button
                onClick={() => setShowManifesto(true)}
                className="w-full sm:w-auto bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 px-8 py-4 rounded-lg text-lg font-bold transition flex items-center justify-center gap-3"
              >
                Read The Protocol
              </button>
            </div>
          </div>
        </div>

        {/* ... (Rest of your sections: TerminalAnimation, BriefCard, Features, Access, Footer) ... */}
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

      {/* KEEP THE REST OF YOUR SECTIONS EXACTLY AS THEY WERE */}
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

          {status === "success" ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 max-w-md mx-auto animate-[fadeIn_0.5s_ease-out]">
              <div className="flex flex-col items-center">
                <CheckCircle className="text-emerald-400 w-12 h-12 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Position Secured
                </h3>
                <p className="text-slate-400 text-sm">
                  You have been added to the priority queue. <br />
                  Keep an eye on your inbox for the invite.
                </p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleJoinWaitlist}
              className="flex flex-col items-center max-w-md mx-auto w-full"
            >
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={status === "submitting"}
                  className={`w-full bg-slate-950 border rounded-lg px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50 ${
                    errorMessage
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-slate-800"
                  }`}
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full sm:w-auto bg-white text-slate-950 px-8 py-4 rounded-lg font-bold hover:bg-cyan-50 transition whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
                >
                  {status === "submitting" ? (
                    <Activity className="animate-spin w-5 h-5 text-slate-900" />
                  ) : (
                    "Secure Your Edge"
                  )}
                </button>
              </div>
              {errorMessage && (
                <div className="flex items-center gap-2 mt-3 text-red-400 text-sm self-start animate-[fadeIn_0.3s_ease-out]">
                  <AlertCircle size={14} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>
          )}

          {status !== "success" && (
            <p className="text-slate-500 text-sm mt-6">
              Limited spots. Rolling invites.
            </p>
          )}
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
