"use client";

import { useMemo, useState } from "react";
import { Region, Quadrant } from "@/lib/puzzle-types";
import { QUADRANTS } from "@/lib/grid";
import { runShape } from "@/lib/lcars-colors";
import { surveyQuadrant } from "@/lib/quadrant-survey";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";

export function QuadrantSurveyPanel({ region }: { region: Region }) {
  const [quadrant, setQuadrant] = useState<Quadrant>("I");
  const result = useMemo(() => surveyQuadrant(region, quadrant), [region, quadrant]);

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title="Quadrant Survey" accent="bg-lcars-salmon">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Sweep a quadrant for a census of every ring and bearing within it —
          how many signatures sit inside it, and what they&apos;re classified
          as. Rings, bearings, and identities aren&apos;t revealed; only the
          count.
        </p>

        <div className="flex flex-nowrap gap-1 overflow-x-auto mb-4">
          {QUADRANTS.map((q, i) => (
            <LcarsButton
              key={q}
              color="salmon"
              onClick={() => setQuadrant(q)}
              shape={runShape(i, QUADRANTS.length)}
              orientation="horizontal"
            >
              {q}
            </LcarsButton>
          ))}
        </div>

        <div className="bg-lcars-panel rounded-lg p-4">
          <div className="lcars-caps text-xs text-lcars-ice/50 mb-2">
            Quadrant {quadrant} &mdash; Census Report
          </div>

          {result.totalSignatures === 0 ? (
            <p className="text-sm text-lcars-ice/60">No signatures detected in this quadrant.</p>
          ) : (
            <>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-bold text-lcars-amber leading-none font-mono">
                  {result.totalSignatures}
                </span>
                <span className="lcars-caps text-xs text-lcars-ice/60 mb-1">
                  signature{result.totalSignatures === 1 ? "" : "s"} detected
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {result.byType.map(({ type, count }) => (
                  <li key={type} className="flex rounded overflow-hidden">
                    <span className="flex-1 min-w-0 flex items-center justify-between text-sm bg-black/25 px-2.5 py-1.5">
                      <span className="text-lcars-ice/90">{type}</span>
                      <span className="font-mono text-lcars-amber">&times;{count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </LcarsPanel>
    </div>
  );
}
