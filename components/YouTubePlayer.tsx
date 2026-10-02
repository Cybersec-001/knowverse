"use client";
import { useEffect, useRef, useState } from "react";
type Player = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
};
declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => Player;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
export function YouTubePlayer({
  videoId,
  seekSeconds,
  onTimeChange,
}: {
  videoId: string;
  seekSeconds: number;
  onTimeChange?: (seconds: number) => void;
}) {
  const player = useRef<Player | null>(null),
    container = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const setup = () => {
      if (cancelled || !window.YT || player.current || !container.current)
        return;
      player.current = new window.YT.Player(container.current, {
        videoId,
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
        },
      });
    };
    if (window.YT) setup();
    else {
      window.onYouTubeIframeAPIReady = setup;
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId]);
  useEffect(() => {
    if (ready) player.current?.seekTo(seekSeconds, true);
  }, [seekSeconds, ready]);
  useEffect(() => {
    if (!ready || !onTimeChange) return;
    const timer = setInterval(() => {
      if (player.current?.getPlayerState() === 1)
        onTimeChange(player.current.getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, [ready, onTimeChange]);
  return (
    <div className="w-full aspect-video rounded-[14px] overflow-hidden bg-[#202b28]">
      <div ref={container} className="w-full h-full" />
    </div>
  );
}
