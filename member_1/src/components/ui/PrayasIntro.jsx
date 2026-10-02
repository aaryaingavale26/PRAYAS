"use client";

import { useState, useEffect } from "react";
import "./PrayasIntro.css";

const LETTERS = ["P", "R", "Λ", "Y", "Λ", "S"];

export default function PrayasIntro({ onEnter }) {
  // 0 = idle, 1 = curtain covering, 2 = curtain revealing site, 3 = done
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage < 2) {
      document.body.classList.add("lock");
    } else {
      document.body.classList.remove("lock");
    }
    return () => {
      document.body.classList.remove("lock");
    };
  }, [stage]);

  const enter = () => {
    setStage(1);
    setTimeout(() => { setStage(2); onEnter?.(); }, 700);
    setTimeout(() => setStage(3), 1400);
  };

  if (stage === 3) return null;

  return (
    <>
      <div className="pi" style={{ display: stage >= 2 ? "none" : "flex" }}>
        <div className="pi-grid" />

        <div className="pi-lw">
          {/* glow behind the logo */}
          <div className="pi-glow" />
          <svg className="pi-logo" viewBox="-10 -10 387 467" role="img" aria-label="PRAYAS logo mark">
            <defs>
              <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f4fd0" /><stop offset=".35" stopColor="#2a6cff" /><stop offset="1" stopColor="#0b7bff" /></linearGradient>
              <linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6bb6ff" /><stop offset="1" stopColor="#17a9ff" /></linearGradient>
              <linearGradient id="gf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8f8f8" /><stop offset=".55" stopColor="#f4f9fd" /><stop offset="1" stopColor="#bfe0f7" /></linearGradient>
              <linearGradient id="gi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0a3a8f" /><stop offset="1" stopColor="#0066c8" /></linearGradient>
              <linearGradient id="gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
              <path id="pf" d="M0 80C0 20 30 0 65 0Q85 0 110 14L227 76L98 142L35 108C12 96 0 80 0 60Z" />
              <path id="ps" d="M0 232C0 205 20 190 40 180L98 142L134 160V380C134 420 105 447 67 447C29 447 0 420 0 380Z" />
              <path id="pb" d="M227 76L335 140C355 152 367 168 367 195V245C367 270 355 285 335 298L240 350C240 350 238 345 238 335V245C238 225 235 215 222 210L134 160L98 142Z" />
              <path id="pi" d="M134 260L222 210C235 215 238 225 238 245V335C238 350 228 353 218 353C210 353 205 350 195 345L134 312Z" />
              <clipPath id="clip"><use href="#pf" /><use href="#ps" /><use href="#pb" /></clipPath>
            </defs>
            <use className="p-inner" href="#pi" fill="url(#gi)" />
            <use className="p-stem" href="#ps" fill="url(#gs)" />
            <use className="p-bowl" href="#pb" fill="url(#gb)" />
            <use className="p-fold" href="#pf" fill="url(#gf)" />
            <g clipPath="url(#clip)">
              <g className="p-shine"><rect x="-140" y="-30" width="90" height="520" fill="url(#gl)" transform="skewX(-20)" /></g>
            </g>
          </svg>
        </div>

        <h2 className="pi-word" aria-label="PRAYAS">
          {LETTERS.map((l, i) => (
            <span key={i}><i style={{ "--i": i }}>{l}</i></span>
          ))}
        </h2>

        <div className="pi-tag">
          <div className="pi-rule" />
          <p>Making Every Job Application Accessible</p>
        </div>

        <button className="pi-btn" onClick={enter}>Get started</button>
        <div className="pi-bar" />
      </div>

      <div className={`pi-curtain s${stage}`} />
    </>
  );
}
