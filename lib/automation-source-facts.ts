import { buildConfirmedAutopilotFacts } from './autopilot-confirmed-facts';
import type { PremiumFacts } from './premium-quality-gate.server';

export function applyDocumentedAutomationFacts(base: PremiumFacts, documents: Parameters<typeof buildConfirmedAutopilotFacts>[1], market: string) {
  const facts = buildConfirmedAutopilotFacts({ ...base, market }, documents);
  return { ...base, rooms: String(facts.rooms ?? ''), livingArea: String(facts.livingArea ?? ''), price: String(facts.price ?? ''),
    plotArea: facts.plotArea == null ? '' : String(facts.plotArea), currency: String(facts.currency ?? base.currency ?? ''),
    highlights: String(facts.verifiedFeatures ?? ''), verifiedFeatures: String(facts.verifiedFeatures ?? '') };
}

// One serializable facts contract for generation and final validation. No image
// observations become confirmed equipment through this mapping.
export function automationTextFacts(facts: Record<string, unknown>, market: string) {
  const keys = ['projectName','countryCode','street','postalCode','location','propertyType','rooms','livingArea','price','plotArea','marketingType','transactionType','currency','rentPeriod','commercialArea','commercialUse','priceOnRequestConfirmed','highlights','styleText'];
  return { ...Object.fromEntries(keys.filter(key => facts[key] !== undefined).map(key => [key, facts[key]])), market: market === 'DE' ? 'DE' : 'CH', locale: 'de', verifiedFeatures: facts.highlights ?? '' };
}
