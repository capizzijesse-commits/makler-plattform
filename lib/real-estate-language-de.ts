/**
 * Inserat-AI – deutsche Immobilien-Fachsprache.
 *
 * Eigene redaktionelle Eintraege, keine kopierten Inserattexte.
 * Ein Lexikoneintrag belegt niemals selbst eine Objekteigenschaft.
 * Diese Bibliothek ist noch nicht an die Generierung angebunden.
 */

export type RealEstateLanguageEntryDE = {
  id: string;
  category: string;
  term: string;
  meaning: string;
  requiredEvidence: string;
  editorialGuidance: string;
  prohibitedInference: string;
};

export const REAL_ESTATE_LANGUAGE_DE: readonly RealEstateLanguageEntryDE[] = [
  {
    id: "de-open-living",
    category: "Grundriss",
    term: "offener Wohn- und Essbereich",
    meaning: "Wohn- und Essbereich sind nachweislich offen miteinander verbunden.",
    requiredEvidence: "Explizite Grundriss- oder Dokumentangabe zur offenen Verbindung.",
    editorialGuidance: "Raumkonzept konkret beschreiben, ohne eine bestimmte Groesse zu unterstellen.",
    prohibitedInference: "Keine automatische Behauptung zu Helligkeit, Grosszuegigkeit oder Kuechenausstattung."
  },
  {
    id: "de-floor-windows",
    category: "Architektur",
    term: "bodentiefe Fenster",
    meaning: "Fenster reichen nachweislich bis in Bodennaehe.",
    requiredEvidence: "Eindeutige Objektangabe oder klar erkennbare permanente Bausubstanz.",
    editorialGuidance: "Fensterform sachlich in die architektonische Beschreibung einbauen.",
    prohibitedInference: "Keinen freien Ausblick, Sonneneinfall oder energetischen Standard ableiten."
  },
  {
    id: "de-balcony",
    category: "Aussenbereiche",
    term: "Balkon",
    meaning: "Ein zum Objekt gehoerender Balkon ist dokumentiert.",
    requiredEvidence: "Belegter Balkon und, falls genannt, dessen gesondert belegte Eigenschaften.",
    editorialGuidance: "Ausrichtung, Flaeche und Aussicht nur bei entsprechendem Nachweis nennen.",
    prohibitedInference: "Keine Suedlage, Ruhe, Aussicht oder besondere Nutzbarkeit erfinden."
  },
  {
    id: "de-terrace",
    category: "Aussenbereiche",
    term: "Terrasse",
    meaning: "Eine zum Objekt gehoerende Terrasse ist dokumentiert.",
    requiredEvidence: "Explizite Objektangabe; Lage und Zugang jeweils separat belegt.",
    editorialGuidance: "Beschaffenheit und Lage nur mit vorhandenen Angaben beschreiben.",
    prohibitedInference: "Keinen direkten Gartenzugang oder unverbaubaren Blick ableiten."
  },
  {
    id: "de-garden",
    category: "Aussenbereiche",
    term: "Garten",
    meaning: "Eine Gartenflaeche gehoert nachweislich zum Immobilienangebot.",
    requiredEvidence: "Dokumentierte Gartenflaeche oder eindeutig zugeordnete Aussenflaeche.",
    editorialGuidance: "Konkrete Gestaltung oder Flaechengroesse nur bei Nachweis verwenden.",
    prohibitedInference: "Keine uneingeschraenkte Alleinnutzung oder Pflegeleichtigkeit annehmen."
  },
  {
    id: "de-underfloor-heating",
    category: "Haustechnik",
    term: "Fussbodenheizung",
    meaning: "Waermeabgabe erfolgt ueber belegte Heizflaechen im Boden.",
    requiredEvidence: "Explizite Heizungsangabe.",
    editorialGuidance: "Technik praezise nennen; Raumzuordnung nur bei Nachweis.",
    prohibitedInference: "Keine automatische Effizienz-, Komfort- oder Einzelraumregelungszusage."
  },
  {
    id: "de-heat-pump",
    category: "Energie",
    term: "Waermepumpe",
    meaning: "Eine Waermepumpe ist als Teil der Heiztechnik dokumentiert.",
    requiredEvidence: "Eindeutige technische Objektangabe.",
    editorialGuidance: "Art und Einbaujahr nur nennen, wenn separat belegt.",
    prohibitedInference: "Keine Energieklasse, Kosteneinsparung oder CO2-Neutralitaet behaupten."
  },
  {
    id: "de-photovoltaics",
    category: "Energie",
    term: "Photovoltaikanlage",
    meaning: "Anlage zur solaren Stromerzeugung.",
    requiredEvidence: "Anlage dokumentiert; Leistung nur bei eindeutiger kWp-Angabe.",
    editorialGuidance: "Belegte Leistung sachlich und mit korrekter Einheit nennen.",
    prohibitedInference: "Keine Autarkie, Eigenverbrauchsquote oder Ersparnis ohne Belege."
  },
  {
    id: "de-garage",
    category: "Parken",
    term: "Garage",
    meaning: "Ein Garagenplatz oder Garagenraum ist dokumentiert.",
    requiredEvidence: "Explizite Angabe zu Garage und Zugehoerigkeit.",
    editorialGuidance: "Anzahl und Art der Stellplaetze exakt uebernehmen.",
    prohibitedInference: "Keine Preisinklusion, E-Lademoeglichkeit oder Zusatzflaeche annehmen."
  },
  {
    id: "de-underground-parking",
    category: "Parken",
    term: "Tiefgaragenstellplatz",
    meaning: "Stellplatz in einer Tiefgarage.",
    requiredEvidence: "Explizite Angabe zur Tiefgarage und zum Stellplatz.",
    editorialGuidance: "Eigentums- oder Mietverhaeltnis nur bei entsprechender Angabe nennen.",
    prohibitedInference: "Keine automatische Preisinklusion oder Elektrolademoeglichkeit."
  },
  {
    id: "de-roof-renovation",
    category: "Sanierung",
    term: "Dachsanierung",
    meaning: "Eine konkret dokumentierte Sanierung am Dach.",
    requiredEvidence: "Belegter Umfang und gegebenenfalls belegtes Jahr.",
    editorialGuidance: "Sanierungsmassnahme genau nach Dokumentumfang beschreiben.",
    prohibitedInference: "Keine Kernsanierung oder umfassende Modernisierung des Hauses daraus machen."
  },
  {
    id: "de-plot-area",
    category: "Flaechen",
    term: "Grundstuecksflaeche",
    meaning: "Die dokumentierte Flaeche des Grundstuecks.",
    requiredEvidence: "Eindeutige Grundstuecksflaeche mit Einheit.",
    editorialGuidance: "Grundstuecksflaeche von Wohn- und Nutzflaechen unterscheiden.",
    prohibitedInference: "Keine bebaubare Flaeche oder freie Nutzbarkeit daraus ableiten."
  }
] as const;