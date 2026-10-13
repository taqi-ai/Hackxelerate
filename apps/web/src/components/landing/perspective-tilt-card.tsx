"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PerspectiveTiltCardProps {
  children?: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
  glareEffect?: boolean;
  depthRatio?: number;
  priority?: boolean;
}

/**
 * PerspectiveTiltCard: transforms existing 2D screenshots and image tiles
 * into interactive 3D perspective layers with mouse-responsive tilt, dynamic glare,
 * and elevation shadows matching award-winning Awwwards/Apple showcases.
 */
export function PerspectiveTiltCard({
  children,
  imageSrc,
  imageAlt = "Ascora Interface Preview",
  className,
  glareEffect = true,
  depthRatio = 12,
  priority = false,
}: PerspectiveTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  // Mouse coords normalized (-0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth physics spring interpolations
  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 22 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 22 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [depthRatio, -depthRatio]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-depthRatio, depthRatio]);


  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  }

  function handleMouseEnter() {
    setHovered(true);
  }

  function handleMouseLeave() {
    setHovered(false);
    x.set(0);
    y.set(0);
  }

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative w-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={cardRef}
        style={{
          rotateX: reduceMotion ? 0 : rotateX,
          rotateY: reduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          scale: hovered && !reduceMotion ? 1.02 : 1,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/12 bg-[#0d0d14] p-1 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)]",
          "ring-1 ring-white/10 transition-shadow duration-500",
          hovered && "shadow-[0_45px_110px_-20px_oklch(0.8_0.07_272/0.38)]",
          className
        )}
      >
        {/* Browser / Application Top Bar */}
        <div className="flex h-8 items-center justify-between border-b border-white/10 bg-white/[0.02] px-3.5 backdrop-blur-md" aria-hidden>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-white/20 transition-colors group-hover:bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-white/20 transition-colors group-hover:bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-white/20 transition-colors group-hover:bg-emerald-400/80" />
            <span className="ml-3 hidden font-mono text-[10.5px] text-white/40 sm:inline-block">ascora.live / companion</span>
          </div>
          <span className="size-1.5 rounded-full bg-[oklch(0.8_0.12_162)] shadow-[0_0_8px_oklch(0.8_0.12_162)]" />
        </div>

        {/* Content or Image Layer with depth */}
        <div className="relative overflow-hidden rounded-b-xl" style={{ transform: "translateZ(20px)" }}>
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={2400}
              height={1500}
              priority={priority}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full object-cover object-top transition-transform duration-700 hover:scale-[1.01]"
            />
          ) : (
            children
          )}

          {/* Interactive Light Glare overlay */}
          {glareEffect && !reduceMotion && (
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
              style={{
                opacity: hovered ? 0.35 : 0,
                background: `radial-gradient(circle 500px at 50% 50%, rgba(255, 255, 255, 0.4), transparent 60%)`,
              }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
