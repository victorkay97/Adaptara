import { DashboardShell } from "@/features/experience/components/dashboard-shell";

export function Dashboard({ showOrientation = false }: { showOrientation?: boolean }) {
  return <DashboardShell showOrientation={showOrientation} />;
}
