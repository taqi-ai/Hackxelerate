"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring, useReducedMotion } from "framer-motion";

/**
 * LoginPerspectiveStage:
 * Wraps the login card with restrained 3D perspective tilt physics,
 * pointer-reactive specular glass highlights, and subtle floating elevation.
 */
export function LoginPerspectiveStage({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const springConfig = { damping: 24, stiffness: 130, mass: 0.5 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);
  const glareX = useSpring(50, springConfig);
  const glareY = useSpring(50, springConfig);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Normalised offset (-0.5 to 0.5)
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    // Tasteful, restrained angles: max ~6 degrees
    rotateX.set(normY * -7);
    rotateY.set(normX * 8);
    glareX.set(50 + normX * 45);
    glareY.set(50 + normY * 45);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1200 }}
      className="relative w-full max-w-sm py-4"
    >
      {/* Dynamic 3D Volumetric Back-Glow that floats subtly */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : {
                scale: [1, 1.08, 1],
                opacity: [0.35, 0.55, 0.35],
              }
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(closest-side,oklch(0.65_0.16_272/0.25),transparent)] blur-2xl"
      />

      {/* 3D Tilted Card Body */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : {
                y: [0, -5, 0],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          rotateX: reduceMotion ? 0 : rotateX,
          rotateY: reduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        className="edge relative w-full space-y-8 rounded-3xl border border-white/15 bg-card/75 p-7 shadow-[0_30px_90px_-25px_var(--glow),0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8"
      >
        {/* Specular Glare Layer across glass */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.35 : 0,
            background: `radial-gradient(circle 280px at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.22), transparent 70%)`,
          }}
        />

        {/* Content */}
        <div style={{ transform: "translateZ(10px)" }}>{children}</div>
      </motion.div>
    </div>
  );
}
