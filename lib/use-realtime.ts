"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * Subscribe to this user's workspace row in Supabase Realtime and refresh
 * whenever another tab, device or server action changes it.
 */
export function useRealtimeWorkspace(onChange: () => void) {
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const response = await fetch("/api/auth/realtime");
        if (!response.ok || !active) return;
        const config = (await response.json()) as {
          url: string;
          key: string;
          token: string;
          userId: string;
        };
        if (!active) return;

        const supabase = createClient(config.url, config.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await supabase.realtime.setAuth(config.token);

        let timer: ReturnType<typeof setTimeout> | null = null;
        const channel = supabase
          .channel(`workspace:${config.userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workspace_state",
              filter: `id=eq.${config.userId}`,
            },
            () => {
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => callback.current(), 120);
            },
          )
          .subscribe();

        cleanup = () => {
          if (timer) clearTimeout(timer);
          void supabase.removeChannel(channel);
        };
      } catch {
        // Realtime is an enhancement; normal request/response still works.
      }
    })();

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);
}
