"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".lp-page");
    if (!page) return;
    page.querySelectorAll<HTMLElement>(".lp-experience,.lp-trust,.lp-final,.lp-footer").forEach((target) => {
      target.dataset.motion = "reveal";
    });
    const targets = Array.from(page.querySelectorAll<HTMLElement>("[data-motion]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("lp-motion-visible"));
      return;
    }
    page.classList.add("lp-motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("lp-motion-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.12 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);
  return null;
}
