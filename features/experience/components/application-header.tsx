import type { ReactNode } from "react";
import { Brand } from "@/components/brand/brand";

export function ApplicationHeader({ navigation, context }: { navigation: ReactNode; context: ReactNode }) {
  return <header className="final-app-header"><div className="final-app-header__inner"><Brand href="/"/><nav className="final-app-nav" aria-label="Application navigation">{navigation}</nav><div className="final-app-context">{context}</div></div></header>;
}
