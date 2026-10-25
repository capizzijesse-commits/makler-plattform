/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");
const crypto = require("node:crypto");
const plain = value => JSON.parse(JSON.stringify(value));
function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const requireLocal = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "sharp") return { __esModule: true, default: sharp };
      if (id === "node:crypto") return crypto;
      if (id.startsWith("@/")) return load(id.slice(2) + ".ts");
      if (id.startsWith(".")) return load(path.resolve(path.dirname(file), id + ".ts"));
      throw Error("UNMOCKED_IMPORT: " + id);
    };
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      module: mod, exports: mod.exports, require: requireLocal, Buffer,
      console: { info() {}, warn() {}, error() {} },
      process: { env: { OPENAI_API_KEY: "MOCK_ONLY" } }, ...globals,
    }, { filename: file });
    return mod.exports;
  }
  return load;
}
const load = loader();
const { validateAutopilotImageAnalyses: validate, selectAutopilotImages: select, describeAutopilotImageReview: describe } = load("lib/autopilot-image-quality.ts");
const { fingerprintImageContent: fingerprint } = load("lib/image-content-fingerprint.server.ts");
const { buildSafeImageRoomPrompt: prompt } = load("lib/image-expose-consistency.ts");
const analysis = (index = 1, extra = {}) => ({
  imageIndex: index, room: "livingRoom", roomConfidence: .95, roomIndependentFacts: [{ fact: "Fenster", confidence: .95 }],
  condition: "Keine weiteren bestätigten Angaben", visibleFacts: ["UNVERIFIED_DETAIL"], category: "living",
  qualityScore: 90, titleScore: 90, sharpnessScore: 90, exposureScore: 90,
  suitable: true, suitabilityConfidence: .95, suitabilityReason: "Klar erkennbares Immobilienfoto", ...extra,
});
const candidate = (index, extra = {}) => ({
  imageId: "image-" + index, fileName: index + ".png", contentFingerprint: String(index).padStart(64, "0"),
  analysis: validate([analysis(1, extra)], 1)[0],
});
test("complete one-to-one analyses are sorted by their exact indices", () => {
  const result = validate([analysis(2, { category: "kitchen", room: "kitchen" }), analysis(1)], 2);
  assert.deepEqual(plain(result.map(item => item.imageIndex)), [1, 2]);
  assert.equal(result[1].room, "Küche");
});
for (const [name, value, count, error] of [
  ["missing analysis", [analysis(1)], 2, "INCOMPLETE"],
  ["same-length duplicate indices", [analysis(1), analysis(1)], 2, "INDEX_INVALID"],
  ["zero-based index", [analysis(0)], 1, "INDEX_INVALID"],
  ["out-of-range index", [analysis(2)], 1, "INDEX_INVALID"],
  ["fractional index", [analysis(1.5)], 1, "INDEX_INVALID"],
  ["string index", [analysis("1")], 1, "INDEX_INVALID"],
  ["null record", [null], 1, "INDEX_INVALID"],
  ["missing suitability", [analysis(1, { suitable: undefined })], 1, "ANALYSIS_INVALID"],
  ["missing quality score", [analysis(1, { qualityScore: undefined })], 1, "ANALYSIS_INVALID"],
  ["NaN quality", [analysis(1, { qualityScore: NaN })], 1, "ANALYSIS_INVALID"],
  ["infinite confidence", [analysis(1, { suitabilityConfidence: Infinity })], 1, "ANALYSIS_INVALID"],
  ["missing room confidence", [analysis(1, { roomConfidence: undefined })], 1, "ANALYSIS_INVALID"],
  ["unknown category", [analysis(1, { category: "invented" })], 1, "ANALYSIS_INVALID"],
]) test(name + " is rejected without positive defaults", () => assert.throws(() => validate(value, count), new RegExp(error)));
test("uncertain rooms and unsupported visible features cannot authorize facts", () => {
  const [result] = validate([analysis(1, { roomConfidence: .2, visibleFacts: ["Schlafzimmer", "Pool"], roomIndependentFacts: [{ fact: "Fenster", confidence: .95 }, { fact: "Pool", confidence: 1 }] })], 1);
  assert.equal(result.room, null);
  assert.equal(prompt([result]).includes("Schlafzimmer"), false);
  assert.equal(prompt([result]).includes("Pool"), false);
  assert(prompt([result]).includes("Fenster"));
  assert(select([{ ...candidate(1), analysis: result }]).requiresReview);
});
for (const [name, extra, reason] of [
  ["unsuitable", { suitable: false }, "UNSUITABLE_IMAGE"],
  ["document despite suitable flag", { category: "document" }, "UNSUITABLE_IMAGE"],
  ["floorplan", { category: "floorplan" }, "UNSUITABLE_IMAGE"],
  ["logo", { category: "logo" }, "UNSUITABLE_IMAGE"],
  ["uncertain suitability", { suitabilityConfidence: .5 }, "SUITABILITY_UNCERTAIN"],
  ["blur", { sharpnessScore: 20 }, "SHARPNESS_REVIEW_REQUIRED"],
  ["poor exposure", { exposureScore: 20 }, "EXPOSURE_REVIEW_REQUIRED"],
  ["low quality", { qualityScore: 40 }, "QUALITY_REVIEW_REQUIRED"],
]) test(name + " is excluded from automatic selection with review reason", () => {
  const result = select([candidate(1), candidate(2, extra)]);
  assert.deepEqual(plain(result.selectedImageIds), ["image-1"]);
  assert(result.entries[1].reasons.includes(reason));
  assert(result.requiresReview);
  assert(describe(result).includes("2.png"));
});
test("hero score leads, then existing property-presentation priority", () => {
  const result = select([candidate(1, { category: "bathroom", room: "bathroom", titleScore: 70 }), candidate(2, { room: "livingRoom", titleScore: 80 }), candidate(3, { category: "exterior", room: "exterior", titleScore: 95 }), candidate(4, { category: "kitchen", room: "kitchen", titleScore: 70 })]);
  assert.deepEqual(plain(result.selectedImageIds), ["image-3", "image-2", "image-4", "image-1"]);
  assert.equal(result.primaryImageId, "image-3");
  assert.equal(result.requiresReview, false);
});
test("absence of a confirmed hero requires manual review", () => {
  const result = select([candidate(1, { titleScore: 20 })]);
  assert.equal(result.primaryImageId, null);
  assert(result.reasons.includes("NO_CONFIRMED_HERO_IMAGE"));
  assert(result.requiresReview);
});
const png = color => sharp({ create: { width: 32, height: 24, channels: 3, background: color } }).png().toBuffer();
test("identical pixels with different file metadata are duplicates without modifying originals", async () => {
  const original = await png("red");
  const snapshot = Buffer.from(original);
  const reencoded = await sharp(original).withMetadata({ density: 144 }).png().toBuffer();
  assert.notDeepEqual(original, reencoded);
  const hash = await fingerprint(original);
  assert.equal(await fingerprint(reencoded), hash);
  const a = { ...candidate(1), contentFingerprint: hash };
  const b = { ...candidate(2), contentFingerprint: hash };
  const result = select([a, b]);
  assert.equal(result.entries[1].duplicateOf, "image-1");
  assert.equal(result.entries[1].selected, false);
  assert.deepEqual(original, snapshot);
});
test("different images with identical dimensions and rooms remain selected", async () => {
  const a = await png("red"), b = await png("blue");
  const first = await fingerprint(a), second = await fingerprint(b);
  assert.notEqual(first, second);
  const result = select([{ ...candidate(1), contentFingerprint: first }, { ...candidate(2), contentFingerprint: second }]);
  assert.equal(result.selectedImageIds.length, 2);
  assert.equal(result.requiresReview, false);
});

async function runRoute(analyses, options = {}) {
  const files = options.files ?? [await png("red"), await png("blue")];
  const records = new Map(files.map((bytes, index) => ["image-" + (index + 1), {
    id: "image-" + (index + 1), listingId: "draft", url: "https://mock.invalid/" + index,
    storageKey: "autopilot/draft/" + index, fileName: index + ".png", position: index,
    bytes, analysisStatus: "analyzed", isPrimary: index === 0, analysis: "STALE_ANALYSIS",
  }]));
  const calls = { generated: [], listingSaved: [], publication: 0, fetch: 0 };
  const listing = { id: "draft", projectName: "Autopilot-Entwurf", market: "DE", countryCode: "DE", location: "Berlin", postalCode: "", propertyType: "Wohnung", rooms: null, livingArea: null, price: null };
  const imageDb = {
    findUnique: async ({ where }) => [...records.values()].find(image => image.storageKey === where.storageKey) ?? null,
    findMany: async ({ where }) => [...records.values()].filter(image => !where.storageKey?.startsWith || image.storageKey.startsWith(where.storageKey.startsWith)),
    update: async ({ where, data }) => { const record = records.get(where.id); Object.assign(record, data); return record; },
    updateMany: async ({ where, data }) => { for (const record of records.values()) if (!where.id || where.id.in.includes(record.id)) Object.assign(record, data); return { count: records.size }; },
  };
  const prisma = {
    listing: { findFirst: async () => listing, update: async ({ data }) => { calls.listingSaved.push(data); return { ...listing, ...data }; } },
    listingImage: imageDb,
    $transaction: async callback => {
      const before = [...records.entries()].map(([id, record]) => [id, { ...record }]);
      try { const result = await callback({ listingImage: imageDb }); if (options.transactionError) throw Error("TRANSACTION_FAILED"); return result; }
      catch (error) { records.clear(); before.forEach(([id, record]) => records.set(id, record)); throw error; }
    },
  };
  const mocks = {
    "@/lib/premium-quality.server": { assertListingPremiumQualityReady: async () => {}, checkAndRecordPremiumQuality: async input => ({ ready: true, status: "READY", reasons: [], assessmentId: "mock-quality" }) },
    "openai": { __esModule: true, default: class MockOpenAI {} },
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) }, after() {} },
    "@/lib/session": { getAuthenticatedUser: async () => ({ id: "user" }) },
    "@/lib/prisma": { prisma },
    "@/lib/premium-quality-store.server": { savePremiumAssessment: async () => ({id:"source-proof"}) },
    "@/lib/storage/storage.server": {
      headObject: async pathname => ({ pathname, contentType: "image/png", size: 100, url: "https://mock.invalid/image" }),
      createStorageReadUrl: async () => "https://mock.invalid/image",
      getObjectBytes: async key => [...records.values()].find(image => image.storageKey === key).bytes,
    },
    "@/lib/pdf-document-facts.server": {},
    "@/lib/pdf-extract-images.server": {},
    "@/lib/listing-text-engine.server": { generateListingTextVariants: async input => { calls.generated.push(input); return { variants: [1, 2, 3].map(n => ({ title: "Variante " + n, text: "Mocktext " + n })) }; } },
    "@/app/api/location-assistant/route": {}, "@/lib/listing-location": {}, "@/lib/valuation-market-provider": {},
    "@/lib/portal-integrations/autopilot-publication.server": { prepareAutopilotPublicationForUser: async () => { calls.publication++; return null; } },
    "@/lib/publication-orchestrator/publication-run-preparation.server": {},
    "@/lib/publication-orchestrator/publication-autopilot.server": {},
    "@/lib/broker-workflow/marketing-approval-guard.server": {},
  };
  const fetchMock = async (_url, request) => {
    calls.fetch++;
    const body = JSON.parse(request.body);
    const vision = body.text.format.name === "inserat_ai_autopilot_vision";
    if (vision) {
      assert(body.max_output_tokens >= files.length * 500);
      assert(body.text.format.schema.properties.imageAnalyses.items.required.includes("sharpnessScore"));
      if (options.visionError) return { ok: false, status: 503, headers: { get() { return null; } }, text: async () => "{}" };
    }
    // Echo requested identities in this model mock; keep each test's invalid
    // count/index/score data intact so existing blocking assertions still apply.
    const requestedIds = vision ? body.text.format.schema.properties.imageAnalyses.items.properties.imageId.enum : [];
    const value = vision ? { imageAnalyses: analyses.map(item => item ? ({ ...item, imageId: requestedIds[item.imageIndex - 1] }) : item) } : { location: "Berlin", propertyType: "Wohnung", rooms: 3, livingArea: 120, price: 450000, currency: "EUR" };
    return { ok: true, text: async () => JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] }) };
  };
  const { POST } = loader(mocks, { fetch: fetchMock })("app/api/autopilot/run/route.ts");
  const uploads = [...records.values()].slice(0, options.uploadCount ?? files.length).map(image => ({ pathname: image.storageKey, fileName: image.fileName }));
  const response = await POST({ json: async () => ({ listingId: "draft", uploads }) });
  return { response, calls, records: [...records.values()] };
}
test("actual POST accepts complete unique analyses and saves safe evidence", async () => {
  const { response, calls, records } = await runRoute([analysis(2, { category: "kitchen", room: "kitchen", category: "kitchen", titleScore: 80 }), analysis(1)]);
  assert.equal(response.status, 200, JSON.stringify(response));
  assert.equal(response.body.autopilot.stage, "needs_confirmation");
  assert.equal(calls.generated.length, 1);
  assert.equal(calls.publication, 1);
  assert(records.every(image => image.analysisStatus === "analyzed"));
  assert.equal(records.filter(image => image.isPrimary).length, 1);
  const stored = JSON.parse(records[0].analysis);
  assert.equal(stored.roomConfidence, .95);
  assert.deepEqual(stored.visibleFacts, ["Fenster"]);
  assert.equal(stored.visibleFacts.includes("UNVERIFIED_DETAIL"), false);
});
for (const [name, values] of [
  ["missing", [analysis(1)]],
  ["duplicate", [analysis(1), analysis(1)]],
  ["invalid index", [analysis(1), analysis(3)]],
  ["missing suitability", [analysis(1), analysis(2, { suitable: undefined })]],
]) test("actual POST rejects " + name + " without analyzed flags or release", async () => {
  const { response, calls, records } = await runRoute(values);
  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(calls.generated.length, 0);
  assert.equal(calls.publication, 0);
  assert(records.every(image => image.analysisStatus === "not_analyzed" && !image.analyzedAt && !image.isPrimary));
});
for (const [name, extra] of [["unsuitable", { suitable: false }], ["uncertain room", { roomConfidence: .2 }], ["uncertain suitability", { suitabilityConfidence: .5 }], ["blurred", { sharpnessScore: 20 }]]) {
  test("actual POST routes " + name + " to explained review without publishing", async () => {
    const { response, calls, records } = await runRoute([analysis(1), analysis(2, extra)]);
    assert.equal(response.status, 422);
    assert.equal(response.body.code, "AUTOPILOT_IMAGE_REVIEW_REQUIRED");
    assert.deepEqual(plain(response.body.imageSelection.selectedImageIds), ["image-1"]);
    assert(response.body.error.includes("1.png"));
    assert.equal(calls.generated.length, 0);
    assert.equal(calls.listingSaved.length, 1);
    assert.equal(calls.listingSaved[0].generatedVariants, undefined);
    assert(response.body.reviewUrl.endsWith("/edit?review=images"));
    assert.equal(calls.publication, 0);
    assert.equal(records.length, 2);
    assert.equal(JSON.parse(records[1].analysis).selected, false);
    assert.equal(records[1].isPrimary, false);
  });
}
test("actual POST detects duplicates across original uploads and retains both originals", async () => {
  const original = await png("red");
  const snapshot = Buffer.from(original);
  const { response, records, calls } = await runRoute([analysis(1), analysis(2)], { files: [original, original] });
  assert.equal(response.status, 422);
  assert.equal(response.body.imageSelection.images[1].duplicateOf, "image-1");
  assert.equal(calls.publication, 0);
  assert.equal(records.length, 2);
  assert.deepEqual(original, snapshot);
});
test("stored images from previous attempts cannot bypass analysis", async () => {
  const { response, records, calls } = await runRoute([analysis(1)], { uploadCount: 1 });
  assert.equal(response.status, 500);
  assert.equal(calls.publication, 0);
  assert(records.every(image => image.analysisStatus === "not_analyzed"));
});
test("vision failure never marks originals analyzed", async () => {
  const { response, records } = await runRoute([], { visionError: true });
  assert.equal(response.status, 500);
  assert(records.every(image => image.analysisStatus === "not_analyzed"));
});
test("atomic persistence failure cannot release a partial gallery", async () => {
  const { response, records, calls } = await runRoute([analysis(1), analysis(2)], { transactionError: true });
  assert.equal(response.status, 500);
  assert.equal(calls.publication, 0);
  assert(records.every(image => image.analysisStatus === "not_analyzed"));
});

test("PDF content deduplication preserves different equal-sized embedded images", async () => {
  const width = 600, height = 500;
  const raw = [Buffer.alloc(width * height * 3, 16), Buffer.alloc(width * height * 3, 32)];
  const images = raw.map(data => ({ width, height, data }));
  const pdfLoad = loader({
    "pdfjs-dist/legacy/build/pdf.worker.mjs": {},
    "pdfjs-dist/legacy/build/pdf.mjs": { OPS: { paintImageXObject: 1 }, getDocument: () => ({
      promise: Promise.resolve({ numPages: 1, getPage: async () => ({
        getOperatorList: async () => ({ fnArray: [1, 1, 1], argsArray: [["0"], ["1"], ["0"]] }),
        getTextContent: async () => ({items:[{str:"Dies ist eine maschinenlesbare Dokumentseite mit zwei separaten Immobilienfotos."}]}),
        getViewport: () => ({width:595,height:842}),
        objs: { get: id => images[Number(id)] }, cleanup() {},
      }) }), destroy: async () => {},
    }) },
  }, { setTimeout() {} });
  const { extractPdfImages } = pdfLoad("lib/pdf-extract-images.server.ts");
  const result = await extractPdfImages(Buffer.from("MOCK_PDF"));
  assert.equal(result.length, 2);
  assert.equal(result[0].buffer.length, result[1].buffer.length, "old size-based fingerprint would collide");
  assert.notEqual(await fingerprint(result[0].buffer), await fingerprint(result[1].buffer));
  assert(raw.every((bytes, index) => bytes.every(byte => byte === (index === 0 ? 16 : 32))));
});

// 5S: use structured synthetic analyses only, never claim real photo recognition.
test("room/category conflict blocks selection and text evidence, including raw selection bypass", () => {
  const raw = analysis(1, { room: "Wohnzimmer", category: "bathroom" });
  const normalized = validate([raw], 1)[0];
  assert.equal(normalized.room, null);
  assert.equal(normalized.roomCategoryIssue, "ROOM_CATEGORY_CONFLICT");
  assert.equal(prompt([raw]), "");
  assert.equal(prompt([normalized]), "");
  for (const a of [raw, normalized]) {
    const result = select([{ ...candidate(1), analysis: a }]);
    assert.equal(result.primaryImageId, null);
    assert.equal(result.selectedImageIds.length, 0);
    assert(result.requiresReview);
    assert(result.entries[0].reasons.includes("ROOM_CATEGORY_CONFLICT"));
    assert(describe(result).includes("widersprechen"));
  }
});
for (const [room, category] of [["Wohnzimmer","living"],["Küche","kitchen"],["Badezimmer","bathroom"],["Schlafzimmer","bedroom"],["garden","outdoor"],["exterior","exterior"]]) {
  test("consistent room/category stays eligible: " + room, () => {
    const result = select([candidate(1, { room, category })]);
    assert.equal(result.requiresReview, false);
    assert.equal(result.primaryImageId, "image-1");
  });
}
for (const category of ["other", null, "unknown"]) {
  test("explicitly uncertain category cannot authorize text facts: " + category, () => {
    assert.equal(prompt([analysis(1, { category })]), "");
  });
}
