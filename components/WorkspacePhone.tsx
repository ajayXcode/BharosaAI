"use client";

import { RotateCw, Smartphone } from "lucide-react";
import { useState } from "react";

/**
 * The customer's real, authenticated app rendered beside the analyst dashboard.
 * It shares the same session and workspace, so uploads and approvals appear
 * here without a second login.
 */
export function WorkspacePhone({ className = "" }: { className?: string }) {
  const [nonce, setNonce] = useState(0);
  return (
    <div
      className={`flex min-h-0 flex-col items-center gap-2 border-l border-white/10 bg-[#0b1b33] px-4 py-3 ${className}`}
    >
      <div className="flex w-full items-center justify-between px-1">
        <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          <Smartphone className="size-3" />
          Customer&apos;s phone
        </span>
        <button
          type="button"
          onClick={() => setNonce((value) => value + 1)}
          className="grid size-6 cursor-pointer place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
          aria-label="Refresh Paytm app"
          title="Refresh Paytm app"
        >
          <RotateCw className="size-3" />
        </button>
      </div>
      <div className="relative min-h-0 w-full max-w-[334px] flex-1">
        <div className="absolute inset-0 rounded-[2.5rem] bg-[#050b16] p-[9px] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
          <div className="absolute top-[16px] left-1/2 z-20 h-[20px] w-[86px] -translate-x-1/2 rounded-full bg-[#050b16]" />
          <iframe
            key={nonce}
            src="/app?embed=1"
            title="Paytm app with Bharosa AI"
            className="h-full w-full rounded-[2rem] border-0 bg-page"
          />
        </div>
      </div>
      <p className="pb-0.5 text-center text-[9px] leading-relaxed text-white/35">
        Same account · same documents · live sync
      </p>
    </div>
  );
}
