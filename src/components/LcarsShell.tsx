import { ReactNode } from "react";

export function LcarsPanel({
  title,
  accent = "bg-lcars-amber",
  children,
  className = "",
}: {
  title?: string;
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-lcars-panel rounded-xl overflow-hidden flex flex-col ${className}`}>
      {title ? (
        <div
          className={`${accent} lcars-caps text-black font-semibold px-4 py-1.5 text-sm shrink-0`}
        >
          {title}
        </div>
      ) : null}
      <div className="p-4 flex-1 min-h-0">{children}</div>
    </div>
  );
}
