import type OpenAI from "openai";
import { requestMaterialFactAudit } from "./premium-fact-audit.server";
import { premiumTextSnapshot, type PremiumFacts } from "./premium-quality-gate.server";
import type { ListingTextVariant } from "./listing-text-quality";
export async function auditPremiumTexts(openai: OpenAI, facts: PremiumFacts, variants: ListingTextVariant[], sourceContext?: string, manualConfirmed = false) {
  const audit = await requestMaterialFactAudit(openai, { facts: { ...facts, ...(sourceContext ? { verifiedSourceText: sourceContext, manualConfirmed } : {}) }, market: String(facts.market ?? "") }, variants);
  return { status: audit.findings.length ? "failed" as const : "passed" as const, findings: audit.findings, snapshotHash: premiumTextSnapshot(facts, variants) };
}
