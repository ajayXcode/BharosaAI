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
      className={`flex min-h-0 flex-col items-center justify-center gap-3 bg-[#07152a] px-5 py-4 min-[1280px]:py-5 ${className}`}
    >
      <div className="flex w-full max-w-[360px] items-center justify-between px-1">
        <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-white/45 uppercase">
          Customer&apos;s phone
        </span>
        <button
          type="button"
          onClick={() => setNonce((value) => value + 1)}
          className="grid size-7 cursor-pointer place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="Refresh Paytm app"
          title="Refresh Paytm app"
        >
          <RotateCw className="size-3.5" />
        </button>
      </div>
      <div className="relative h-[min(760px,calc(100dvh-5.5rem))] w-full max-w-[360px]">
        <div className="absolute inset-0 rounded-[3rem] bg-[#050b16] p-[10px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/12">
          <div className="absolute top-[18px] left-1/2 z-20 h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-[#050b16]" />
          <div className="absolute top-[24px] left-1/2 z-20 h-[5px] w-[5px] -translate-x-[calc(50%+28px)] rounded-full bg-[#1a2433]" />
          <iframe
            key={nonce}
            src="/app?embed=1"
            title="Paytm app with Bharosa AI"
            className="h-full w-full rounded-[2.35rem] border-0 bg-[#f3f6fa]"
          />
        </div>
      </div>
      <p className="text-center text-[10px] leading-relaxed text-white/35">
        Paytm app · Bharosa AI inside · live sync
      </p>
    </div>
  );
}
