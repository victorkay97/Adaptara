export type ProductIconName = "overview" | "portfolio" | "intelligence" | "strategy" | "safety";

export function ProductIcon({ name }: { name: ProductIconName }) {
  const paths: Record<ProductIconName, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    portfolio: <><path d="M4 7h16v12H4z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 12h16"/></>,
    intelligence: <><path d="M12 3a5 5 0 0 0-3.8 8.25A4 4 0 0 0 10 19h4a4 4 0 0 0 1.8-7.75A5 5 0 0 0 12 3Z"/><path d="M12 7v10M8.5 10H12m0 4h3.5"/></>,
    strategy: <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6.5 7.5l4.3 8.8m6.7-8.8-4.3 8.8"/></>,
    safety: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  };
  return <svg className="product-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
