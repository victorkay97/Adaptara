import { notFound } from "next/navigation";
import { ProductShowcase, VaultFixtureState, type ShowcaseView, type VaultFixtureScenario } from "@/features/experience/components/product-showcase";
export default async function DevShowcase({searchParams}:{searchParams:Promise<{view?:string;scenario?:string}>}) {
  if (process.env.NODE_ENV === "production") notFound();
  const {view,scenario} = await searchParams;
  const allowed: ShowcaseView[] = ["Home","Portfolio","Vaults","Activity","Account"];
  const initialView: ShowcaseView = allowed.find((item)=>item===view) ?? "Home";
  const vaultScenario: VaultFixtureScenario | undefined = (["zero", "v1", "v2", "mixed"] as const).find((item)=>item===scenario);
  return initialView === "Vaults" && vaultScenario ? <VaultFixtureState scenario={vaultScenario}/> : <ProductShowcase initialView={initialView}/>;
}
