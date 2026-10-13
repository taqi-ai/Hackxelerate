"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring, useReducedMotion } from "framer-motion";

/**
 * Animated3DOrb:
 * An interactive, physics-driven 3D volumetric orb with specular lighting,
 * slow rotational inertia, ambient chromatic aberration halos, and mouse tracking.
 */
export function Animated3DOrb({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  // Smooth spring physics for pointer response
  const springConfig = { damping: 20, stiffness: 120, mass: 0.5 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);
  const lightX = useSpring(32, springConfig);
  const lightY = useSpring(28, springConfig);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Relative -0.5 to 0.5
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(normX * 18);
    mouseY.set(normY * -18);
    lightX.set(32 + normX * 25);
    lightY.set(28 + normY * 25);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
    lightX.set(32);
    lightY.set(28);
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none ${className ?? ""}`}
      style={{ perspective: 1000 }}
    >
      {/* Dynamic 3D Floating & Tilt Layer */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : {
                y: [0, -8, 0],
                rotateZ: [0, 2, -2, 0],
              }
        }
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          rotateX: mouseY,
          rotateY: mouseX,
          transformStyle: "preserve-3d",
        }}
        className="relative size-full"
      >
        {/* Layer 1: Outer Chromatic Ambient Aura / Back-glow */}
        <div
          aria-hidden
          className="absolute inset-[-14%] rounded-full bg-[conic-gradient(from_180deg,oklch(0.72_0.17_272),oklch(0.7_0.18_320),oklch(0.76_0.14_210),oklch(0.72_0.17_272))] opacity-75 blur-xl motion-safe:animate-[spin_18s_linear_infinite]"
        />

        {/* Layer 2: Atmospheric Conic Rim Ring */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,oklch(0.7_0.16_272),oklch(0.72_0.15_320),oklch(0.78_0.12_200),oklch(0.7_0.16_272))] opacity-85 blur-[3px] motion-safe:animate-[spin_24s_linear_infinite]"
        />

        {/* Layer 3: Dynamic 3D Sphere Core with Volumetric Lighting */}
        <div
          className="absolute inset-[15%] rounded-full shadow-[inset_-25px_-35px_70px_oklch(0.12_0.05_272),0_20px_50px_-15px_oklch(0.5_0.18_272/0.6)] transition-all duration-300"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, oklch(0.98 0.02 272) 0%, oklch(0.75 0.12 272) 20%, oklch(0.55 0.16 272) 50%, oklch(0.25 0.08 272) 80%, oklch(0.12 0.05 272) 100%)",
          }}
        >
          {/* Specular Highlight Glare reflecting pointer */}
          <motion.div
            className="pointer-events-none absolute size-24 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.7),transparent)] blur-sm"
            style={{
              top: `${lightY.get() - 10}%`,
              left: `${lightX.get() - 10}%`,
              opacity: isHovered ? 0.9 : 0.65,
            }}
          />
        </div>

        {/* Layer 4: Vignette Edge Blend */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,transparent_55%,#0b0b14_100%)] pointer-events-none"
        />
      </motion.div>
    </div>
  );
}
