import { useEffect, useState } from "react";

export function useInView(
  targetRef,
  { rootRef = null, rootMargin = "0px", threshold = 0 } = {}
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = targetRef?.current;
    if (!node || typeof window === "undefined") return;

    const rootEl = rootRef?.current || null;
    let cancelled = false;
    let obs = null;
    let rafId = null;
    let scheduled = false;
    const passiveOpts = { passive: true };

    function parseRootMargin(margin, rootRect) {
      const parts = String(margin || "0px")
        .trim()
        .split(/\s+/);
      let t, r, b, l;
      if (parts.length === 1) {
        t = r = b = l = parts[0];
      } else if (parts.length === 2) {
        t = b = parts[0];
        r = l = parts[1];
      } else if (parts.length === 3) {
        t = parts[0];
        r = l = parts[1];
        b = parts[2];
      } else {
        t = parts[0];
        r = parts[1];
        b = parts[2];
        l = parts[3];
      }

      const width = (rootRect && rootRect.width) || window.innerWidth;
      const height = (rootRect && rootRect.height) || window.innerHeight;

      function toPx(val, axisLen) {
        if (typeof val !== "string") return 0;
        if (val.endsWith("%")) return (parseFloat(val) / 100) * axisLen;
        return parseFloat(val) || 0;
      }

      return [toPx(t, height), toPx(r, width), toPx(b, height), toPx(l, width)];
    }

    function computeIsIntersecting() {
      const nRect = node.getBoundingClientRect();
      const rRect = rootEl
        ? rootEl.getBoundingClientRect()
        : {
            top: 0,
            left: 0,
            bottom: window.innerHeight,
            right: window.innerWidth,
            width: window.innerWidth,
            height: window.innerHeight,
          };

      const [mt, mr, mb, ml] = parseRootMargin(rootMargin, rRect);

      const rTop = rRect.top - mt;
      const rLeft = rRect.left - ml;
      const rBottom = rRect.bottom + mb;
      const rRight = rRect.right + mr;

      const overlapW =
        Math.min(nRect.right, rRight) - Math.max(nRect.left, rLeft);
      const overlapH =
        Math.min(nRect.bottom, rBottom) - Math.max(nRect.top, rTop);

      return overlapW > 0 && overlapH > 0;
    }

    function safeSetInView(val) {
      if (cancelled) return;
      setInView((prev) => (prev === val ? prev : val));
    }

    function handleObserverEntries(entries) {
      if (cancelled || !entries || entries.length === 0) return;
      const entry = entries.find((e) => e.target === node) || entries[0];
      if (entry) safeSetInView(entry.isIntersecting);
    }

    function rafCheck() {
      scheduled = false;
      rafId = null;
      if (cancelled) return;
      safeSetInView(computeIsIntersecting());
    }

    function scheduleCheck() {
      if (scheduled || cancelled) return;
      scheduled = true;
      rafId = requestAnimationFrame(rafCheck);
    }

    function scrollHandler() {
      if (cancelled) return;
      if (obs) {
        const entries = obs.takeRecords();
        if (entries && entries.length) {
          handleObserverEntries(entries);
          return;
        }
      }
      scheduleCheck();
    }

    if (!("IntersectionObserver" in window)) {
      safeSetInView(computeIsIntersecting());
      window.addEventListener("scroll", scrollHandler, passiveOpts);
      window.addEventListener("resize", scrollHandler, passiveOpts);
      if (rootEl && rootEl.addEventListener) {
        rootEl.addEventListener("scroll", scrollHandler, passiveOpts);
      }
    } else {
      obs = new IntersectionObserver(
        (entries) => {
          handleObserverEntries(entries);
        },
        { root: rootEl, rootMargin, threshold }
      );

      obs.observe(node);

      window.addEventListener("scroll", scrollHandler, passiveOpts);
      window.addEventListener("resize", scrollHandler, passiveOpts);
      if (rootEl && rootEl.addEventListener) {
        rootEl.addEventListener("scroll", scrollHandler, passiveOpts);
      }

      const pending = obs.takeRecords();
      if (pending && pending.length) {
        handleObserverEntries(pending);
      } else {
        safeSetInView(computeIsIntersecting());
      }
    }

    return () => {
      cancelled = true;
      if (obs) obs.disconnect();
      window.removeEventListener("scroll", scrollHandler, passiveOpts);
      window.removeEventListener("resize", scrollHandler, passiveOpts);
      if (rootEl && rootEl.removeEventListener) {
        rootEl.removeEventListener("scroll", scrollHandler, passiveOpts);
      }
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetRef?.current, rootRef?.current, rootMargin, threshold]);

  return inView;
}
