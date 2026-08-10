"use client";

// ---------------------------------------------------------------------------
// TEMPORARY. Delete this file when the Star Map's width is settled.
//
// Removal is: delete this file, drop the import and the two `dev*` state
// hooks in `AppShell`, and put the sidebar's `w-[360px]` back (or bake in
// whatever number won). Everything it touches is marked `DevSizer` there.
//
// Deliberately not themed - it is scaffolding, and making it look like part
// of the console would only make it harder to spot on the way out.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";

export function DevSizer({
  sidebarW,
  setSidebarW,
  legW,
  setLegW,
}: {
  sidebarW: number;
  setSidebarW: (n: number) => void;
  legW: number;
  setLegW: (n: number) => void;
}) {
  // Read back what the change actually did, since the whole point is the
  // trade: every pixel the sidebar takes comes out of `main`, and past a
  // point the map's own column starts to scroll.
  const [readout, setReadout] = useState({ main: 0, panel: 0, box: 0, over: 0 });

  useEffect(() => {
    const measure = () => {
      const main = document.getElementById("main-content");
      const box = document.getElementById("starmap-sidebar");
      const panel = box?.querySelector<HTMLElement>('[class*="rounded-tl-"]');
      setReadout({
        main: main ? Math.round(main.getBoundingClientRect().width) : 0,
        panel: panel ? Math.round(panel.getBoundingClientRect().height) : 0,
        box: box ? box.clientHeight : 0,
        over: box ? box.scrollHeight - box.clientHeight : 0,
      });
    };
    const id = window.setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, [sidebarW, legW]);

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        // Clear of Next's dev badge, which sits in that corner.
        bottom: 64,
        zIndex: 9999,
        background: "#111",
        border: "1px solid #555",
        borderRadius: 6,
        padding: "8px 10px",
        font: "12px system-ui, sans-serif",
        color: "#eee",
        width: 260,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        Star Map sizing <span style={{ opacity: 0.5, fontWeight: 400 }}>(temporary)</span>
      </div>

      <label style={{ display: "block", marginBottom: 6 }}>
        Sidebar width: <b>{sidebarW}px</b>
        <input
          type="range"
          min={300}
          max={620}
          step={4}
          value={sidebarW}
          onChange={(e) => setSidebarW(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 6 }}>
        Leg width: <b>{legW}px</b>
        <input
          type="range"
          min={24}
          max={96}
          step={2}
          value={legW}
          onChange={(e) => setLegW(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </label>

      <div style={{ opacity: 0.75, lineHeight: 1.5 }}>
        main {readout.main}px · panel {readout.panel} in {readout.box}
        <br />
        <span style={{ color: readout.over > 0 ? "#ff8a8a" : "#8aff9e" }}>
          {readout.over > 0 ? `sidebar scrolls, ${readout.over}px over` : "fits, no scroll"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          setSidebarW(360);
          setLegW(40);
        }}
        style={{ marginTop: 6, font: "inherit", cursor: "pointer" }}
      >
        reset to shipped (360 / 40)
      </button>
    </div>
  );
}
