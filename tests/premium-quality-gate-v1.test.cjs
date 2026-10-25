/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS. */
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const sharp = require("sharp"), crypto = require("node:crypto");
const plain = value => JSON.parse(JSON.stringify(value));
function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const requireLocal = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "node:crypto") return crypto;
      if (id === "sharp") return { __esModule: true, default: sharp };
      if (id === "server-only") return {};
      if (id.startsWith("@/")) return load(id.slice(2) + ".ts");
      if (id.startsWith(".")) return load(path.resolve(path.dirname(file), id + ".ts"));
      throw Error("UNMOCKED_IMPORT: " + id);
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
      { module: mod, exports: mod.exports, require: requireLocal, Buffer, File, URL,
        process: { env: { OPENAI_API_KEY: "MOCK_ONLY" } }, console: { info() {}, warn() {}, error() {} }, ...globals }, { filename: file });
    return mod.exports;
  }
  return load;
}
const load = loader();
const gate = load("lib/premium-quality-gate.server.ts");
const { validateAutopilotImageAnalyses: validate } = load("lib/autopilot-image-quality.ts");
const variants = [
  {
    "title": "3-Zimmer-Wohnung mit Balkon in Schaffhausen",
    "text": "Diese 3-Zimmer-Wohnung in Schaffhausen verfügt über eine Wohnfläche von 85 m². Zur Ausstattung gehören ein Balkon, Parkettboden und eine separate Küche. Der Kaufpreis beträgt 450000 CHF. Die Küche ist vom übrigen Wohnbereich getrennt."
  },
  {
    "title": "Schaffhausen: Wohnung mit separater Küche",
    "text": "Die separate Küche zählt zu den Merkmalen dieser Wohnung. Ergänzt wird das Angebot durch einen Balkon und Parkettboden. Die Wohnung umfasst 3 Zimmer bei einer Wohnfläche von 85 m² und liegt in Schaffhausen. Der Kaufpreis beträgt 450000 CHF."
  },
  {
    "title": "Balkon und Parkett prägen das Angebot",
    "text": "Ein Balkon und Parkettboden gehören zur Ausstattung dieser Wohnung in Schaffhausen. Die Wohnfläche beträgt 85 m² bei insgesamt 3 Zimmern. Eine separate Küche ist ebenfalls vorhanden. Angeboten wird die Immobilie zum Kauf für 450000 CHF."
  }
];
const facts = { locale: "de", market: "CH", propertyType: "Wohnung", location: "Schaffhausen", rooms: 3, livingArea: 85, price: 450000,
  currency: "CHF", marketingType: "sale", transactionType: "sale", verifiedFeatures: "Balkon, Parkettboden, separate Küche", highlights: "Balkon, Parkettboden, separate Küche" };
const raw = (index = 1, extra = {}) => ({ imageIndex: index, room: "livingRoom", roomConfidence: .95, roomIndependentFacts: [{ fact: "Fenster", confidence: .95 }], condition: "", visibleFacts: [], category: "living", qualityScore: 90, titleScore: 90, sharpnessScore: 90, exposureScore: 90, suitable: true, suitabilityConfidence: .95, suitabilityReason: "Klar erkennbares Motiv", ...extra });
const image = { imageId: "1", fileName: "image.png", contentFingerprint: "a".repeat(64), analysis: validate([raw()], 1)[0] };
const sourceAudit = { status: "passed", conflicts: [], sources: [{ kind: "manual_confirmation", reference: "confirmed-facts" }] };
function input(extra = {}) {
  const value = { facts: { ...facts }, variants: plain(variants), sourceAudit: plain(sourceAudit), images: [plain(image)], expectedImageCount: 1, ...extra };
  if (!Object.hasOwn(extra, "textAudit")) value.textAudit = { status: "passed", findings: [], snapshotHash: gate.premiumTextSnapshot(value.facts, value.variants) };
  return value;
}
const accepted = value => { const result = gate.evaluatePremiumQualityGate(value); assert.equal(result.status, "READY", JSON.stringify(result)); return result; };
const denied = (value, reason) => { const result = gate.evaluatePremiumQualityGate(value); assert.equal(result.ready, false); if (reason) assert(result.reasons.includes(reason), JSON.stringify(result)); return result; };
test("complete residential purchase is READY", () => accepted(input()));
test("residential rental uses rent and rental period, no purchase-price field", () => accepted(input({ facts: { ...facts, marketingType: "rent", rentPeriod: "month" } })));
test("request pricing does not require a fabricated price or currency", () => accepted(input({ facts: { ...facts, marketingType: "on_request", price: null, currency: "", priceOnRequestConfirmed: true } })));
for (const [name, change, reason] of [
  ["unknown type", { propertyType: "Unbekannt" }, "PROPERTY_TYPE_UNSUPPORTED"],
  ["missing residential rooms", { rooms: null }, "ROOMS_REQUIRED"],
  ["missing residential area", { livingArea: null }, "LIVING_AREA_REQUIRED"],
  ["unknown marketing", { marketingType: "" }, "MARKETING_TYPE_UNVERIFIED"],
  ["missing offer amount", { price: null }, "OFFER_AMOUNT_REQUIRED"],
  ["unrepresentable amount precision", { price: 1200.5 }, "OFFER_AMOUNT_PRECISION_UNSUPPORTED"],
  ["missing currency", { currency: "" }, "CURRENCY_REQUIRED"],
  ["missing rental period", { marketingType: "rent" }, "RENT_PERIOD_REQUIRED"],
  ["unconfirmed request pricing", { marketingType: "on_request", priceOnRequestConfirmed: false }, "PRICE_ON_REQUEST_UNVERIFIED"],
]) test(name + " cannot become READY", () => denied(input({ facts: { ...facts, ...change } }), reason));
for (const textAudit of [undefined, null, { status: "missing", findings: [], snapshotHash: "" }, { status: "failed", findings: [], snapshotHash: "" }]) test("missing or failed fact audit is not passed: " + JSON.stringify(textAudit), () => denied(input({ textAudit }), "FACT_AUDIT_NOT_PASSED"));
test("old audit cannot authorize edited text", () => { const value = input(); value.variants[0].text += " Ein neuer Satz."; denied(value, "FACT_AUDIT_NOT_PASSED"); });
test("old audit cannot authorize edited facts", () => { const value = input(); value.facts.price = 470000; denied(value, "FACT_AUDIT_NOT_PASSED"); });
test("material fact findings block", () => { const value = input(); value.textAudit.findings.push({ code: "OTHER_MATERIAL_FACT" }); denied(value); });
test("unresolved currency conflict blocks", () => denied(input({ sourceAudit: { ...sourceAudit, conflicts: [{ field: "price", code: "EXPOSE_CORE_FACT_CONFLICT", status: "unresolved", candidates: [{ value: "450000", currency: "EUR" }, { value: "450000", currency: "CHF" }] }] } }), "UNRESOLVED_CORE_FACT_CONFLICT"));
test("source result and provenance are mandatory", () => { denied(input({ sourceAudit: null }), "SOURCE_AUDIT_NOT_PASSED"); denied(input({ sourceAudit: { ...sourceAudit, sources: [] } })); });
test("exactly three mutually distinct variants remain mandatory", () => { denied(input({ variants: variants.slice(0, 2) }), "TEXT_QUALITY_FAILED"); denied(input({ variants: [variants[0], variants[0], variants[0]] }), "TEXT_QUALITY_FAILED"); });
test("unverified equipment remains blocked", () => { const changed = plain(variants); changed[0].text += " Ein Pool gehört dazu."; denied(input({ variants: changed }), "UNSUPPORTED_PROPERTY_FEATURE"); });
test("missing or unsuitable image audit blocks", () => { denied(input({ images: [] }), "IMAGE_AUDIT_INCOMPLETE"); denied(input({ images: [{ ...image, analysis: { ...image.analysis, suitable: false } }] }), "IMAGE_REVIEW_REQUIRED"); });
test("malformed image quality cannot bypass the shared image validator", () => denied(input({ images: [{ ...image, analysis: { ...image.analysis, qualityScore: undefined } }] }), "IMAGE_AUDIT_INVALID"));
const landVariants = [
 { title: "Grundstück mit rechteckigem Zuschnitt in Schaffhausen", text: "Das Grundstück in Schaffhausen umfasst 1200 m². Seine Fläche ist eben und rechteckig zugeschnitten. Zum Angebot gehört die gesamte angegebene Grundstücksfläche. Ein Zugang von der Strasse ist vorhanden. Der Preis wird auf Anfrage mitgeteilt." },
 { title: "Ebene Fläche mit Zugang von der Strasse", text: "Ein Zugang von der Strasse erschliesst die ebene Fläche dieses Angebots. Der rechteckige Zuschnitt kennzeichnet das Grundstück. Die Liegenschaft befindet sich in Schaffhausen und weist 1200 m² auf. Angaben zum Preis erhalten Interessenten auf Anfrage." },
 { title: "Schaffhausen: 1200 Quadratmeter als Grundstücksangebot", text: "In Schaffhausen wird ein Grundstück mit 1200 m² angeboten. Geprägt ist die Fläche durch ihren ebenen Verlauf. Auch ein rechteckiger Zuschnitt gehört zu den Merkmalen. Von der Strasse besteht Zugang. Das Angebot nennt den Preis auf Anfrage." },
];
test("land requires plot area, never rooms or living area", () => {
  const value = input({ facts: { ...facts, propertyType: "Grundstück", rooms: null, livingArea: null, plotArea: 1200, marketingType: "on_request", price: null, priceOnRequestConfirmed: true }, variants: landVariants });
  accepted(value); denied(input({ ...value, facts: { ...value.facts, plotArea: null }, textAudit: undefined }), "PLOT_AREA_REQUIRED");
});
test("commercial rules require commercial area and verified usage", () => {
  const commercial = { ...facts, propertyType: "Gewerbeobjekt", rooms: null, livingArea: null, commercialArea: 350, commercialUse: "Büronutzung" };
  const texts = variants.map(v => ({ title: v.title.replaceAll("Wohnung", "Gewerbefläche"), text: v.text.replaceAll("Wohnung", "Gewerbefläche") }));
  // Fact-audit mechanics are tested below; the shared mandatory-field policy is
  // verified independently of model accuracy.
  const result = gate.evaluatePremiumQualityGate(input({ facts: commercial, variants: texts }));
  assert(!result.reasons.includes("ROOMS_REQUIRED")); assert(!result.reasons.includes("LIVING_AREA_REQUIRED"));
  assert(!result.reasons.includes("COMMERCIAL_AREA_REQUIRED")); assert(!result.reasons.includes("COMMERCIAL_USE_REQUIRED"));
  denied(input({ facts: { ...commercial, commercialArea: null } }), "COMMERCIAL_AREA_REQUIRED");
  denied(input({ facts: { ...commercial, commercialUse: "" } }), "COMMERCIAL_USE_REQUIRED");
});

async function harness(options = {}) {
  const records = [], blobs = new Map(), auditRequests = []; let listing = null, calls = 0;
  const png = await sharp({ create: { width: 32, height: 24, channels: 3, background: "red" } }).png().toBuffer();
  const prisma = {
    premiumQualityAssessment: {
      create: async ({ data }) => { if (options.storeError) throw Error("STORE_FAILED"); const record = { ...data, id: "receipt-" + (records.length + 1), createdAt: new Date() }; records.push(record); return record; },
      update: async ({ where, data }) => { const record = records.find(row => row.id === where.id); Object.assign(record, data); return record; },
      findFirst: async ({ where }) => [...records].reverse().find(record => (!where.id || record.id === where.id) && record.userId === where.userId && record.kind === where.kind && (!where.listingId || record.listingId === where.listingId) && (!where.version || record.version === where.version) && record.expiresAt > new Date()) ?? null,
    },
    listing: { findFirst: async ({ where }) => listing && where.userId === "owner" ? listing : null },
  };
  class MockOpenAI { constructor() { this.chat = { completions: { create: async request => { calls++; auditRequests.push(request); if (options.auditError) throw Error("AUDIT_FAILED"); return { choices: [{ finish_reason: options.finishReason ?? "stop", message: { content: options.auditContent ?? JSON.stringify({ completed: true, checkedVariants: [1,2,3], findings: [] }) } }] }; } } }; } }
  const next = { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
  const load = loader({
    "./prisma": { prisma }, "@/lib/prisma": { prisma },
    "./storage/storage.server": { getObjectBytes: async key => blobs.get(key) },
    "openai": { __esModule: true, default: MockOpenAI }, "next/server": next,
    "@/lib/listing-access": { canUseListingCoreForUser: async () => !options.accessDenied },
    "@/lib/session": { getAuthenticatedUser: async () => options.unauthenticated ? null : { id: "owner" } },
  }, { fetch: async (_url, request) => {
    const body = JSON.parse(request.body);
    const ids = body.text.format.schema.properties.imageAnalyses.items.properties.imageId.enum;
    return { ok: true, text: async () => JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ imageAnalyses: ids.map((imageId, index) => ({ ...raw(), imageId, imageIndex: index + 1 })) }) }] }] }) };
  } });
  const api = load("app/api/premium-quality/route.ts"), imageApi = load("app/api/premium-quality/images/route.ts"), service = load("lib/premium-quality.server.ts"), store = load("lib/premium-quality-store.server.ts");
  async function assess(extra = {}) {
    const form = new FormData(); form.set("facts", JSON.stringify({ ...facts, ...extra.facts })); form.set("variants", JSON.stringify(extra.variants ?? variants));
    form.set("manualConfirmed", String(extra.manualConfirmed ?? true)); if (extra.sourceId) form.set("sourceAssessmentId", extra.sourceId);
    if (extra.imageIds) form.set("imageAssessmentIds", JSON.stringify(extra.imageIds));
    else form.append("images", new File([png], "photo.png", { type: "image/png" }));
    return api.POST({ formData: async () => form });
  }
  function attach(record) {
    record.listingId = "listing";
    listing = { ...record.payload.facts, id: "listing", userId: "owner", generatedVariants: JSON.stringify(variants), archivedAt: null,
      images: [{ id: "image", storageKey: "image-key", position: 0, isPrimary: true }] };
    blobs.set("image-key", png);
    return listing;
  }
  return { api, imageApi, service, store, assess, attach, records, blobs, png, auditRequests, get calls() { return calls; }, get listing() { return listing; } };
}
test("actual final endpoint records a complete READY, with zero external services", async () => {
  const h = await harness(); const response = await h.assess();
  assert.equal(response.status, 200, JSON.stringify(response.body)); assert.equal(response.body.status, "READY"); assert.equal(h.calls, 1);
  h.attach(h.records[0]); assert.equal(await h.service.isListingPremiumQualityReady("owner", "listing"), true);
});
for (const auditContent of ["", "not json", "null", "{}", '{"findings":null}', '{"findings":[{"variantNumber":1.5}]}']) test("invalid audit response never becomes an empty pass: " + auditContent, async () => {
  const h = await harness({ auditContent }); const response = await h.assess(); assert.equal(response.body.ready, false); assert.equal(response.status, 422); assert.equal(h.records.length, 1); assert.equal(h.records[0].payload.decision.ready, false);
});
test("audit request failure blocks the actual endpoint", async () => { const h = await harness({ auditError: true }); assert.equal((await h.assess()).body.ready, false); });
test("persistence failure blocks the actual endpoint", async () => { const h = await harness({ storeError: true }); assert.equal((await h.assess()).body.ready, false); });
test("unauthenticated and missing-source requests cannot authorize READY", async () => {
  assert.equal((await (await harness({ unauthenticated: true })).assess()).status, 401);
  assert.equal((await (await harness()).assess({ manualConfirmed: false })).body.ready, false);
});
test("forged or foreign source receipts are rejected even with manual flags", async () => {
  const h = await harness(); assert.equal((await h.assess({ sourceId: "invented-id" })).body.ready, false);
  const record = await h.store.savePremiumAssessment("other-owner", "expose", { sourceChecked: true, extracted: facts, evidence: { conflicts: [] } });
  assert.equal((await h.assess({ sourceId: record.id })).body.ready, false);
});
for (const [name, mutate] of [
  ["facts", h => { h.listing.rooms = 4; }],
  ["texts", h => { h.listing.generatedVariants = JSON.stringify([{ ...variants[0], text: variants[0].text + " Verändert." }, ...variants.slice(1)]); }],
  ["images", async h => { h.blobs.set("image-key", await sharp({ create: { width: 32, height: 24, channels: 3, background: "blue" } }).png().toBuffer()); }],
  ["missing images", h => { h.listing.images = []; }],
  ["expired proof", h => { h.records[0].expiresAt = new Date(0); }],
  ["tampered proof", h => { h.records[0].payload.facts.rooms = 4; }],
]) test("a previous READY cannot authorize changed " + name, async () => {
  const h = await harness(); assert.equal((await h.assess()).body.ready, true); h.attach(h.records[0]); await mutate(h);
  assert.equal(await h.service.isListingPremiumQualityReady("owner", "listing"), false);
});
test("another user's valid proof never authorizes this listing", async () => {
  const h = await harness(); await h.assess(); h.attach(h.records[0]); assert.equal(await h.service.isListingPremiumQualityReady("other-owner", "listing"), false);
});
test("unconfirmed source-field changes are not treated as verified features", async () => {
  const h = await harness(); const receipt = await h.store.savePremiumAssessment("owner", "expose", { sourceChecked: true, extracted: facts, evidence: { conflicts: [] } });
  assert.equal((await h.assess({ sourceId: receipt.id, manualConfirmed: false, facts: { highlights: "Pool" } })).body.ready, false);
});
test("manual confirmation records resolved core conflicts instead of accepting browser statuses", async () => {
  const h = await harness(); const receipt = await h.store.savePremiumAssessment("owner", "expose", { sourceChecked: true, extracted: facts, evidence: { conflicts: [{ field: "rooms", code: "EXPOSE_CORE_FACT_CONFLICT", status: "unresolved", candidates: [{ value: "3" }, { value: "4" }] }] } });
  assert.equal((await h.assess({ sourceId: receipt.id, manualConfirmed: false })).body.ready, false);
  assert.equal((await h.assess({ sourceId: receipt.id, manualConfirmed: true })).body.ready, true);
});

const commercialVariants = [
 { title: "Bürofläche mit Besprechungsraum und Teeküche", text: "Die Gewerbefläche in Schaffhausen umfasst 350 m² und wird zur Büronutzung angeboten. Ein separater Besprechungsraum ergänzt die Arbeitsflächen. Eine Teeküche ist ebenfalls vorhanden. Das Objekt verfügt über einen Aufzug. Der Mietpreis beträgt 6000 CHF pro Monat." },
 { title: "Schaffhausen: Gewerbeangebot mit Aufzug", text: "Über einen Aufzug verfügt dieses Gewerbeangebot in Schaffhausen. Zur Ausstattung zählen ausserdem eine Teeküche und ein separater Besprechungsraum. Für die Büronutzung stehen 350 m² zur Verfügung. Die angebotene Fläche wird für monatlich 6000 CHF vermietet." },
 { title: "350 Quadratmeter zur Büronutzung mit eigener Teeküche", text: "Eine Teeküche gehört zu den Merkmalen dieser Bürofläche. Auch ein separater Besprechungsraum ist Bestandteil des Angebots. Die Fläche misst 350 m²; als Standort ist Schaffhausen angegeben. Ein Aufzug ist vorhanden. Die monatliche Miete liegt bei 6000 CHF." },
];
test("verified commercial rental can complete the real final endpoint", async () => {
 const h = await harness(); const response = await h.assess({ facts: { propertyType: "Gewerbeobjekt", rooms: null, livingArea: null, commercialArea: 350, commercialUse: "Büronutzung", marketingType: "rent", rentPeriod: "month", price: 6000, highlights: "Teeküche, separater Besprechungsraum, Aufzug" }, variants: commercialVariants });
 assert.equal(response.body.status, "READY", JSON.stringify(response.body));
});
test("verified land without rooms, living area or purchase price can complete the endpoint", async () => {
 const h = await harness(); const response = await h.assess({ facts: { propertyType: "Grundstück", rooms: null, livingArea: null, plotArea: 1200, marketingType: "on_request", price: null, currency: "", priceOnRequestConfirmed: true }, variants: landVariants });
 assert.equal(response.body.status, "READY", JSON.stringify(response.body));
});
for (const finishReason of ["length", "content_filter", ""]) test("incomplete model completion cannot pass: " + finishReason, async () => {
 const h = await harness({ finishReason }); assert.equal((await h.assess()).body.ready, false);
});
test("explicit audit coverage of all three variants is mandatory", async () => {
 const h = await harness({ auditContent: JSON.stringify({ completed: true, checkedVariants: [1,2], findings: [] }) });
 assert.equal((await h.assess()).body.ready, false);
});
test("existing feature access checks protect the new final endpoint", async () => {
 const h = await harness({ accessDenied: true }); assert.equal((await h.assess()).status, 403); assert.equal(h.calls, 0);
});
test("per-image proof IDs are owner-bound and replace the bulk upload", async () => {
 const h = await harness(); const form = new FormData(); form.set("image", new File([h.png], "photo.png", { type: "image/png" }));
 const checked = await h.imageApi.POST({ formData: async () => form }); assert.equal(checked.status, 200);
 assert.equal((await h.assess({ imageIds: [checked.body.assessmentId] })).body.ready, true);
 assert.equal((await h.assess({ imageIds: [checked.body.assessmentId, checked.body.assessmentId] })).body.ready, false);
 assert.equal((await h.assess({ imageIds: ["fake"] })).body.ready, false);
});
test("changing the title image invalidates the proof", async () => {
 const h = await harness(); await h.assess(); h.attach(h.records[0]); h.listing.images[0].isPrimary = false;
 assert.equal(await h.service.isListingPremiumQualityReady("owner", "listing"), false);
});
test("changed address invalidates the proof", async () => {
 const h = await harness(); await h.assess(); h.attach(h.records[0]); h.listing.street = "Andere Strasse 9";
 assert.equal(await h.service.isListingPremiumQualityReady("owner", "listing"), false);
});
test("rental conflicts reuse the existing parser without changing sale defaults", () => {
 const { collectExposeCoreFacts: collect } = load("lib/expose-core-fact-conflicts.ts");
 assert.equal(collect("Mietpreis: EUR 1000\nMietpreis: EUR 1200", "rent").conflicts[0].field, "price");
 assert.equal(collect("Mietpreis: EUR 1000\nMietpreis: CHF 1000", "rent").conflicts[0].field, "price");
 assert.equal(collect("Kaufpreis: EUR 450000\nMietpreis: EUR 1000").values.price, "450000");
 assert.equal(collect("Kaufpreis: EUR 450000\nMietpreis: EUR 1000", "rent").values.price, "1000");
 assert.equal(collect("Mietpreis: 12 EUR/m²", "rent").ambiguousPriceUnits, true);
});

test("unsupported publication context cannot reuse a valid quality READY", async () => {
 const h = await harness(); await h.assess(); h.attach(h.records[0]);
 assert.equal(await h.service.isListingPremiumPublicationReady("owner", "listing"), false);
 await h.store.savePremiumAssessment("owner","broker_approval",{snapshot:(await h.service.currentBrokerSnapshot(h.listing)).snapshot,assessmentId:h.records[0].id,explicitlyConfirmed:true},"listing");
 assert.equal(await h.service.isListingPremiumPublicationReady("owner", "listing"), true);
 const rental = await harness();
 await rental.assess({ facts: { propertyType: "Gewerbeobjekt", rooms: null, livingArea: null, commercialArea: 350, commercialUse: "Büronutzung", marketingType: "rent", rentPeriod: "month", price: 6000, highlights: "Teeküche, separater Besprechungsraum, Aufzug" }, variants: commercialVariants });
 rental.attach(rental.records[0]); rental.listing.generatedVariants = JSON.stringify(commercialVariants);
 assert.equal(await rental.service.isListingPremiumQualityReady("owner", "listing"), true);
 await rental.store.savePremiumAssessment("owner","broker_approval",{snapshot:(await rental.service.currentBrokerSnapshot(rental.listing)).snapshot,assessmentId:rental.records[0].id,explicitlyConfirmed:true},"listing");
 assert.equal(await rental.service.isListingBrokerApproved("owner", "listing"), true);
 assert.equal(await rental.service.isListingPremiumPublicationReady("owner", "listing"), false);
});
test("a failed mandatory re-audit supersedes an older successful proof", async () => {
 const h = await harness(); await h.assess(); h.attach(h.records[0]);
 const payload = h.records[0].payload;
 await assert.rejects(h.service.checkAndRecordPremiumQuality({
  userId: "owner", listingId: "listing", facts: payload.facts, variants: payload.variants, sourceAudit: payload.sourceAudit, images: payload.images,
  openai: { chat: { completions: { create: async () => { throw Error("RE_AUDIT_FAILED"); } } } },
 }), /RE_AUDIT_FAILED/);
 assert.equal(h.records.length, 2);
 assert.equal(h.records[1].payload.decision.ready, false);
 assert.equal(await h.service.isListingPremiumQualityReady("owner", "listing"), false);
});
test("manual edits still obey the strict existing format rules", () => {
 const edited = plain(variants); edited[0].title = "Kurz";
 denied(input({ variants: edited }), "STRICT_FORMAT_QUALITY_FAILED");
});

test("request pricing never infers a transaction type", () => {
 denied(input({ facts: { ...facts, marketingType: "on_request", price: null, priceOnRequestConfirmed: true, transactionType: "" } }), "TRANSACTION_TYPE_REQUIRED");
});
test("AI core fields without documentary evidence are not documented facts", () => {
 assert.equal(gate.arePremiumCoreFactsDocumented(facts, { values: { rooms: "", livingArea: "", price: "" } }), false);
 assert.equal(gate.arePremiumCoreFactsDocumented(facts, { values: { rooms: "3", livingArea: "85", price: "450000" }, currency: "CHF" }), true);
 assert.equal(gate.arePremiumCoreFactsDocumented(facts, { values: { rooms: "3", livingArea: "85", price: "450000" } }), false);
});
test("actual stored image ordering is part of the proof", async () => {
 const h = await harness();
 const blue = await sharp({ create: { width: 32, height: 24, channels: 3, background: "blue" } }).png().toBuffer();
 const ids = [];
 for (const bytes of [h.png, blue]) {
  const form = new FormData(); form.set("image", new File([bytes], "photo.png", { type: "image/png" }));
  ids.push((await h.imageApi.POST({ formData: async () => form })).body.assessmentId);
 }
 const response = await h.assess({ imageIds: ids }); assert.equal(response.body.ready, true);
 const record = h.records.find(row => row.id === response.body.assessmentId); h.attach(record);
 h.listing.images = [{ id: "red", storageKey: "red", position: 0, isPrimary: true }, { id: "blue", storageKey: "blue", position: 1, isPrimary: false }];
 h.blobs.set("red", h.png); h.blobs.set("blue", blue);
 assert.equal(await h.service.isListingPremiumQualityReady("owner", "listing"), true);
 h.listing.images[0].position = 1; h.listing.images[1].position = 0;
 assert.equal(await h.service.isListingPremiumQualityReady("owner", "listing"), false);
});

test("missing or incompatible language cannot authorize German portal copy", () => {
 denied(input({ facts: { ...facts, locale: "" } }), "LANGUAGE_UNVERIFIED");
 denied(input({ facts: { ...facts, market: "DE", locale: "it" } }), "LANGUAGE_MARKET_UNSUPPORTED");
});

test("the final audit receives the original source instead of trusting derived fields", async () => {
 const h = await harness();
 const sourceText = "Zimmer: 3\nWohnfläche: 85 m²\nKaufpreis: CHF 450000\nWohnung in Schaffhausen mit Balkon, Parkettboden und separater Küche.";
 const evidence = load("lib/expose-core-fact-conflicts.ts").collectExposeCoreFacts(sourceText);
 const receipt = await h.store.savePremiumAssessment("owner", "expose", { extracted: facts, evidence, sourceChecked: true, sourceText });
 const result = await h.assess({ sourceId: receipt.id, manualConfirmed: false });
 assert.equal(result.body.ready, true, JSON.stringify(result.body));
 const userMessage = h.auditRequests[0].messages.find(message => message.role === "user").content;
 assert(userMessage.includes("verifiedSourceText")); assert(userMessage.includes("450000"));
 const final = h.records.find(row => row.id === result.body.assessmentId);
 assert.equal(final.payload.facts.verifiedSourceText, undefined);
});
test("two currencies inside one price expression remain an unresolved conflict", () => {
 const { collectExposeCoreFacts: collect } = load("lib/expose-core-fact-conflicts.ts");
 assert.equal(collect("Kaufpreis: EUR 450000 CHF").conflicts[0].field, "price");
 assert.equal(collect("Mietpreis: EUR 1000 CHF", "rent").conflicts[0].field, "price");
 assert.equal(collect("Kaufpreis: EUR 450000 €").conflicts.length, 0);
});
