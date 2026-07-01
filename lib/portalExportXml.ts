export type PortalExportData = {
  ort: string;
  objektart: string;
  zimmer: string | number;
  wohnflaeche: string | number;
  preis: string | number;
  titel: string;
  beschreibung: string;
  highlights: string[] | string;
};

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeHighlights(highlights: string[] | string): string[] {
  if (Array.isArray(highlights)) {
    return highlights
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(highlights ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createSafeFileName(ort: string, titel: string): string {
  const rawName = `${ort}-${titel}`.toLowerCase();

  return rawName
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("é", "e")
    .replaceAll("è", "e")
    .replaceAll("à", "a")
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
}

export function buildPortalExportXml(data: PortalExportData): string {
  const highlights = normalizeHighlights(data.highlights);

  const highlightsXml = highlights
    .map((highlight) => `      <highlight>${escapeXml(highlight)}</highlight>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<portalExport version="beta" source="Inserat-AI">
  <property>
    <location>
      <city>${escapeXml(data.ort)}</city>
    </location>

    <details>
      <propertyType>${escapeXml(data.objektart)}</propertyType>
      <rooms>${escapeXml(data.zimmer)}</rooms>
      <livingArea>${escapeXml(data.wohnflaeche)}</livingArea>
      <price>${escapeXml(data.preis)}</price>
    </details>

    <marketing>
      <title>${escapeXml(data.titel)}</title>
      <description>${escapeXml(data.beschreibung)}</description>
      <highlights>
${highlightsXml}
      </highlights>
    </marketing>
  </property>
</portalExport>`;
}

export function downloadPortalExportXml(data: PortalExportData): void {
  const xml = buildPortalExportXml(data);

  const blob = new Blob([xml], {
    type: "application/xml;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const fileNameBase =
    createSafeFileName(data.ort, data.titel) || "inserat-ai-export";

  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileNameBase}-portal-export.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}