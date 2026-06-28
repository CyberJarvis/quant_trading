"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const SCENARIOS = [
  { id: "covid_2020",          label: "COVID Crash 2020",       drop: -38, period: "Jan–Mar 2020" },
  { id: "bear_2022",           label: "Bear Market 2022",       drop: -16, period: "Jan–Jun 2022" },
  { id: "demonetisation_2016", label: "Demonetisation 2016",    drop: -9,  period: "Nov–Dec 2016" },
  { id: "adani_2023",          label: "Adani Crisis 2023",      drop: -7,  period: "Jan–Feb 2023" },
  { id: "il_fs_2018",          label: "IL&FS Crisis 2018",      drop: -14, period: "Sep–Oct 2018" },
];

interface Props {
  selected: string;
  customDrop: number;
  onSelect: (id: string) => void;
  onCustomDrop: (v: number) => void;
}

export default function ScenarioPicker({ selected, customDrop, onSelect, onCustomDrop }: Props) {
  return (
    <div className="space-y-2">
      {SCENARIOS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 border font-mono text-xs uppercase font-bold transition-colors cursor-pointer",
            selected === s.id
              ? "bg-red-500/5 text-red-600"
              : "bg-[var(--surface)] text-[color:var(--muted-2)] hover:text-text"
          )}
          style={{ borderColor: selected === s.id ? "var(--bear-border)" : "var(--border)" }}
        >
          <div className="text-left">
            <p>{s.label}</p>
            <p className="text-[9px] opacity-60 font-normal normal-case mt-0.5">{s.period}</p>
          </div>
          <span className="font-bold text-red-600">{s.drop}%</span>
        </button>
      ))}

      {/* Custom */}
      <div
        onClick={() => onSelect("custom")}
        className={cn(
          "px-4 py-2.5 border cursor-pointer transition-colors font-mono text-xs uppercase font-bold",
          selected === "custom"
            ? "bg-amber-glow"
            : "bg-[var(--surface)] text-[color:var(--muted-2)] hover:text-text"
        )}
        style={{ borderColor: selected === "custom" ? "var(--amber-border)" : "var(--border)" }}
      >
        <p className="mb-2">Custom Simulation</p>
        <div className="flex items-center gap-3">
          <input aria-label="Input field"
            type="range"
            min={-60}
            max={-1}
            value={customDrop}
            onChange={(e) => { onSelect("custom"); onCustomDrop(Number(e.target.value)); }}
            className="flex-1 accent-amber-500"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-amber w-10 text-right">
            {customDrop}%
          </span>
        </div>
      </div>
    </div>
  );
}
