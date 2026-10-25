/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loader(mocks, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const requireLocal = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      // The assessment store imports the same Prisma singleton relatively.
      if (id.startsWith(".") && path.resolve(path.dirname(file), id + ".ts") === path.resolve("lib/prisma.ts") && mocks["@/lib/prisma"]) return mocks["@/lib/prisma"];
      if (id === "node:crypto") return require("node:crypto");
      if (id === "node:path") return require(id);
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
      process: { cwd: () => process.cwd(), env: { OPENAI_API_KEY: "MOCK_ONLY" } }, ...globals,
    }, { filename: file });
    return mod.exports;
  }
  return load;
}
const { collectExposeCoreSourceFacts: collect } = loader({})("lib/expose-core-fact-conflicts.ts");
const valid = { rooms: 3, livingArea: 120, price: 450000, currency: "EUR" };
const document = "Zimmer: 3\nWohnfläche: 120 m²\nKaufpreis: EUR 450000";
const plain = x => JSON.parse(JSON.stringify(x));

async function runRoute(documents, ai = valid, options = {}) {
  const calls = { generated: [], saved: [], publication: 0, preparations: 0, pdfReads: [], assessments: [] };
  const listing = { id: "draft", projectName: "Autopilot-Entwurf", market: "DE", countryCode: "DE", location: "Berlin", postalCode: "", propertyType: "Wohnung", rooms: null, livingArea: null, price: null, ...options.listing };
  const mocks = {
    "@/lib/premium-quality.server": { assertListingPremiumQualityReady: async () => {}, checkAndRecordPremiumQuality: async () => ({ ready: !options.finalGateDenied, status: options.finalGateDenied ? "REVIEW_REQUIRED" : "READY", reasons: [], assessmentId: "mock-quality" }) },
    "@/lib/image-content-fingerprint.server": { fingerprintImageContent: async () => { throw Error("UNEXPECTED_IMAGE_FINGERPRINT"); } },
    "openai": { __esModule: true, default: class MockOpenAI {} },
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) }, after() {} },
    "@/lib/session": { getAuthenticatedUser: async () => ({ id: "user" }) },
    "@/lib/prisma": { prisma: {
      premiumQualityAssessment: { create: async ({ data }) => { const record = { ...data, id: "assessment-" + calls.assessments.length }; calls.assessments.push(record); return record; } },
      listing: { findFirst: async () => listing, update: async ({ data }) => { calls.saved.push(data); return { ...listing, ...data }; } },
      listingImage: { findMany: async () => [], create: async () => { throw Error("UNEXPECTED_IMAGE_WRITE"); } },
    } },
    "@/lib/storage/storage.server": {
      headObject: async pathname => ({ pathname, contentType: "application/pdf", size: 100, url: "https://mock.invalid/pdf" }),
      createStorageReadUrl: async () => "https://mock.invalid/pdf",
      getObjectBytes: async pathname => { const index = Number(pathname.split("/").at(-1)); calls.pdfReads.push(index); if (options.readError) throw Error("PDF_READ_FAILED"); return Buffer.from(documents[index]); },
    },
    "@/lib/pdf-document-facts.server": { extractPdfDocumentFacts: async bytes => ({ documentText: bytes.toString(), ...(options.reviewPdf ? {documentAnalysis:{requiresReview:true}} : {}) }), pdfDocumentReviewError: analysis => Object.assign(new Error("PDF review"),{code:"PDF_DOCUMENT_REVIEW_REQUIRED",documentAnalysis:analysis}) },
    "@/lib/pdf-extract-images.server": { extractPdfImages: async () => { if (options.imageError) throw Error("IMAGE_FAILED"); return []; } },
    "@/lib/image-expose-consistency": { ROOM_INDEPENDENT_VISIBLE_FACTS: [], buildSafeImageRoomPrompt: () => "", getSafeImageRoomEvidence: x => x },
    "@/lib/listing-text-engine.server": { generateListingTextVariants: async input => { calls.generated.push(input); return { variants: [1, 2, 3].map(n => ({ title: "Variante " + n, text: "Mocktext " + n })) }; } },
    "@/app/api/location-assistant/route": {},
    "@/lib/listing-location": {},
    "@/lib/valuation-market-provider": {},
    "@/lib/portal-integrations/autopilot-publication.server": { prepareAutopilotPublicationForUser: async () => { calls.preparations++; return null; } },
    "@/lib/publication-orchestrator/publication-run-preparation.server": { createPreparedPublicationRun: async () => { calls.publication++; throw Error("UNEXPECTED_PUBLICATION_RUN"); } },
    "@/lib/publication-orchestrator/publication-autopilot.server": { runPublicationAutopilotAfterApproval: async () => { calls.publication++; throw Error("UNEXPECTED_PUBLICATION_DISPATCH"); } },
    "@/lib/broker-workflow/marketing-approval-guard.server": {},
  };
  const fetchMock = async (_url, request) => {
    const schema = JSON.parse(request.body).text.format.schema;
    assert(schema.required.includes("currency"));
    assert.deepEqual(plain(schema.properties.currency.enum), ["", "EUR", "CHF"]);
    return { ok: true, text: async () => JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ location: "Berlin", propertyType: "Wohnung", ...ai }) }] }] }) };
  };
  const { POST } = loader(mocks, { fetch: fetchMock })("app/api/autopilot/run/route.ts");
  const response = await POST({ json: async () => ({ listingId: "draft", uploads: documents.map((_, i) => ({ pathname: "autopilot/draft/" + i, fileName: i + ".pdf" })) }) });
  return { response, calls };
}

for (const [name, docs, ai, options] of [
  ["PDF 3 rooms versus positive AI 4", [document], { ...valid, rooms: 4 }],
  ["different living areas in one document", [document + "\nWohnfläche: 145 m²"], valid],
  ["different purchase prices", [document + "\nKaufpreis: EUR 480000"], valid],
  ["EUR versus CHF", [document + "\nKaufpreis: CHF 450000"], valid],
  ["PDF EUR versus AI CHF", [document], { ...valid, currency: "CHF" }],
  ["different documents", [document, "Zimmer: 4"], valid],
  ["positive AI cannot hide area disagreement", [document], { ...valid, livingArea: 145 }],
  ["positive AI cannot hide price disagreement", [document], { ...valid, price: 480000 }],
  ["stored draft versus document", [document], valid, { listing: { rooms: 4 } }],
  ["foreign section does not hide next document", ["Vergleichsobjekt: B\nZimmer: 8", document, "Zimmer: 4"], valid],
]) test(name + " blocks the actual POST before generation and READY", async () => {
  const { response, calls } = await runRoute(docs, ai, options);
  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, "EXPOSE_FACT_CONFLICT_REVIEW_REQUIRED");
  assert.equal(calls.generated.length, 0);
  assert.equal(calls.saved.length, 0);
  assert.equal(calls.publication, 0);
  assert.equal(calls.pdfReads.length, docs.length);
});

test("matching document and AI values require explicit broker confirmation, never automatic READY", async () => {
  const { response, calls } = await runRoute([document]);
  assert.equal(response.status, 200, JSON.stringify(response));
  assert.equal(response.body.success, true);
  assert.equal(response.body.autopilot.stage, "needs_confirmation");
  assert.equal(calls.generated.length, 1);
  assert.equal(calls.saved[0].rooms, 3);
  assert.equal(calls.publication, 0);
  assert.equal(calls.preparations, 1, "Read-only target preparation is not publication");
  assert(calls.assessments.some(record => record.kind === "broker_vision"));
});
test("missing AI values use available document facts without defaults", async () => {
  const { response, calls } = await runRoute([document], { rooms: null, livingArea: null, price: null, currency: "" });
  assert.equal(response.status, 200, JSON.stringify(response));
  assert.equal(calls.generated[0].rooms, "3");
  assert.equal(calls.generated[0].livingArea, "120");
  assert.equal(calls.generated[0].price, "450000");
});
test("missing facts remain absent and do not become READY", async () => {
  const { response, calls } = await runRoute(["Objektunterlagen ohne Kernangaben"], { rooms: null, livingArea: null, price: null, currency: "" }, { finalGateDenied: true });
  assert.equal(response.status, 422);
  assert.equal(response.body.premiumQuality.ready, false);
  assert.equal(calls.saved.length, 0);
  assert.equal(calls.generated[0].livingArea, undefined);
  assert.equal(calls.generated[0].price, undefined);
});
test("an image extraction failure cannot suppress conflicting document facts", async () => {
  const { response, calls } = await runRoute([document], { ...valid, rooms: 4 }, { imageError: true });
  assert.equal(response.body.error, "EXPOSE_FACT_CONFLICT_REVIEW_REQUIRED");
  assert.equal(calls.generated.length, 0);
});
test("document read failure uses existing safe error path", async () => {
  const { response, calls } = await runRoute([document], valid, { readError: true });
  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(calls.generated.length, 0);
});
test("numeric formatting and unknown currency do not fabricate conflicts", () => {
  const result = collect(["Zimmer: 3,5\nWohnfläche: 120,00\nKaufpreis: 450.000 €"], [{ ...valid, rooms: 3.5, currency: "" }]);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(plain(result.values), { rooms: "3.5", livingArea: "120", price: "450000" });
});

function pdfFixture(pages, failingPage) {
  const state = { read: [], cleaned: [], destroyed: 0 };
  const load = loader({
    "@napi-rs/canvas": {},
    "./pdf-local-ocr.server": {},
    "./pdf-local-detail.server": {},
    "pdfjs-dist/legacy/build/pdf.worker.mjs": {},
    "pdfjs-dist/legacy/build/pdf.mjs": { OPS:{paintImageXObject:1,paintInlineImageXObject:2,paintImageMaskXObject:3,save:4,restore:5,transform:6}, getDocument: parameters => (assert.deepEqual([...fs.readFileSync(parameters.wasmUrl + "jbig2.wasm").subarray(0,4)], [0,97,115,109]), {
      promise: Promise.resolve({ numPages: pages.length, getPage: async n => ({
        getTextContent: async () => { state.read.push(n); if (n === failingPage) throw Error("PAGE_FAILED"); return { items: pages[n - 1].split("\n").map(str => ({ str, hasEOL: true, transform:[1,0,0,1,0,0],width:30,height:10 })) }; },
        getViewport: () => ({width:595,height:842,convertToViewportPoint:(x,y)=>[x,y]}),
        getOperatorList: async () => ({fnArray:pages[n-1] ? [] : [1],argsArray:[]}),
        cleanup: () => { state.cleaned.push(n); },
      }) }),
      destroy: async () => { state.destroyed++; },
    }) },
  });
  return { state, extract: load("lib/pdf-document-facts.server.ts").extractPdfDocumentFacts };
}
test("PDF extractor reads all pages and retains late conflicts", async () => {
  const { state, extract } = pdfFixture([document, "Weitere Angaben", "Zimmer: 4\nWohnfläche: 145 m²"]);
  const result = await extract(Buffer.from("MOCK_PDF"));
  assert.deepEqual(state.read, [1, 2, 3]);
  assert.deepEqual(state.cleaned, [1, 2, 3]);
  assert.equal(state.destroyed, 1);
  assert.equal(result.rooms, null);
  assert.equal(collect([result.documentText], []).conflicts.length, 2);
});
test("PDF failure is propagated and resources are cleaned", async () => {
  const { state, extract } = pdfFixture([document, "late page"], 2);
  await assert.rejects(extract(Buffer.from("MOCK_PDF")), /PAGE_FAILED/);
  assert.deepEqual(state.cleaned, [1, 2]);
  assert.equal(state.destroyed, 1);
});
test("image-only PDFs are not silently treated as conflict-checked", async () => {
  const { extract } = pdfFixture([""]);
  const result = await extract(Buffer.from("MOCK_PDF"));
  assert.equal(result.documentAnalysis.requiresReview,true);
  assert.equal(result.documentAnalysis.type,"image_based");
  assert(result.documentAnalysis.issues.includes("PDF_LOCAL_OCR_UNAVAILABLE"));
  assert.equal(result.rooms,null);
});

test("unverified PDF analysis stops actual POST before generation, storage and READY", async()=>{const {response,calls}=await runRoute([document],valid,{reviewPdf:true});assert.equal(response.status,422);assert.equal(response.body.success,false);assert.equal(response.body.code,"PDF_DOCUMENT_REVIEW_REQUIRED");assert.equal(calls.generated.length,0);assert.equal(calls.saved.length,0);assert.equal(calls.publication,0);});
