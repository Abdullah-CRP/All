"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export const DynamicBackground: React.FC = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { damping: 35, stiffness: 120 });
  const springY = useSpring(mouseY, { damping: 35, stiffness: 120 });

  // Inverted parallax shift
  const moveX = useTransform(springX, [-1000, 1000], [25, -25]);
  const moveY = useTransform(springY, [-1000, 1000], [25, -25]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX - innerWidth / 2);
      mouseY.set(e.clientY - innerHeight / 2);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-base">
      {/* Soft gradient organic glows */}
      <motion.div
        style={{ x: moveX, y: moveY }}
        className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-stone-300/30 blur-[130px]"
      />
      <motion.div
        style={{ x: useTransform(moveX, (v) => -v * 0.8), y: useTransform(moveY, (v) => -v * 0.8) }}
        className="absolute top-1/3 -right-32 w-[700px] h-[700px] rounded-full bg-espresso-200/25 blur-[140px]"
      />
      <motion.div
        style={{ x: useTransform(moveX, (v) => v * 0.6), y: useTransform(moveY, (v) => v * 0.6) }}
        className="absolute -bottom-32 left-1/4 w-[800px] h-[800px] rounded-full bg-stone-200/40 blur-[160px]"
      />

      {/* SVG Micro-noise filter layer for organic matte texture */}
      <svg className="fixed inset-0 w-full h-full opacity-[0.035] contrast-125 pointer-events-none">
        <filter id="organic-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#organic-noise)" />
      </svg>
    </div>
  );
};
