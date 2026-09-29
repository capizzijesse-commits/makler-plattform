"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import WorkspaceFrame from "../components/WorkspaceFrame";
import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

type Variant = {
  title: string;
  text: string;
};

type MockData = {
  projectName: string;
  countryCode: "CH" | "DE";
  street: string;
  postalCode: string;
  location: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  highlights: string;
  styleText: string;
};

function mockDataForMarket(market: InseratAiMarket): MockData {
  if (market === "DE") {
    return {
      projectName: "E2E Automation Test Berlin",
      countryCode: "DE",
      street: "Musterstrasse 12",
      postalCode: "10115",
      location: "Berlin",
      propertyType: "Wohnung",
      rooms: "3,5",
      livingArea: "92",
      price: "895000",
      highlights: "Balkon, Aufzug, Tiefgaragenstellplatz",
      styleText: "sachlich, hochwertig",
    };
  }

  return {
    projectName: "E2E Automation Test Oberlunkhofen",
    countryCode: "CH",
    street: "Musterstrasse 12",
    postalCode: "8917",
    location: "Oberlunkhofen",
    propertyType: "Wohnung",
    rooms: "3.5",
    livingArea: "92",
    price: "1250000",
    highlights: "Balkon, Lift, Einstellhallenplatz",
    styleText: "sachlich, hochwertig",
  };
}

function mockVariants(data: MockData): Variant[] {
  const isDE = data.countryCode === "DE";
  const price = isDE ? "895.000 €" : "CHF 1'250'000";
  const roomLabel = isDE ? "3,5-Zimmer-Wohnung" : "3½-Zimmer-Wohnung";
  const lift = isDE ? "Aufzug" : "Lift";
  const parking = isDE ? "Tiefgaragenstellplatz" : "Einstellhallenplatz";

  return [
    {
      title: `[TESTMODUS] ${roomLabel} mit Balkon in ${data.location}`,
      text: `${roomLabel} mit rund ${data.livingArea} m² Wohnfläche in ${data.location}. Für diesen technischen Preview-Test sind als bestätigte Testmerkmale ein Balkon, ein ${lift} und ein ${parking} hinterlegt. Der verwendete Testpreis beträgt ${price}. Die Angaben dienen ausschliesslich dazu, den vollständigen Inserat-AI-Ablauf realitätsnah zu prüfen.\n\nDie simulierten Eckdaten zeigen, wie Inserat-AI später aus Exposé, Objektfotos und vorhandenen Objektdaten eine vollständige Beschreibung aufbaut. Zimmerzahl, Wohnfläche, Preis und Ausstattungsmerkmale werden dabei zu einem strukturierten Immobilieninserat zusammengeführt. Nicht belegte Eigenschaften sollen im echten Ablauf bewusst nicht ergänzt oder erfunden werden.\n\nDer Balkon wird als separates Ausstattungsmerkmal geführt. Der ${lift} und der ${parking} ergänzen die hinterlegten Testdaten. Weitere Aussagen zu Zustand, Aussicht, Umgebung, Distanzen, Renovationen oder rechtlichen Verhältnissen werden in diesem Test nicht hinzugefügt, weil dafür keine bestätigten Ausgangsdaten vorliegen.\n\nDieser Text wurde nicht aus deinem hochgeladenen PDF erzeugt. Er simuliert lediglich die gewünschte Detailtiefe. Im echten Automationslauf soll Inserat-AI dieselbe Struktur mit den tatsächlich erkannten Informationen aus den Originalunterlagen erstellen und das Ergebnis anschliessend zur kurzen Kontrolle und Veröffentlichung bereitstellen.`,
    },
    {
      title: `[TESTMODUS] ${data.livingArea} m² Wohnfläche und klare Objektdaten`,
      text: `Im Mittelpunkt dieses Testinserats steht eine ${roomLabel} in ${data.location} mit einer hinterlegten Wohnfläche von rund ${data.livingArea} m². Der technische Testdatensatz enthält zusätzlich einen Balkon, einen ${lift} und einen ${parking}. Für die Simulation ist ein Preis von ${price} gespeichert.\n\nDie zweite Variante zeigt bewusst eine andere redaktionelle Struktur. Statt mit der Ausstattung zu beginnen, werden zuerst die wichtigsten Objektkennzahlen zusammengeführt. Danach folgen die vorhandenen Zusatzmerkmale. Genau so soll Inserat-AI später aus unterschiedlichen Quellen eine konsistente Beschreibung erstellen, ohne dass der Makler jedes Feld einzeln übertragen muss.\n\nDie Automation soll künftig Informationen aus dem Exposé übernehmen, sichtbare Merkmale der Objektfotos ergänzen und nur dort eine Rückfrage anzeigen, wo Angaben fehlen oder unsicher sind. So bleibt die Kontrolle beim Makler, während der grösste Teil der Datenerfassung und Texterstellung automatisch abläuft.\n\nAuch dieser Text enthält ausschliesslich synthetische Testinformationen. Er dient dazu, Darstellung, Variantenwahl, Speicherung, Cockpit-Übergabe und den anschliessenden Veröffentlichungsprozess zu testen. Erst im echten KI-Lauf werden die tatsächlichen Angaben der Immobilie verarbeitet.`,
    },
    {
      title: `[TESTMODUS] Balkon, ${lift} und ${parking} in ${data.location}`,
      text: `Balkon, ${lift} und ${parking} bilden in dieser dritten Testvariante den Einstieg in die Beschreibung. Ergänzt werden diese synthetischen Merkmale durch ${data.rooms} Zimmer, rund ${data.livingArea} m² Wohnfläche und den hinterlegten Testpreis von ${price}. Das Testobjekt befindet sich für diesen E2E-Ablauf in ${data.location}.\n\nDiese Variante simuliert den späteren feature-orientierten Textaufbau von Inserat-AI. Ein Makler soll dadurch mehrere wirklich unterschiedliche Inserattexte erhalten, ohne dreimal dieselben Informationen in leicht veränderter Reihenfolge zu sehen. Die Faktenbasis bleibt jedoch bei allen Varianten identisch und nachvollziehbar.\n\nIm echten Ablauf werden zusätzliche Details nur dann verwendet, wenn sie im Exposé, in den vorhandenen Objektdaten oder durch die Bildanalyse tatsächlich belegt sind. Dazu können beispielsweise konkrete Flächen, Ausstattungen oder eindeutig sichtbare bauliche Merkmale gehören. Unbelegte Aussagen zu Lagequalität, Aussicht, Infrastruktur oder Zielgruppen sollen nicht automatisch ergänzt werden.\n\nDer vorliegende Text ist daher bewusst als TESTMODUS gekennzeichnet. Sein Zweck ist, die gewünschte Länge und Informationsdichte sowie den kompletten Weg von der Kontrolle über das Speichern bis zum Cockpit und zur Veröffentlichung zu prüfen.`,
    },
  ];
}

export default function PreviewAutomationClientV2() {
  const router = useRouter();
  const [market, setMarket] = useState<InseratAiMarket>("CH");
  const [stage, setStage] = useState<"review" | "ready">("review");
  const [data, setData] = useState<MockData>(() => mockDataForMarket("CH"));
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const detected = getInseratAiMarketFromHostname(window.location.hostname);
    const saved = localStorage.getItem("inseratAiMarket");
    const next = detected || (saved === "DE" ? "DE" : "CH");
    setMarket(next);
    setData(mockDataForMarket(next));
  }, []);

  const steps = useMemo(
    () => [
      ["1", "Hochladen", false],
      ["2", "Analysieren", false],
      ["3", "Prüfen", stage === "review"],
      ["4", "Veröffentlichen", stage === "ready"],
    ] as const,
    [stage]
  );

  function finishMockListing() {
    setVariants(mockVariants(data));
    setActiveVariant(0);
    setStage("ready");
    setError("");
  }

  async function saveAndOpenCockpit() {
    if (!variants.length || saving) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: data.projectName,
          market: data.countryCode,
          countryCode: data.countryCode,
          street: data.street,
          location: data.location,
          postalCode: data.postalCode,
          propertyType: data.propertyType,
          rooms: data.rooms,
          livingArea: data.livingArea,
          price: data.price,
          highlights: data.highlights,
          style: data.styleText,
          generatedVariants: variants,
          imageAnalysis: "PREVIEW TESTMODE: keine echte Bildanalyse ausgeführt.",
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const listingId = typeof payload?.listing?.id === "string" ? payload.listing.id : "";

      if (!response.ok || !listingId) {
        throw new Error(payload?.error || "Das Testobjekt konnte nicht gespeichert werden.");
      }

      router.push(`/cockpit/${encodeURIComponent(listingId)}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Das Testobjekt konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceFrame market={market} active="new" title="Automation Testmodus">
      <main className="page">
        <div className="shell">
          <header className="hero">
            <div className="eyebrow">PREVIEW-TESTMODUS · KEINE KI-KOSTEN</div>
            <h1>Automation bis zum Cockpit testen.</h1>
            <p>Der Preview-Modus verwendet synthetische Testdaten. Die Textlänge entspricht jetzt deutlich stärker einem vollständigen Makler-Inserat.</p>
            <div className="steps">
              {steps.map(([number, label, active]) => (
                <div key={number} className={`step ${active ? "active" : "done"}`}>
                  <span>{number}</span><strong>{label}</strong>
                </div>
              ))}
            </div>
          </header>

          <section className="card">
            <div className="notice">
              <strong>Testdaten – nicht aus deinem PDF ausgelesen.</strong>
              <span>Wir testen Detailtiefe, Kontrolle, Speichern, Cockpit und Veröffentlichung.</span>
            </div>

            <div className="grid">
              <Field label="Objektname" value={data.projectName} onChange={(value) => setData({ ...data, projectName: value })} />
              <Field label="Objektart" value={data.propertyType} onChange={(value) => setData({ ...data, propertyType: value })} />
              <Field label="Ort" value={data.location} onChange={(value) => setData({ ...data, location: value })} />
              <Field label="PLZ" value={data.postalCode} onChange={(value) => setData({ ...data, postalCode: value })} />
              <Field label="Zimmer" value={data.rooms} onChange={(value) => setData({ ...data, rooms: value })} />
              <Field label="Wohnfläche" value={data.livingArea} onChange={(value) => setData({ ...data, livingArea: value })} />
              <Field label="Preis" value={data.price} onChange={(value) => setData({ ...data, price: value })} />
              <Field label="Highlights" value={data.highlights} onChange={(value) => setData({ ...data, highlights: value })} wide />
            </div>

            {stage === "review" && (
              <button className="primary" onClick={finishMockListing}>Test-Inserat ausführlich fertigstellen <span>→</span></button>
            )}

            {error && <div className="error">{error}</div>}

            {stage === "ready" && variants.length > 0 && (
              <div className="result">
                <div className="resultTop">
                  <div><div className="eyebrow">TEST-INSERAT FERTIG</div><h2>{variants[activeVariant]?.title}</h2></div>
                  <div className="tabs">
                    {variants.map((_, index) => (
                      <button key={index} className={activeVariant === index ? "active" : ""} onClick={() => setActiveVariant(index)}>{index + 1}</button>
                    ))}
                  </div>
                </div>

                <p className="listingText">{variants[activeVariant]?.text}</p>

                <div className="actions">
                  <button className="secondary" onClick={() => setStage("review")}>Angaben bearbeiten</button>
                  <button className="publish" disabled={saving} onClick={saveAndOpenCockpit}>
                    {saving ? "Wird gespeichert …" : "Weiter zur Veröffentlichung"}{!saving && <span>→</span>}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <style jsx>{`
          .page{min-height:calc(100vh - 80px);padding:22px;color:#fff;background:radial-gradient(circle at 88% 12%,rgba(245,158,11,.14),transparent 28%),linear-gradient(135deg,#06172c 0%,#0a2342 58%,#102744 100%)}
          .shell{max-width:1180px;margin:0 auto}.hero,.card{border:1px solid rgba(148,163,184,.18);background:rgba(8,29,55,.76);border-radius:24px;box-shadow:0 24px 70px rgba(2,6,23,.26)}.hero{padding:34px}.card{margin-top:16px;padding:24px}.eyebrow{color:#fbbf24;font-size:11px;letter-spacing:.14em;font-weight:950}h1{margin:8px 0 10px;font-size:clamp(34px,5vw,58px);line-height:1.02}h2{margin:5px 0 0;font-size:22px}.hero p{max-width:820px;color:#cbd5e1;line-height:1.6}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:24px}.step{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.045);color:#94a3b8;border:1px solid rgba(255,255,255,.06)}.step span{display:grid;place-items:center;width:25px;height:25px;border-radius:999px;background:rgba(255,255,255,.08);font-size:11px}.step.active{color:#fff;border-color:rgba(251,191,36,.45);background:rgba(245,158,11,.12)}.step.active span{background:#f59e0b}.step.done{opacity:.72}.notice{display:grid;gap:4px;padding:14px 16px;border-radius:14px;border:1px solid rgba(251,191,36,.28);background:rgba(245,158,11,.08);color:#fde68a}.notice span{color:#cbd5e1;font-size:13px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:18px}.primary,.publish{width:100%;min-height:54px;margin-top:18px;border:0;border-radius:15px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;font-weight:950;font-size:15px;cursor:pointer}.result{margin-top:20px;padding:22px;border-radius:20px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09)}.resultTop{display:flex;justify-content:space-between;gap:16px}.tabs{display:flex;gap:6px}.tabs button{width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#cbd5e1;font-weight:900}.tabs button.active{background:#f59e0b;color:#fff}.listingText{margin:20px 0 0;padding:22px;border-radius:16px;background:#fff;color:#334155;line-height:1.78;white-space:pre-line;font-size:15px}.actions{display:grid;grid-template-columns:auto 1fr;gap:10px;margin-top:14px}.actions .publish{margin:0}.secondary{min-height:54px;padding:0 18px;border-radius:15px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.055);color:#e2e8f0;font-weight:850}.error{margin-top:14px;padding:12px;border-radius:12px;background:rgba(127,29,29,.2);color:#fecaca}@media(max-width:760px){.page{padding:10px}.hero,.card{padding:18px;border-radius:18px}.grid,.actions{grid-template-columns:1fr}.steps{grid-template-columns:repeat(2,1fr)}.resultTop{flex-direction:column}}
        `}</style>
      </main>
    </WorkspaceFrame>
  );
}

function Field({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
      <style jsx>{`.field{display:grid;gap:7px}.wide{grid-column:1/-1}span{color:#94a3b8;font-size:11px;font-weight:850}input{width:100%;box-sizing:border-box;min-height:46px;padding:0 13px;border-radius:11px;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.5);color:#fff;outline:none}input:focus{border-color:rgba(251,191,36,.55);box-shadow:0 0 0 3px rgba(251,191,36,.08)}`}</style>
    </label>
  );
}
