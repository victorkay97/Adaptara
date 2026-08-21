import { Dashboard } from "@/components/layout/dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const params = await searchParams;
  return <Dashboard showOrientation={params.welcome === "1"} />;
}
