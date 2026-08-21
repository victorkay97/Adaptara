export type MingcuteIconName = "arrowRight" | "arrowUpRight" | "check" | "circleCheck" | "controls" | "github" | "linkedin" | "menu" | "moon" | "shield" | "sparkles" | "sun" | "walletLock";

export function MingcuteIcon({ name, size = 18 }: { name: MingcuteIconName; size?: number }) {
  const paths: Record<MingcuteIconName, React.ReactNode> = {
    arrowRight: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    arrowUpRight: <><path d="M7 17 17 7"/><path d="M8 7h9v9"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    circleCheck: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    controls: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
    github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.4 4 5 5 0 0 0 19.3.5S18.2.2 15 1.8a13.4 13.4 0 0 0-7 0C4.8.2 3.7.5 3.7.5A5 5 0 0 0 3.6 4a5.4 5.4 0 0 0-1.4 3.7c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 8 18v4"/><path d="M8 19c-3 .9-3-1.5-4-2"/></>,
    linkedin: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z"/><path d="M2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    moon: <path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z"/>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/><path d="m5 14 .7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7zM19 14l.5 1.5L21 16l-1.5.5L19 18l-.5-1.5L17 16l1.5-.5z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    walletLock: <><path d="M4 6.5h12a2 2 0 0 1 2 2V10M4 6.5a2.5 2.5 0 0 1 2.5-2.5H16M4 6.5v11A2.5 2.5 0 0 0 6.5 20H12"/><rect x="13" y="13" width="8" height="7" rx="2"/><path d="M15.5 13v-1a1.5 1.5 0 0 1 3 0v1"/></>,
  };
  return <svg className="mingcute-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
