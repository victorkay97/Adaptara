import { notFound } from "next/navigation";
import { GovernanceHandover } from "@/features/governance/governance-handover";

export const GOVERNANCE_HANDOVER_PATH = "/dev-governance-handover";

export default function GovernanceHandoverPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GovernanceHandover />;
}
