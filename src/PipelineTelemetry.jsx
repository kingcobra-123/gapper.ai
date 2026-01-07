import React, { useRef, useEffect } from "react";

const PipelineTelemetry = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf;
    let w = 0,
      h = 0;
    let dpr = 1;
    let last = performance.now();

    // --- CONFIG ---
    const palette = {
      cyan: "34, 211, 238", // Cyan-400
      emerald: "52, 211, 153", // Emerald-400
      red: "248, 113, 113", // Red-400
      slate: "100, 116, 139", // Slate-500
      dark: "15, 23, 42", // Slate-900
      white: "255, 255, 255",
    };

    // --- STATE ---
    let state = 0;
    let timer = 0;
    let activeOutputIndex = 1; // 0: Top, 1: Mid, 2: Bot

    let layout = {};
    let particles = [];
    let sparks = [];

    // --- UTILS ---
    const getBezierPoint = (t, p0, p1, p2, p3) => {
      const cX = 3 * (p1.x - p0.x);
      const bX = 3 * (p2.x - p1.x) - cX;
      const aX = p3.x - p0.x - cX - bX;
      const cY = 3 * (p1.y - p0.y);
      const bY = 3 * (p2.y - p1.y) - cY;
      const aY = p3.y - p0.y - cY - bY;
      const x = aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0.x;
      const y = aY * Math.pow(t, 3) + bY * Math.pow(t, 2) + cY * t + p0.y;
      return { x, y };
    };

    // --- LAYOUT ---
    const calculateLayout = () => {
      w = canvas.width / dpr;
      h = canvas.height / dpr;

      // RESPONSIVE SCALING FACTOR
      // If width is < 800px, scale everything down. Min scale 0.45 to keep it visible.
      const baseWidth = 1200;
      const scale = Math.max(0.45, Math.min(1, w / baseWidth));

      const cx = w * 0.5;
      const cy = h * 0.5;

      // Tighten horizontal spacing on mobile
      const leftX = w * (w < 600 ? 0.15 : 0.1);

      // Vertical spacing for sources (scaled)
      const srcY = 160 * scale;
      const srcInnerY = 60 * scale;

      // 1. ENGINE
      const engine = { x: cx, y: cy, scale };

      // 2. SOURCES (Left)
      const sources = [
        {
          x: leftX,
          y: cy - srcY,
          color: palette.cyan,
          group: "top",
          icon: "globe",
        },
        {
          x: leftX,
          y: cy - srcInnerY,
          color: palette.cyan,
          group: "top",
          icon: "doc",
        },
        {
          x: leftX,
          y: cy + srcInnerY,
          color: palette.emerald,
          group: "bot",
          icon: "chart",
        },
        {
          x: leftX,
          y: cy + srcY,
          color: palette.emerald,
          group: "bot",
          icon: "shield",
        },
      ];

      // 3. CARD (Right) - Dimensions scaled
      const cardW = 300 * scale;
      const cardH = 400 * scale;
      // Push card closer to center on small screens to fit
      const cardX = w * (w < 600 ? 0.85 : 0.82);

      const card = { x: cardX, y: cy, w: cardW, h: cardH, scale };

      // 4. INPUT PIPES
      const pipes = sources.map((src, i) => {
        const targetY = engine.y + (i < 2 ? -10 * scale : 20 * scale);
        const cp1 = { x: src.x + (engine.x - src.x) * 0.5, y: src.y };
        const cp2 = { x: engine.x - (engine.x - src.x) * 0.5, y: targetY };
        return {
          start: src,
          end: { x: engine.x - 30 * scale, y: targetY },
          cp1,
          cp2,
          color: src.color,
        };
      });

      // 5. OUTPUT PIPES (Top, Mid, Bot)
      const cardLeft = { x: card.x - card.w / 2 - 20 * scale, y: card.y };
      const outPipes = [];

      // Scaled layer offsets
      const layerOff = 18 * scale;
      const layerOffsets = [-layerOff, 0, layerOff];

      layerOffsets.forEach((offset) => {
        const startPt = { x: engine.x + 30 * scale, y: engine.y + offset };
        outPipes.push({
          start: startPt,
          end: cardLeft,
          cp1: { x: engine.x + 100 * scale, y: startPt.y },
          cp2: { x: cardLeft.x - 100 * scale, y: cardLeft.y },
          color: palette.emerald,
        });
      });

      layout = { sources, engine, card, pipes, outPipes, scale };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      calculateLayout();
    };

    // --- DRAWING ---

    const drawSourceCube = (s, opacity, scale) => {
      if (opacity <= 0) return;
      const size = 20 * scale;
      const depth = 10 * scale;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = opacity;

      const fillTop = `rgba(${s.color}, 0.15)`;
      const strokeTop = `rgba(${s.color}, 0.8)`;
      const fillSide = `rgba(${s.color}, 0.05)`;
      const strokeSide = `rgba(${s.color}, 0.4)`;

      // Top Face
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 1.2, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 1.2, 0);
      ctx.closePath();
      ctx.shadowBlur = 15 * scale;
      ctx.shadowColor = strokeTop;
      ctx.fillStyle = fillTop;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = strokeTop;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Sides
      ctx.beginPath();
      ctx.moveTo(size * 1.2, 0);
      ctx.lineTo(size * 1.2, depth);
      ctx.lineTo(0, size + depth);
      ctx.lineTo(0, size);
      ctx.closePath();
      ctx.fillStyle = fillSide;
      ctx.fill();
      ctx.strokeStyle = strokeSide;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(0, size + depth);
      ctx.lineTo(-size * 1.2, depth);
      ctx.lineTo(-size * 1.2, 0);
      ctx.closePath();
      ctx.fillStyle = fillSide;
      ctx.fill();
      ctx.strokeStyle = strokeSide;
      ctx.stroke();

      // Icon
      ctx.save();
      ctx.scale(scale, 0.5 * scale); // Scale icon
      ctx.strokeStyle = `rgba(${s.color}, 1)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (s.icon === "globe") {
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 10);
      }
      if (s.icon === "doc") {
        ctx.rect(-6, -8, 12, 16);
        ctx.moveTo(-3, -3);
        ctx.lineTo(3, -3);
        ctx.moveTo(-3, 2);
        ctx.lineTo(3, 2);
      }
      if (s.icon === "chart") {
        ctx.moveTo(-8, 5);
        ctx.lineTo(-2, -2);
        ctx.lineTo(2, 2);
        ctx.lineTo(8, -5);
      }
      if (s.icon === "shield") {
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, -6);
        ctx.lineTo(6, 0);
        ctx.quadraticCurveTo(0, 8, -6, 0);
        ctx.lineTo(-6, -6);
      }
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    };

    const drawInferenceStack = (e, state, timer, activeIdx) => {
      const scale = e.scale;
      const w = 60 * scale; // Scaled radius
      const h = 30 * scale; // Scaled radius

      ctx.save();
      ctx.translate(e.x, e.y);

      let scanLayer = -1;
      if (state === 3) {
        const phase = Math.floor(timer * 2.5);
        scanLayer = 2 - (phase % 3);
      }

      const drawOrder = [2, 1, 0];

      drawOrder.forEach((layerIdx) => {
        // Scaled offset: 18 * scale
        const yOff = (layerIdx - 1) * (18 * scale);

        let stroke = `rgba(${palette.slate}, 0.5)`;
        let fill = `rgba(${palette.dark}, 0.8)`;
        let glow = 0;
        let lineWidth = 1 * scale;

        let alpha = state >= 3 ? 1 : 0;
        if (alpha <= 0) return;

        ctx.globalAlpha = alpha;

        const isScanning = state === 3 && layerIdx === scanLayer;
        const isFiring = state === 4 && layerIdx === activeIdx;

        if (isScanning || isFiring) {
          stroke = isFiring ? "#fff" : `rgba(${palette.emerald}, 1)`;
          fill = isFiring
            ? `rgba(${palette.emerald}, 0.5)`
            : `rgba(${palette.emerald}, 0.2)`;
          glow = isFiring ? 30 * scale : 15 * scale;
          lineWidth = 2 * scale;
        } else if (state >= 3) {
          stroke = `rgba(${palette.cyan}, 0.3)`;
        }

        ctx.beginPath();
        ctx.moveTo(0, yOff - h);
        ctx.lineTo(w, yOff);
        ctx.lineTo(0, yOff + h);
        ctx.lineTo(-w, yOff);
        ctx.closePath();

        ctx.shadowBlur = glow;
        ctx.shadowColor = stroke;
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();

        const depth = 6 * scale;
        ctx.beginPath();
        ctx.moveTo(-w, yOff);
        ctx.lineTo(0, yOff + h);
        ctx.lineTo(w, yOff);
        ctx.lineTo(w, yOff + depth);
        ctx.lineTo(0, yOff + h + depth);
        ctx.lineTo(-w, yOff + depth);
        ctx.closePath();
        ctx.fillStyle = `rgba(2, 6, 23, 0.5)`;
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        if (state === 4 && layerIdx === activeIdx && timer < 0.15) {
          ctx.save();
          ctx.translate(w + 10 * scale, yOff);
          ctx.fillStyle = "#fff";
          ctx.shadowBlur = 40 * scale;
          ctx.shadowColor = "#fff";
          ctx.beginPath();
          ctx.arc(0, 0, 15 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      ctx.restore();
    };

    const drawCard = (c, opacity, progress) => {
      if (opacity <= 0) return;
      const scale = c.scale;

      ctx.save();
      ctx.translate(c.x - c.w / 2, c.y - c.h / 2);
      ctx.globalAlpha = opacity;

      // 3D Body
      const depth = 12 * scale;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.moveTo(c.w, 0);
      ctx.lineTo(c.w + depth, -depth);
      ctx.lineTo(c.w + depth, c.h - depth);
      ctx.lineTo(c.w, c.h);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(depth, -depth);
      ctx.lineTo(c.w + depth, -depth);
      ctx.lineTo(c.w, 0);
      ctx.fill();
      ctx.stroke();

      // Face
      ctx.fillStyle = `rgba(15, 23, 42, 0.95)`;
      ctx.strokeStyle = `rgba(${palette.cyan}, 0.4)`;
      ctx.lineWidth = 1 * scale;
      ctx.shadowBlur = 20 * scale;
      ctx.shadowColor = `rgba(${palette.cyan}, 0.15)`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, 0, c.w, c.h, 12 * scale);
      else ctx.rect(0, 0, c.w, c.h); // Fallback
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Content Stagger (Scaled padding/widths)
      const p = 20 * scale;
      const cw = c.w - p * 2;

      const bar = (y, w, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p, y, w, 8 * scale, 4 * scale);
        else ctx.rect(p, y, w, 8 * scale);
        ctx.fill();
      };

      if (progress > 0.1) {
        ctx.fillStyle = `rgba(${palette.slate},0.3)`;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p, p, cw * 0.6, 20 * scale, 4 * scale);
        else ctx.rect(p, p, cw * 0.6, 20 * scale);
        ctx.fill();

        ctx.fillStyle = `rgba(${palette.emerald},0.2)`;
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(
            c.w - p - 60 * scale,
            p,
            60 * scale,
            20 * scale,
            10 * scale
          );
        else ctx.rect(c.w - p - 60 * scale, p, 60 * scale, 20 * scale);
        ctx.fill();
      }
      if (progress > 0.3) {
        ctx.strokeStyle = `rgba(${palette.cyan},0.3)`;
        ctx.lineWidth = 1 * scale;
        ctx.fillStyle = `rgba(${palette.cyan},0.1)`;
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(p, p + 40 * scale, cw, 70 * scale, 8 * scale);
        else ctx.rect(p, p + 40 * scale, cw, 70 * scale);
        ctx.fill();
        ctx.stroke();
        bar(p + 60 * scale, cw * 0.5, `rgba(${palette.cyan},0.6)`);
        bar(p + 80 * scale, cw * 0.8, `rgba(${palette.cyan},0.3)`);
      }
      if (progress > 0.5) {
        const bw = (cw - 10 * scale) / 2;
        const startY = p + 130 * scale;
        const hBlock = 40 * scale;
        ctx.fillStyle = `rgba(${palette.slate},0.1)`;
        ctx.fillRect(p, startY, bw, hBlock);
        ctx.fillRect(p + bw + 10 * scale, startY, bw, hBlock);
        ctx.fillRect(p, startY + 50 * scale, bw, hBlock);
        ctx.fillRect(p + bw + 10 * scale, startY + 50 * scale, bw, hBlock);
        ctx.fillStyle = palette.emerald;
        ctx.fillRect(
          p + bw + 20 * scale,
          startY + 20 * scale,
          40 * scale,
          4 * scale
        );
      }
      if (progress > 0.7) {
        const y = p + 240 * scale;
        ctx.fillStyle = `rgba(${palette.slate},0.2)`;
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(p, y, 60 * scale, 16 * scale, 8 * scale);
        else ctx.rect(p, y, 60 * scale, 16 * scale);
        ctx.fill();
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(p + 70 * scale, y, 60 * scale, 16 * scale, 8 * scale);
        else ctx.rect(p + 70 * scale, y, 60 * scale, 16 * scale);
        ctx.fill();
        ctx.fillStyle = `rgba(${palette.red},0.3)`;
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(p + 140 * scale, y, 60 * scale, 16 * scale, 8 * scale);
        else ctx.rect(p + 140 * scale, y, 60 * scale, 16 * scale);
        ctx.fill();
      }
      if (progress > 0.85) {
        const y = p + 280 * scale;
        ctx.fillStyle = `rgba(${palette.slate},0.1)`;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p, y, cw, 60 * scale, 8 * scale);
        else ctx.rect(p, y, cw, 60 * scale);
        ctx.fill();
        bar(y + 25 * scale, 80 * scale, palette.emerald);
      }
      ctx.restore();
    };

    // --- MAIN FRAME LOOP ---
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      timer += dt;

      ctx.clearRect(0, 0, w, h);
      const { sources, engine, card, pipes, outPipes, scale } = layout;

      // 0. RESET FADE LOGIC
      let masterOpacity = 1;
      if (state === 7) {
        masterOpacity = Math.max(0, 1 - timer);
        if (timer > 1) {
          state = 0;
          timer = 0;
        }
      }
      ctx.save();
      ctx.globalAlpha = masterOpacity;
      // Center shift slightly
      ctx.translate(w * 0.05, 0);

      // 1. LEFT PIPES
      pipes.forEach((p) => {
        const active =
          (p.start.group === "top" && state >= 1) ||
          (p.start.group === "bot" && state >= 2);
        ctx.beginPath();
        ctx.moveTo(p.start.x, p.start.y);
        ctx.bezierCurveTo(p.cp1.x, p.cp1.y, p.cp2.x, p.cp2.y, p.end.x, p.end.y);
        ctx.strokeStyle = active
          ? `rgba(${p.color}, 0.6)`
          : `rgba(${p.color}, 0.1)`;
        ctx.lineWidth = (active ? 2 : 1) * scale;
        ctx.stroke();
      });

      // 2. RIGHT PIPE
      if (state >= 4) {
        const p = outPipes[activeOutputIndex];
        ctx.beginPath();
        ctx.moveTo(p.start.x, p.start.y);
        ctx.bezierCurveTo(p.cp1.x, p.cp1.y, p.cp2.x, p.cp2.y, p.end.x, p.end.y);
        ctx.strokeStyle = `rgba(${palette.emerald}, 0.6)`;
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      }

      // 3. LOGIC SEQUENCER
      if (state === 0 && timer > 0.5) {
        state = 1;
        timer = 0;
        particles.push(
          { t: 0, speed: 0.8, path: pipes[0], color: "#fff" },
          { t: 0, speed: 0.8, path: pipes[1], color: "#fff" }
        );
      }
      if (state === 1 && timer > 1.2) {
        state = 2;
        timer = 0;
        particles.push(
          { t: 0, speed: 0.8, path: pipes[2], color: "#fff" },
          { t: 0, speed: 0.8, path: pipes[3], color: "#fff" }
        );
      }
      if (state === 2 && timer > 1.2) {
        state = 3;
        timer = 0;
        activeOutputIndex = Math.floor(Math.random() * 3);
      }
      if (state === 3 && timer > 1.5) {
        state = 4;
        timer = 0;
        particles.push({
          t: 0,
          speed: 1.0,
          path: outPipes[activeOutputIndex],
          color: "#fff",
          isOutput: true,
        });
      }
      if (state === 4 && timer > 1.0) {
        state = 5;
        timer = 0;
      }
      if (state === 5 && timer > 2.5) {
        state = 6;
        timer = 0;
      }
      if (state === 6 && timer > 2.0) {
        state = 7;
        timer = 0;
      }

      // 4. DRAW SOURCES
      sources.forEach((s) => {
        let op = 0;
        if (s.group === "top" && state >= 1) op = 1;
        if (s.group === "bot" && state >= 2) op = 1;
        drawSourceCube(s, op, scale);
      });

      // 5. DRAW STACK
      drawInferenceStack(engine, state, timer, activeOutputIndex);

      // 6. DRAW CARD
      let cardProgress = 0;
      if (state === 5) cardProgress = Math.min(1, timer / 2.0);
      if (state >= 6) cardProgress = 1;
      drawCard(card, state >= 5 ? 1 : 0, cardProgress);

      // 7. PARTICLES
      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.t += p.speed * dt;
        if (p.t >= 1) {
          particles.splice(i, 1);
          const target = p.path.end;
          for (let k = 0; k < 6; k++)
            sparks.push({
              x: target.x,
              y: target.y,
              vx: (Math.random() - 0.5) * 4 * scale,
              vy: (Math.random() - 0.5) * 4 * scale,
              life: 1,
              color: p.color,
            });
          continue;
        }
        const pos = getBezierPoint(
          p.t,
          p.path.start,
          p.path.cp1,
          p.path.cp2,
          p.path.end
        );
        ctx.shadowBlur = 15 * scale;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 8. SPARKS
      sparks.forEach((s, i) => {
        s.life -= 0.05;
        s.x += s.vx;
        s.y += s.vy;
        if (s.life <= 0) sparks.splice(i, 1);
        ctx.globalAlpha = s.life * masterOpacity;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 2 * scale, 2 * scale);
      });

      ctx.restore();
      raf = requestAnimationFrame(frame);
    };

    window.addEventListener("resize", resize);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default PipelineTelemetry;
