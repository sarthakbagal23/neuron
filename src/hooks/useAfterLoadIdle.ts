import { useEffect, useState } from 'react';

// Gates heavy atmosphere visuals (WebGL brain, canvas particle layers,
// network backdrops) until the page has finished loading AND the main thread
// is idle. Two problems this solves, both visible in Lighthouse:
//
// 1. The three.js ecosystem (~870ms script eval on a throttled phone) and
//    the backdrop canvases were evaluating inside the initial load window,
//    pushing Total Blocking Time past 4s and LCP past 4s — even though the
//    actual LCP element is just the headline text.
// 2. Waiting for `load` first (rather than a fixed timeout) self-tunes to
//    the connection: instant on fast wifi, patient on conference wifi.
//    requestIdleCallback then fires as soon as the main thread breathes,
//    with a timeout backstop so a never-idle thread can't starve it forever.
//
// Mounting late is layout-safe here: every consumer renders into an
// absolutely-positioned inset-0 layer, so nothing shifts (no CLS).
export function useAfterLoadIdle(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleId = 0;
    let fallback = 0;

    const fire = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(
          () => {
            if (!cancelled) setReady(true);
          },
          { timeout: 2500 },
        );
      } else {
        fallback = window.setTimeout(() => {
          if (!cancelled) setReady(true);
        }, 1200);
      }
    };

    if (document.readyState === 'complete') {
      fire();
    } else {
      window.addEventListener('load', fire, { once: true });
    }
    return () => {
      cancelled = true;
      window.removeEventListener('load', fire);
      if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (fallback) window.clearTimeout(fallback);
    };
  }, []);

  return ready;
}
