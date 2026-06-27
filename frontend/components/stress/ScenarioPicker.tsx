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
            "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all",
            selected === s.id
              ? "bg-red-500/10 border-red-500/40 text-red-300"
              : "bg-[#111827] border-[#1F2937] text-gray-400 hover:border-[#374151] hover:text-gray-200"
          )}
        >
          <div className="text-left">
            <p className="font-medium">{s.label}</p>
            <p className="text-[10px] opacity-60">{s.period}</p>
          </div>
          <span className="font-mono font-bold text-red-400">{s.drop}%</span>
        </button>
      ))}

      {/* Custom */}
      <div
        onClick={() => onSelect("custom")}
        className={cn(
          "px-4 py-3 rounded-xl border cursor-pointer transition-all",
          selected === "custom"
            ? "bg-amber-500/10 border-amber-500/40"
            : "bg-[#111827] border-[#1F2937] hover:border-[#374151]"
        )}
      >
        <p className="text-sm font-medium text-gray-300 mb-2">Custom Scenario</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={-60}
            max={-1}
            value={customDrop}
            onChange={(e) => { onSelect("custom"); onCustomDrop(Number(e.target.value)); }}
            className="flex-1 accent-amber-500"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="font-mono font-bold text-amber-400 w-10 text-right">
            {customDrop}%
          </span>
        </div>
      </div>
    </div>
  );
}
