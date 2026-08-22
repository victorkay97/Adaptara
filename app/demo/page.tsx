import { DemoDashboard } from "@/features/experience/components/demo-dashboard";
const views = { home: "Home", portfolio: "Portfolio", vaults: "Vaults", activity: "Activity" } as const;
export default async function DemoPage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  const requested = (await searchParams)?.view;
  return <DemoDashboard view={requested && requested in views ? views[requested as keyof typeof views] : "Home"} />;
}
