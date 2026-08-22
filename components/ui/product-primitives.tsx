import type { ReactNode } from "react";

export function DemoModeBadge() {
  return <span className="demo-badge"><span aria-hidden="true" />Demo mode · non-live inputs</span>;
}

export function TechnicalDisclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return <details className="technical-disclosure"><summary>{summary}<span aria-hidden="true">+</span></summary><div>{children}</div></details>;
}

export function ProductState({ eyebrow = "Workspace status", title, detail, action }: { eyebrow?: string; title: string; detail: string; action?: ReactNode }) {
  return <section className="product-state"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{detail}</p>{action ? <div className="product-state__action">{action}</div> : null}</section>;
}
