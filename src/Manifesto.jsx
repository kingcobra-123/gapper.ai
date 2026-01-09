import React from "react";
import { X, AlertTriangle, Activity, Zap, Cpu } from "lucide-react";

const Manifesto = ({ isOpen, onClose, onSecureEdge }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur & click to close */}
      <div
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md transition-opacity animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      ></div>

      {/* The Document Card */}
      <div className="relative w-full max-w-4xl bg-[#0b1120] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out] flex flex-col max-h-[85vh] md:max-h-[90vh]">
        {/* Header: Terminal Window Style */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-500/10 rounded-md border border-red-500/20">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm font-bold text-slate-200 tracking-wider">
                ORIGIN_PROTOCOL.md
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                Eyes Only // Level 5 Clearance
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-8 md:p-12 space-y-8 text-slate-300 leading-relaxed font-sans selection:bg-red-500/30 selection:text-red-200 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {/* THE HOOK */}
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              The market does not care about your technical analysis or your gut
              feeling.
            </h2>
            <p className="text-xl md:text-2xl font-medium text-slate-400 mt-2">
              It cares about one thing:{" "}
              <strong className="text-white border-b-2 border-emerald-500">
                Speed.
              </strong>
            </p>
          </div>

          <hr className="border-slate-800" />

          {/* THE STORY */}
          <div className="space-y-4">
            <p>
              I started trading like everyone else: small account, big dreams,
              and a copy of "Technical Analysis for Dummies." I thought I could
              outsmart the market. I was wrong. I fought the algorithms, and
              they crushed me.
            </p>
            <p>
              So I switched sides. I decided to ride the wave. "Trade with the
              trend," they said. It worked—until it didn't. I’d make consistent
              gains for weeks, only to have them wiped out in a single morning
              because an algorithm decided to dump while I was still buying.
            </p>
            <div className="bg-red-500/5 border-l-4 border-red-500 p-6 my-8">
              <p className="text-red-200 italic font-medium text-lg">
                That was my red pill moment: The best strategy isn't fighting
                the algos, and it isn't blindly following them. It is knowing
                exactly when to stab them in the back.
              </p>
            </div>
            <p>
              But to do that, you need Information Superiority. And right now,
              you don't have it.
            </p>
          </div>

          {/* THE TRAP */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity size={24} className="text-cyan-400" />
              The "Tools" Are The Trap
            </h3>
            <p>
              I spent thousands on subscriptions. Benzinga. Trade Ideas. The
              "Pro" terminals. I bought them all. Do you know what I found?{" "}
              <strong>Noise.</strong>
            </p>
            <p>
              They sell you a firehose of garbage. You get a notification: "XYZ
              Breaking News." You click it. It’s a 5-page Press Release.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <span className="font-bold text-white block mb-2">
                  Scenario A: The "Simple" Trap
                </span>
                <span className="text-sm text-slate-400">
                  "FDA Approval." Easy. By the time you read those two words,
                  the stock is already up 40%. You chase, you become liquidity,
                  you lose.
                </span>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <span className="font-bold text-white block mb-2">
                  Scenario B: The "Complex" Trap
                </span>
                <span className="text-sm text-slate-400">
                  "Phase 2b trial meets primary endpoint with p-value &lt;0.05
                  but mixed secondary results." You freeze. You Google
                  "secondary endpoints." The edge is gone.
                </span>
              </div>
            </div>

            <p>
              By the time your human brain synthesizes that information, the
              move is over. The "Gurus" and Discord alerts? They are the worst
              offenders. They are delayed feeds selling you yesterday's news. If
              you are waiting for a Discord ping to enter a trade, you aren't a
              trader; you are exit liquidity for the guy running the server.
            </p>
          </div>

          {/* THE GAP */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap size={24} className="text-yellow-400" />
              The "Read-Time" Gap
            </h3>
            <p>
              This is where retail dies. It isn't the spread; it's the Read-Time
              Gap.
            </p>
            <p>
              While you are manually opening a PDF to see if that "Strategic
              Partnership" is actually just a cloud hosting deal or a legitimate
              buyout rumor, the HFTs (High-Frequency Traders) have already
              parsed the document, executed 5,000 orders, and moved the price
              $2.00.
            </p>
            <p className="text-white font-medium text-lg">
              You are bringing a knife to a nuclear war.
            </p>
          </div>

          {/* THE SOLUTION */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Cpu size={24} className="text-emerald-400" />
              Enter Gapper.ai
            </h3>
            {/* Merged Paragraph */}
            <p>
              I built Gapper because I was tired of being the slowest guy in the
              room. I realized I didn't need more news; I needed intelligence. I
              needed a machine that could read. Gapper is a Real-Time
              Multi-Agent Engine. It does not sleep. It does not panic.
            </p>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="bg-slate-900 border border-slate-700 p-5 rounded text-sm">
                <span className="text-cyan-400 font-mono font-bold block mb-2 text-base">
                  IT SCRAPES
                </span>
                It watches the wires, the SEC (EDGAR), and the dark corners of
                the web.
              </div>

              {/* IT THINKS */}
              <div className="bg-slate-900 border border-slate-700 p-5 rounded text-sm">
                <span className="text-purple-400 font-mono font-bold block mb-2 text-base">
                  IT THINKS
                </span>
                <p className="mb-2">
                  It doesn't just forward the headline. AI agents parse the
                  5-page document instantly. They verify the science. They check
                  the dilution history. They check the cash burn.
                </p>
                <p className="text-purple-200 italic border-l-2 border-purple-500/30 pl-3">
                  "For the skeptics wondering if AI can actually 'read': My
                  agents just parsed a 200-page S-1 filing, cross-referenced the
                  footnotes, and found the hidden warrant clause before you even
                  finished sipping your coffee. It turns out silicon doesn't get
                  tired eyes."
                </p>
              </div>

              {/* IT SYNTHESIZES - UPDATED */}
              <div className="bg-slate-900 border border-slate-700 p-5 rounded text-sm">
                <span className="text-emerald-400 font-mono font-bold block mb-2 text-base">
                  IT SYNTHESIZES
                </span>
                <p className="mb-2">
                  It hands you a Brief Card. No noise. No fluff. Just the raw
                  signal: "Biotech breakout. Strong data. Low float. No active
                  ATM offering. Treadable."
                </p>
                <p className="text-emerald-200 italic border-l-2 border-emerald-500/30 pl-3">
                  "For the trust-issue traders: Every Brief Card links directly
                  to the source. So if you really want to use your slow human
                  brain to double-check the AI, be my guest. The links are right
                  there."
                </p>
              </div>
            </div>

            <p className="mt-4">
              It does the 10 minutes of due diligence you should be doing, but
              it does it in 200 milliseconds. We are automating the "gut check."
              We are removing the noise. We are reclaiming the edge.
            </p>
            <p className="font-bold text-white text-lg">
              Stop guessing. Stop reading. Stop being liquidity.
            </p>
          </div>

          <hr className="border-slate-800" />

          {/* DISCLAIMER */}
          <div className="text-xs text-slate-500 leading-relaxed font-mono bg-black/20 p-6 rounded border border-white/5 text-justify">
            <strong className="block text-slate-400 mb-2">DISCLAIMER</strong>
            Gapper.ai is a data aggregation and analysis tool. We are NOT
            financial advisors, broker-dealers, or investment managers. The
            information provided by our system is for educational and
            informational purposes only. Trading securities, especially
            small-cap and momentum stocks, involves a high degree of risk and is
            not suitable for everyone. You can lose more than your initial
            investment.
            <br />
            <br />
            Our AI agents process public information to generate summaries, but
            AI can hallucinate, misinterpret data, or miss context. Never trade
            blindly based on a machine's output. Always verify filings and data
            yourself before executing a trade. Past performance of any strategy
            or alert is not indicative of future results. You are solely
            responsible for your own financial decisions.
          </div>

          {/* CTA */}
          <div className="pt-4 flex flex-col items-center justify-center gap-4">
            <button
              onClick={onSecureEdge || onClose}
              className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white py-5 rounded-lg font-bold text-xl shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95"
            >
              Secure Your Edge
            </button>
            <span className="text-xs text-slate-500 font-mono">
              LIMITED CAPACITY // ROLLING ADMISSION
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Manifesto;
