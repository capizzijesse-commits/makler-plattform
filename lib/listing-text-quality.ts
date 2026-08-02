export const LISTING_TEXT_LOCALES = [
  "de",
  "it",
  "fr",
  "en",
] as const;

export type ListingTextLocale =
  (typeof LISTING_TEXT_LOCALES)[number];

export type ListingTextVariant = {
  title: string;
  text: string;
};

export type ListingQualityIssue = {
  variantIndex: number | null;
  code: string;
  message: string;
  severity: "warning" | "error";
};

export type ListingSimilarityResult = {
  firstVariant: number;
  secondVariant: number;
  textSimilarity: number;
  openingSimilarity: number;
  titleSimilarity: number;
};

export type ListingQualityResult = {
  passed: boolean;
  scores: number[];
  issues: ListingQualityIssue[];
  similarities: ListingSimilarityResult[];
};

type PhraseRule = {
  label: string;
  pattern: RegExp;
};

type ClaimRule = {
  label: string;
  claims: string[];
  evidence: string[];
  evidencePatterns?: RegExp[];
};

const FLOSKEL_RULES: Record<
  ListingTextLocale,
  PhraseRule[]
> = {
  de: [
    {
      label: "lässt keine Wünsche offen",
      pattern:
        /\blässt keine wünsche offen\b/i,
    },
    {
      label: "Wohnträume werden wahr",
      pattern:
        /\bwohnträume? (?:werden|wird) wahr\b/i,
    },
    {
      label: "wahres Bijou",
      pattern:
        /\bwahres? bijou\b/i,
    },
    {
      label: "einmalige Gelegenheit",
      pattern:
        /\beinmalige gelegenheit\b/i,
    },
    {
      label: "überzeugt auf ganzer Linie",
      pattern:
        /\büberzeugt auf ganzer linie\b/i,
    },
    {
      label: "Objekt der Extraklasse",
      pattern:
        /\b(?:objekt|immobilie) der extraklasse\b/i,
    },
    {
      label: "perfektes Zuhause",
      pattern:
        /\bperfektes? zuhause\b/i,
    },
    {
      label: "für jeden Geschmack",
      pattern:
        /\bfür jeden geschmack\b/i,
    },
    {
      label: "hier bleiben keine Wünsche offen",
      pattern:
        /\bhier bleiben keine wünsche offen\b/i,
    },
    {
      label: "absolute Traumlage",
      pattern:
        /\babsolute traumlage\b/i,
    },
    {
      label: "unvergleichliches Wohngefühl",
      pattern:
        /\bunvergleichliches? wohngefühl\b/i,
    },
    {
      label: "Oase der Ruhe",
      pattern:
        /\boase der ruhe\b/i,
    },
    {
      label: "Ihr neues Zuhause wartet",
      pattern:
        /\bihr neues zuhause wartet\b/i,
    },
    {
      label: "überzeugt durch Charme",
      pattern:
        /\büberzeugt durch (?:seinen |ihren )?charme\b/i,
    },
    {
      label: "rundum gelungen",
      pattern:
        /\brundum gelungen\b/i,
    },
  ],

  it: [
    {
      label: "non lascia nulla a desiderare",
      pattern:
        /\bnon lascia nulla a desiderare\b/i,
    },
    {
      label: "occasione unica",
      pattern:
        /\boccasione unica\b/i,
    },
    {
      label: "casa dei sogni",
      pattern:
        /\bcasa dei sogni\b/i,
    },
    {
      label: "vero gioiello",
      pattern:
        /\bvero gioiello\b/i,
    },
    {
      label: "soluzione perfetta",
      pattern:
        /\bsoluzione perfetta\b/i,
    },
  ],

  fr: [
    {
      label: "ne laisse rien à désirer",
      pattern:
        /\bne laisse rien à désirer\b/i,
    },
    {
      label: "occasion unique",
      pattern:
        /\boccasion unique\b/i,
    },
    {
      label: "véritable bijou",
      pattern:
        /\bvéritable bijou\b/i,
    },
    {
      label: "maison de rêve",
      pattern:
        /\bmaison de rêve\b/i,
    },
    {
      label: "bien d'exception",
      pattern:
        /\bbien d['’]exception\b/i,
    },
  ],

  en: [
    {
      label: "leaves nothing to be desired",
      pattern:
        /\bleaves nothing to be desired\b/i,
    },
    {
      label: "once-in-a-lifetime opportunity",
      pattern:
        /\bonce[- ]in[- ]a[- ]lifetime opportunity\b/i,
    },
    {
      label: "dream home",
      pattern:
        /\bdream home\b/i,
    },
    {
      label: "true gem",
      pattern:
        /\btrue gem\b/i,
    },
    {
      label: "perfect property",
      pattern:
        /\bperfect property\b/i,
    },
  ],
};

const GENERIC_OPENINGS: Record<
  ListingTextLocale,
  PhraseRule[]
> = {
  de: [
    {
      label: "Entdecken Sie",
      pattern: /^\s*entdecken sie\b/i,
    },
    {
      label: "Willkommen in",
      pattern: /^\s*willkommen in\b/i,
    },
    {
      label: "Hier erwartet Sie",
      pattern:
        /^\s*hier erwartet sie\b/i,
    },
    {
      label: "Diese charmante Immobilie",
      pattern:
        /^\s*diese charmante immobilie\b/i,
    },
    {
      label: "Diese einzigartige Immobilie",
      pattern:
        /^\s*diese einzigartige immobilie\b/i,
    },
    {
      label: "Suchen Sie",
      pattern: /^\s*suchen sie\b/i,
    },
  ],

  it: [
    {
      label: "Scoprite",
      pattern: /^\s*scoprite\b/i,
    },
    {
      label: "Benvenuti",
      pattern: /^\s*benvenuti\b/i,
    },
    {
      label: "Questa affascinante proprietà",
      pattern:
        /^\s*questa affascinante propriet[aà]\b/i,
    },
  ],

  fr: [
    {
      label: "Découvrez",
      pattern: /^\s*découvrez\b/i,
    },
    {
      label: "Bienvenue",
      pattern: /^\s*bienvenue\b/i,
    },
    {
      label: "Ce bien charmant",
      pattern:
        /^\s*ce bien charmant\b/i,
    },
  ],

  en: [
    {
      label: "Discover",
      pattern: /^\s*discover\b/i,
    },
    {
      label: "Welcome to",
      pattern: /^\s*welcome to\b/i,
    },
    {
      label: "This charming property",
      pattern:
        /^\s*this charming property\b/i,
    },
  ],
};

const ABSOLUTE_PROMISES: Record<
  ListingTextLocale,
  PhraseRule[]
> = {
  de: [
    {
      label: "garantierte Wertsteigerung",
      pattern:
        /\bgarantierte? wertsteigerung\b/i,
    },
    {
      label: "garantierte Rendite",
      pattern:
        /\bgarantierte? rendite\b/i,
    },
    {
      label: "sichere Investition",
      pattern:
        /\bsichere investition\b/i,
    },
    {
      label: "risikofreie Investition",
      pattern:
        /\brisikofreie investition\b/i,
    },
    {
      label: "beste Lage",
      pattern:
        /\b(?:aller)?beste lage\b/i,
    },
    {
      label: "unschlagbares Angebot",
      pattern:
        /\bunschlagbares? angebot\b/i,
    },
  ],

  it: [
    {
      label: "rendimento garantito",
      pattern:
        /\brendimento garantito\b/i,
    },
    {
      label: "investimento sicuro",
      pattern:
        /\binvestimento sicuro\b/i,
    },
    {
      label: "migliore posizione",
      pattern:
        /\bmigliore posizione\b/i,
    },
  ],

  fr: [
    {
      label: "rendement garanti",
      pattern:
        /\brendement garanti\b/i,
    },
    {
      label: "investissement sûr",
      pattern:
        /\binvestissement s[uû]r\b/i,
    },
    {
      label: "meilleur emplacement",
      pattern:
        /\bmeilleur emplacement\b/i,
    },
  ],

  en: [
    {
      label: "guaranteed return",
      pattern:
        /\bguaranteed return\b/i,
    },
    {
      label: "risk-free investment",
      pattern:
        /\brisk[- ]free investment\b/i,
    },
    {
      label: "best location",
      pattern:
        /\bbest location\b/i,
    },
  ],
};

const CLAIM_RULES: Record<
  ListingTextLocale,
  ClaimRule[]
> = {
  de: [
    {
      label: "ruhige Lage",
      claims: [
        "ruhige lage",
        "ruhig gelegen",
        "verkehrsruhig",
        "idyllisch gelegen",
        "oase der ruhe",
      ],
      evidence: [
        "ruhige lage",
        "ruhig gelegen",
        "verkehrsarm",
        "sackgasse",
        "wenig verkehr",
        "idyllisch",
      ],
    },
    {
      label: "zentrale Lage",
      claims: [
        "zentrale lage",
        "zentral gelegen",
        "mitten im zentrum",
        "zentrumsnah",
      ],
      evidence: [
        "zentrale lage",
        "zentral gelegen",
        "zentrumsnah",
        "innenstadt",
        "dorfzentrum",
        "stadtzentrum",
      ],
    },
    {
      label: "lichtdurchflutet",
      claims: [
        "lichtdurchflutet",
        "sonnenverwöhnt",
        "sonnendurchflutet",
        "viel natürliches licht",
      ],
      evidence: [
        "lichtdurchflutet",
        "sonnig",
        "sonnenverwöhnt",
        "grosse fenster",
        "bodentiefe fenster",
        "fensterfront",
        "südausrichtung",
        "südwest",
        "viel tageslicht",
      ],
    },
    {
      label: "Aussicht oder Panorama",
      claims: [
        "freie aussicht",
        "unverbaubare aussicht",
        "weitsicht",
        "panoramasicht",
        "panoramablick",
        "bergpanorama",
        "seesicht",
      ],
      evidence: [
        "freie aussicht",
        "unverbaubare aussicht",
        "weitsicht",
        "panorama",
        "bergsicht",
        "seesicht",
        "blick auf",
      ],
    },
    {
      label: "familienfreundliche Eignung",
      claims: [
        "familienfreundlich",
        "ideal für familien",
        "perfekt für familien",
        "eignet sich für familien",
        "geeignet für familien",
        "attraktiv für familien",
        "interessant für junge familien",
        "für familien oder paare",
      ],
      evidence: [
        "familienfreundlich",
        "familienwohnung",
        "kinderzimmer",
        "spielplatz",
        "sicherer schulweg",
        "kindgerechter aussenbereich",
      ],
      evidencePatterns: [
        /(?:3|drei)\s+schlafzimmer/i,
        /(?:zwei|2)\s+kinderzimmer/i,
      ],
    },
    {
      label: "Eignung für Paare",
      claims: [
        "ideal für paare",
        "geeignet für paare",
        "eignet sich für paare",
        "für paare geeignet",
        "für familien oder paare",
      ],
      evidence: [
        "für paare",
        "paarwohnung",
        "geeignet für paare",
      ],
    },
    {
      label: "moderner Zustand",
      claims: [
        "moderne wohnung",
        "modernes objekt",
        "modern gestaltet",
        "zeitgemässe wohnung",
        "zeitgemässer ausbau",
      ],
      evidence: [
        "modernisiert",
        "modernisierung",
        "neubau",
        "neuwertig",
        "zeitgemässer ausbau",
        "moderne küche",
        "moderner ausbau",
        "renoviert",
        "saniert",
      ],
      evidencePatterns: [
        /baujahr\s+20\d{2}/i,
        /renoviert\s+(?:im\s+jahr\s+)?20\d{2}/i,
        /saniert\s+(?:im\s+jahr\s+)?20\d{2}/i,
      ],
    },
    {
      label: "exklusiver oder luxuriöser Ausbaustandard",
      claims: [
        "exklusiver ausbaustandard",
        "luxuriöser ausbau",
        "höchster wohnkomfort",
        "premium-ausbau",
        "exklusive wohnung",
        "luxuriöse wohnung",
      ],
      evidence: [
        "exklusiver ausbau",
        "luxuriöser ausbau",
        "hochwertiger ausbau",
        "naturstein",
        "marmor",
        "massgefertigt",
        "designerküche",
        "premium",
      ],
    },
    {
      label: "renoviert oder saniert",
      claims: [
        "komplett renoviert",
        "vollständig renoviert",
        "umfassend saniert",
        "kernsaniert",
        "neuwertig renoviert",
      ],
      evidence: [
        "renoviert",
        "renovation",
        "saniert",
        "sanierung",
        "kernsaniert",
        "erneuert",
        "modernisiert",
      ],
    },
    {
      label: "Nähe zu Schule oder Kindergarten",
      claims: [
        "nähe zu schulen",
        "nähe zur schule",
        "nähe zu kindergärten",
        "nähe zum kindergarten",
        "schule in unmittelbarer nähe",
        "kindergarten in unmittelbarer nähe",
        "kurzer weg zur schule",
        "kurzer weg zum kindergarten",
      ],
      evidence: [],
      evidencePatterns: [
        /(?:schule|kindergarten).{0,45}(?:\d+\s*(?:m|meter|km)|gehminuten|fussweg|zu fuss|in der nahe|unmittelbar|kurzer weg)/i,
        /(?:\d+\s*(?:m|meter|km)|gehminuten|fussweg|zu fuss|in der nahe|unmittelbar|kurzer weg).{0,45}(?:schule|kindergarten)/i,
      ],
    },
    {
      label: "Bahnhofsnähe oder Pendler-Eignung",
      claims: [
        "bahnhof in der nähe",
        "bahnhof nicht weit entfernt",
        "kurze distanz zum bahnhof",
        "schnell am bahnhof",
        "ideal für pendler",
        "optimal für pendler",
        "perfekt für pendler",
        "schnelle verbindungen",
        "hervorragende öv-anbindung",
        "optimale öv-anbindung",
        "bestens an den öv angebunden",
      ],
      evidence: [],
      evidencePatterns: [
        /(?:bahnhof|bushaltestelle|tram|s-bahn|ov).{0,50}(?:\d+\s*(?:m|meter|km|minuten)|gehminuten|fussweg|zu fuss|direkte verbindung|in der nahe)/i,
        /(?:\d+\s*(?:m|meter|km|minuten)|gehminuten|fussweg|zu fuss|direkte verbindung|in der nahe).{0,50}(?:bahnhof|bushaltestelle|tram|s-bahn|ov)/i,
      ],
    },
    {
      label: "Garage gehört zur Immobilie oder ist im Preis enthalten",
      claims: [
        "gehört ein garagenplatz zur immobilie",
        "garage gehört zur immobilie",
        "angegliederter garagenplatz",
        "zugehöriger garagenplatz",
        "im kaufpreis enthalten",
        "garage im preis enthalten",
        "garagenplatz im preis enthalten",
      ],
      evidence: [],
      evidencePatterns: [
        /(?:garage|garagenplatz|einstellhallenplatz).{0,35}(?:enthalten|inklusive|inbegriffen|zugehorig|gehort dazu)/i,
        /(?:enthalten|inklusive|inbegriffen|zugehorig|gehort dazu).{0,35}(?:garage|garagenplatz|einstellhallenplatz)/i,
      ],
    },
    {
      label: "geschützter oder sicherer Parkplatz",
      claims: [
        "geschützter parkplatz",
        "sicherer parkplatz",
        "sicherheit für ihr fahrzeug",
        "geschützt parkieren",
        "sicheres parkieren",
      ],
      evidence: [
        "abschliessbare garage",
        "abschliessbarer garagenplatz",
        "geschützter parkplatz",
        "überdachter parkplatz",
        "einstellhalle",
        "einstellhallenplatz",
      ],
    },
    {
      label: "flexible oder vielseitige Nutzung",
      claims: [
        "flexible nutzung",
        "vielseitig nutzbar",
        "individuelle gestaltungsmöglichkeiten",
        "unterschiedliche lebenssituationen",
        "an individuelle bedürfnisse anpassbar",
        "flexible raumnutzung",
      ],
      evidence: [
        "flexibel nutzbar",
        "mehrzweckraum",
        "separates büro",
        "homeoffice",
        "atelier",
        "separater eingang",
        "einliegerwohnung",
        "umbaumöglichkeit",
        "nutzungsreserve",
      ],
    },
    {
      label: "besonders gute Raumaufteilung",
      claims: [
        "gut durchdachte raumaufteilung",
        "durchdachter grundriss",
        "praktische raumaufteilung",
        "clevere raumaufteilung",
        "optimale raumaufteilung",
        "praktische gestaltung",
      ],
      evidence: [
        "durchdachter grundriss",
        "praktisch geschnitten",
        "klare raumaufteilung",
        "offener wohn- und essbereich",
        "separater wohnbereich",
        "separater schlafbereich",
        "direkter zugang",
      ],
    },
    {
      label: "unbelegte Attraktivitätswertung",
      claims: [
        "besonders attraktiv",
        "äusserst attraktiv",
        "herausragendes merkmal",
        "idealer raum",
        "ideale wohnung",
        "optimal geeignet",
      ],
      evidence: [],
    },
    {
      label: "unbelegte Atmosphäre oder Wohnqualität",
      claims: [
        "angenehme atmosphäre",
        "entspannte stunden",
        "lädt zum entspannen ein",
        "angenehmer aufenthalt im freien",
        "hohe wohnqualität",
        "besondere wohnqualität",
        "kombination aus wohnqualität",
      ],
      evidence: [],
    },
    {
      label: "unbelegter Komfort",
      claims: [
        "zusätzlicher komfort",
        "praktischer komfort",
        "komfortable wohnung",
        "bequemer zugang",
        "praktische annehmlichkeiten",
      ],
      evidence: [
        "lift",
        "barrierefrei",
        "schwellenlos",
        "bodenheizung",
        "waschturm",
        "redui",
        "direkter zugang",
      ],
    },

    // INSERAT_AI_EXPANDED_CLAIM_FIREWALL_DE
    {
      label:
        "unbelegte Helligkeit oder Raumwirkung",
      claims: [
        "helle gestaltung",
        "hell und freundlich",
        "freundliches ambiente",
        "einladendes ambiente",
        "wohnliches ambiente",
        "einladend wirken",
      ],
      evidence: [
        "grosse fensterfront",
        "bodentiefe fenster",
        "s\u00fcdorientierung",
        "sonnige ausrichtung",
      ],
    },
    {
      label:
        "unbelegte N\u00e4he zu Schule, Kindergarten oder Bahnhof",
      claims: [
        "n\u00e4he zu schule",
        "n\u00e4he zur schule",
        "n\u00e4he zu kindergarten",
        "n\u00e4he zum kindergarten",
        "n\u00e4he zu bahnhof",
        "n\u00e4he zum bahnhof",
        "schule, kindergarten und bahnhof",
        "schule und kindergarten in der umgebung",
        "bahnhof in der umgebung",
        "schulen in der umgebung",
        "kinderg\u00e4rten in der umgebung",
      ],
      evidence: [],
      evidencePatterns: [
        /(?:schule|kindergarten|bahnhof).{0,55}(?:\d+\s*(?:m|meter|km|minuten)|gehminuten|fussweg|zu fuss|direkte verbindung)/i,
        /(?:\d+\s*(?:m|meter|km|minuten)|gehminuten|fussweg|zu fuss|direkte verbindung).{0,55}(?:schule|kindergarten|bahnhof)/i,
      ],
    },
    {
      label:
        "unbelegte Eignung f\u00fcr verschiedene Lebensstile",
      claims: [
        "verschiedene lebensstile",
        "f\u00fcr verschiedene lebensstile",
        "ausreichend platz f\u00fcr verschiedene lebensstile",
        "unterschiedliche lebensstile",
        "zahlreiche lebensmodelle",
        "unterschiedliche wohnkonzepte",
        "vielzahl von wohnkonzepten",
      ],
      evidence: [
        "mehrzweckraum",
        "separates b\u00fcro",
        "homeoffice",
        "atelier",
        "separater eingang",
        "einliegerwohnung",
      ],
    },
    {
      label:
        "subjektiver Nutzen einer Garage oder Parkierung",
      claims: [
        "bequeme parkm\u00f6glichkeit",
        "komfortable parkm\u00f6glichkeit",
        "praktische parkm\u00f6glichkeit",
        "bequemes parkieren",
        "garage bietet zus\u00e4tzlichen stauraum",
      ],
      evidence: [],
    },
    {
      label:
        "unbelegte emotionale Balkonwirkung",
      claims: [
        "l\u00e4dt zum verweilen ein",
        "l\u00e4dt zum entspannen ein",
        "balkon l\u00e4dt",
        "terrasse l\u00e4dt",
        "frische luft geniessen",
        "erweitert den wohnraum nach aussen",
      ],
      evidence: [],
    },
    {
      label:
        "pauschale praktische oder komfortable Wahl",
      claims: [
        "praktische wahl",
        "attraktive wahl",
        "komfort und funktionalit\u00e4t",
        "wert auf komfort",
        "zus\u00e4tzliche annehmlichkeiten",
        "erleichtert den alltag",
        "hoher alltagskomfort",
      ],
      evidence: [],
    },
    // INSERAT_AI_PREMIUM_OVERREACH_FIREWALL_DE
    {
      label:
        "unbelegte helle Wohnräume oder freundliche Atmosphäre",
      claims: [
        "helle wohnräume",
        "helle räume",
        "hell gestaltete räume",
        "freundliche atmosphäre",
        "angenehme atmosphäre",
        "wohnliche atmosphäre",
        "einladende atmosphäre",
      ],
      evidence: [
        "grosse fenster",
        "grosse fensterfront",
        "bodentiefe fenster",
        "lichtdurchflutet",
        "sonnige ausrichtung",
        "südausrichtung",
      ],
    },
    {
      label:
        "unbelegte Wirkung eines Balkons oder einer Terrasse",
      claims: [
        "erweitert den wohnraum nach draussen",
        "erweitert den wohnraum nach aussen",
        "angenehmen platz zum entspannen",
        "platz zum entspannen",
        "lädt zum entspannen ein",
        "lädt zum verweilen ein",
        "frische luft geniessen",
      ],
      evidence: [],
    },
    {
      label:
        "unbelegte durchdachte Raumaufteilung",
      claims: [
        "durchdachte raumaufteilung",
        "durchdachte raumgestaltung",
        "klare raumaufteilung",
        "optimale raumaufteilung",
        "rückzugsmöglichkeiten",
        "gesellige bereiche",
        "klare trennung der wohnbereiche",
      ],
      evidence: [
        "grundriss",
        "raumaufteilung",
        "separater wohnbereich",
        "separater schlafbereich",
        "getrennter wohn- und schlafbereich",
      ],
    },
    {
      label:
        "unbelegter gepflegter Zustand",
      claims: [
        "gepflegter boden",
        "gepflegte räume",
        "gepflegter zustand",
        "gepflegte wohnung",
        "sehr gepflegt",
      ],
      evidence: [
        "gepflegt",
        "sauber und intakt",
        "keine sichtbaren schäden",
        "renoviert",
        "saniert",
        "erneuert",
      ],
    },
    {
      label:
        "unbelegte Steigerung der Lebensqualität",
      claims: [
        "erhöht die lebensqualität",
        "erhöhen die lebensqualität",
        "mehr lebensqualität",
        "steigert die lebensqualität",
        "rundet das angebot ab",
        "runden das angebot ab",
      ],
      evidence: [],
    },  ],
  it: [
    {
      label: "posizione tranquilla",
      claims: [
        "posizione tranquilla",
        "zona tranquilla",
      ],
      evidence: [
        "tranquilla",
        "tranquillo",
        "poco traffico",
        "strada senza uscita",
      ],
    },
    {
      label: "posizione centrale",
      claims: [
        "posizione centrale",
        "nel centro",
      ],
      evidence: [
        "centrale",
        "centro",
      ],
    },
    {
      label: "vista panoramica",
      claims: [
        "vista panoramica",
        "vista imprendibile",
      ],
      evidence: [
        "vista",
        "panorama",
        "lago",
        "montagne",
      ],
    },
  ],

  fr: [
    {
      label: "emplacement calme",
      claims: [
        "emplacement calme",
        "quartier calme",
      ],
      evidence: [
        "calme",
        "peu de circulation",
        "impasse",
      ],
    },
    {
      label: "emplacement central",
      claims: [
        "emplacement central",
        "au centre",
      ],
      evidence: [
        "central",
        "centre",
      ],
    },
    {
      label: "vue panoramique",
      claims: [
        "vue panoramique",
        "vue imprenable",
      ],
      evidence: [
        "vue",
        "panorama",
        "lac",
        "montagne",
      ],
    },
  ],

  en: [
    {
      label: "quiet location",
      claims: [
        "quiet location",
        "peaceful setting",
      ],
      evidence: [
        "quiet",
        "peaceful",
        "low traffic",
        "cul-de-sac",
      ],
    },
    {
      label: "central location",
      claims: [
        "central location",
        "in the city centre",
        "in the city center",
      ],
      evidence: [
        "central",
        "centre",
        "center",
        "downtown",
      ],
    },
    {
      label: "panoramic view",
      claims: [
        "panoramic view",
        "unobstructed view",
      ],
      evidence: [
        "view",
        "panorama",
        "lake",
        "mountain",
        "unobstructed",
      ],
    },
  ],
};

function normalizeText(
  value: string
): string {
  return value
    .toLocaleLowerCase("de-CH")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9äöüàâçéèêëîïôùûüÿœæ'\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(
  value: string
): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 3
    );
}

function createNGrams(
  tokens: string[],
  size: number
): string[] {
  if (tokens.length < size) {
    return tokens;
  }

  const grams: string[] = [];

  for (
    let index = 0;
    index <= tokens.length - size;
    index += 1
  ) {
    grams.push(
      tokens
        .slice(index, index + size)
        .join(" ")
    );
  }

  return grams;
}

function jaccardSimilarity(
  firstValues: string[],
  secondValues: string[]
): number {
  const first =
    new Set(firstValues);
  const second =
    new Set(secondValues);

  if (
    first.size === 0 &&
    second.size === 0
  ) {
    return 1;
  }

  const intersection =
    [...first].filter((value) =>
      second.has(value)
    ).length;

  const union =
    new Set([
      ...first,
      ...second,
    ]).size;

  return union === 0
    ? 0
    : intersection / union;
}

export function calculateTextSimilarity(
  firstText: string,
  secondText: string
): number {
  const firstTokens =
    tokenize(firstText);

  const secondTokens =
    tokenize(secondText);

  const wordSimilarity =
    jaccardSimilarity(
      firstTokens,
      secondTokens
    );

  const phraseSimilarity =
    jaccardSimilarity(
      createNGrams(
        firstTokens,
        2
      ),
      createNGrams(
        secondTokens,
        2
      )
    );

  return Number(
    (
      wordSimilarity * 0.35 +
      phraseSimilarity * 0.65
    ).toFixed(4)
  );
}

function getOpening(
  value: string
): string {
  return tokenize(value)
    .slice(0, 24)
    .join(" ");
}

function countWords(
  value: string
): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function includesAny(
  corpus: string,
  values: string[]
): boolean {
  return values.some((value) =>
    corpus.includes(
      normalizeText(value)
    )
  );
}

function getFactCorpus(
  facts: Record<
    string,
    unknown
  >
): string {
  return normalizeText(
    Object.values(facts)
      .filter(
        (
          value
        ): value is
          | string
          | number =>
          typeof value ===
            "string" ||
          typeof value ===
            "number"
      )
      .map(String)
      .join(" ")
  );
}

function deductScore(
  scores: number[],
  index: number,
  amount: number
) {
  scores[index] = Math.max(
    0,
    scores[index] - amount
  );
}

export function normalizeSwissTypography(
  value: string,
  locale: ListingTextLocale
): string {
  const trimmed =
    value.trim();

  if (locale !== "de") {
    return trimmed;
  }

  return trimmed
    .replace(/ß/g, "ss")
    .replace(/ẞ/g, "SS")
    .replace(
      /(\d)\s*-\s*Zimmer\b/gi,
      "$1-Zimmer"
    );
}

export function evaluateListingQuality(
  variants: ListingTextVariant[],
  locale: ListingTextLocale,
  facts: Record<string, unknown>
): ListingQualityResult {
  const scores =
    variants.map(() => 100);

  const issues:
    ListingQualityIssue[] = [];

  const similarities:
    ListingSimilarityResult[] = [];

  const factCorpus =
    getFactCorpus(facts);

  if (variants.length !== 3) {
    issues.push({
      variantIndex: null,
      code:
        "VARIANT_COUNT_INVALID",
      message:
        `Es wurden ${variants.length} statt genau 3 Varianten erzeugt.`,
      severity: "error",
    });
  }

  variants.forEach(
    (variant, index) => {
      const title =
        variant.title.trim();

      const text =
        variant.text.trim();

      const wordCount =
        countWords(text);

      if (!title) {
        deductScore(
          scores,
          index,
          25
        );

        issues.push({
          variantIndex: index,
          code: "TITLE_MISSING",
          message:
            `Variante ${index + 1} hat keinen Titel.`,
          severity: "error",
        });
      }

      if (
        title.length > 100
      ) {
        deductScore(
          scores,
          index,
          8
        );

        issues.push({
          variantIndex: index,
          code: "TITLE_TOO_LONG",
          message:
            `Der Titel von Variante ${index + 1} ist zu lang.`,
          severity:
            "warning",
        });
      }

      if (
        wordCount < 85 ||
        wordCount > 190
      ) {
        deductScore(
          scores,
          index,
          10
        );

        issues.push({
          variantIndex: index,
          code:
            "WORD_COUNT_OUTSIDE_TARGET",
          message:
            `Variante ${index + 1} enthält ${wordCount} Wörter. Der bevorzugte Bereich liegt bei 85 bis 190 Wörtern.`,
          severity:
            wordCount < 35 ||
            wordCount > 260
              ? "error"
              : "warning",
        });
      }

      for (
        const rule of
        FLOSKEL_RULES[locale]
      ) {
        if (
          rule.pattern.test(text)
        ) {
          deductScore(
            scores,
            index,
            7
          );

          issues.push({
            variantIndex:
              index,
            code:
              "OVERUSED_PHRASE",
            message:
              `Variante ${index + 1} verwendet die Floskel „${rule.label}“.`,
            severity:
              "warning",
          });
        }
      }

      for (
        const rule of
        GENERIC_OPENINGS[locale]
      ) {
        if (
          rule.pattern.test(text)
        ) {
          deductScore(
            scores,
            index,
            8
          );

          issues.push({
            variantIndex:
              index,
            code:
              "GENERIC_OPENING",
            message:
              `Variante ${index + 1} beginnt generisch mit „${rule.label}“.`,
            severity:
              "warning",
          });
        }
      }

      for (
        const rule of
        ABSOLUTE_PROMISES[
          locale
        ]
      ) {
        if (
          rule.pattern.test(text)
        ) {
          deductScore(
            scores,
            index,
            18
          );

          issues.push({
            variantIndex:
              index,
            code:
              "UNSUPPORTED_PROMISE",
            message:
              `Variante ${index + 1} enthält die unbelegte Aussage „${rule.label}“.`,
            severity: "error",
          });
        }
      }

      const normalizedVariant =
        normalizeText(
          `${title} ${text}`
        );

      for (
        const rule of
        CLAIM_RULES[locale]
      ) {
        const containsClaim =
          includesAny(
            normalizedVariant,
            rule.claims
          );

        const hasEvidence =
          includesAny(
            factCorpus,
            rule.evidence
          ) ||
          (
            rule.evidencePatterns?.some(
              (pattern) =>
                pattern.test(
                  factCorpus
                )
            ) ?? false
          );

        if (
          containsClaim &&
          !hasEvidence
        ) {
          deductScore(
            scores,
            index,
            14
          );

          issues.push({
            variantIndex:
              index,
            code:
              "CLAIM_WITHOUT_EVIDENCE",
            message:
              `Variante ${index + 1} behauptet „${rule.label}“, obwohl dafür keine Grundlage in den Objektdaten vorhanden ist.`,
            severity: "error",
          });
        }
      }

      if (
        locale === "de" &&
        /[ßẞ]/.test(
          `${title} ${text}`
        )
      ) {
        deductScore(
          scores,
          index,
          12
        );

        issues.push({
          variantIndex: index,
          code:
            "SWISS_ORTHOGRAPHY",
          message:
            `Variante ${index + 1} verwendet ß statt Schweizer ss.`,
          severity: "error",
        });
      }

      const sentences =
        text
          .split(/[.!?]+/)
          .map((sentence) =>
            tokenize(sentence)
              .slice(0, 3)
              .join(" ")
          )
          .filter(
            (sentence) =>
              sentence.length > 0
          );

      const sentenceStarts =
        new Set<string>();

      let repeatedStarts = 0;

      for (
        const sentenceStart of
        sentences
      ) {
        if (
          sentenceStarts.has(
            sentenceStart
          )
        ) {
          repeatedStarts += 1;
        }

        sentenceStarts.add(
          sentenceStart
        );
      }

      if (
        repeatedStarts >= 2
      ) {
        deductScore(
          scores,
          index,
          7
        );

        issues.push({
          variantIndex: index,
          code:
            "REPETITIVE_SENTENCE_STRUCTURE",
          message:
            `Variante ${index + 1} wiederholt mehrfach dieselben Satzanfänge.`,
          severity:
            "warning",
        });
      }
    }
  );

  for (
    let firstIndex = 0;
    firstIndex <
    variants.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
      variants.length;
      secondIndex += 1
    ) {
      const first =
        variants[firstIndex];

      const second =
        variants[secondIndex];

      const textSimilarity =
        calculateTextSimilarity(
          first.text,
          second.text
        );

      const openingSimilarity =
        calculateTextSimilarity(
          getOpening(first.text),
          getOpening(second.text)
        );

      const titleSimilarity =
        calculateTextSimilarity(
          first.title,
          second.title
        );

      similarities.push({
        firstVariant:
          firstIndex,
        secondVariant:
          secondIndex,
        textSimilarity,
        openingSimilarity,
        titleSimilarity,
      });

      if (
        textSimilarity >= 0.38
      ) {
        deductScore(
          scores,
          firstIndex,
          18
        );

        deductScore(
          scores,
          secondIndex,
          18
        );

        issues.push({
          variantIndex: null,
          code:
            "VARIANTS_TOO_SIMILAR",
          message:
            `Die Varianten ${firstIndex + 1} und ${secondIndex + 1} sind sprachlich zu ähnlich (${Math.round(textSimilarity * 100)} %).`,
          severity: "error",
        });
      }

      if (
        openingSimilarity >=
        0.52
      ) {
        deductScore(
          scores,
          firstIndex,
          10
        );

        deductScore(
          scores,
          secondIndex,
          10
        );

        issues.push({
          variantIndex: null,
          code:
            "OPENINGS_TOO_SIMILAR",
          message:
            `Die Einstiege der Varianten ${firstIndex + 1} und ${secondIndex + 1} sind zu ähnlich.`,
          severity: "error",
        });
      }

      if (
        titleSimilarity >=
        0.58
      ) {
        deductScore(
          scores,
          firstIndex,
          7
        );

        deductScore(
          scores,
          secondIndex,
          7
        );

        issues.push({
          variantIndex: null,
          code:
            "TITLES_TOO_SIMILAR",
          message:
            `Die Titel der Varianten ${firstIndex + 1} und ${secondIndex + 1} sind zu ähnlich.`,
          severity:
            "warning",
        });
      }
    }
  }

  const roundedScores =
    scores.map((score) =>
      Math.round(score)
    );

  const hasBlockingIssue =
    issues.some(
      (issue) =>
        issue.severity ===
        "error"
    );

  const passed =
    variants.length === 3 &&
    roundedScores.every(
      (score) => score >= 75
    ) &&
    !hasBlockingIssue;

  return {
    passed,
    scores:
      roundedScores,
    issues,
    similarities,
  };
}

export function buildQualityRepairInstructions(
  result: ListingQualityResult
): string {
  if (result.passed) {
    return "";
  }

  const uniqueMessages =
    [
      ...new Set(
        result.issues.map(
          (issue) =>
            issue.message
        )
      ),
    ];

  return [
    "Die erste Ausgabe hat die interne Qualitätsprüfung nicht bestanden.",
    "Überarbeite alle drei Varianten vollständig.",
    "Korrigiere insbesondere folgende Probleme:",
    ...uniqueMessages
      .slice(0, 18)
      .map(
        (message) =>
          `- ${message}`
      ),
    "- Tausche nicht bloss einzelne Synonyme aus.",
    "- Verwende für jede Variante einen neuen Einstieg, eine andere Absatzreihenfolge und einen anderen Schwerpunkt.",
    "- Entferne unbelegte Eigenschaften und pauschale Werbeversprechen.",
    "- Verwende ausschliesslich Fakten aus den bereitgestellten Objektdaten.",
    "- Gib erneut exakt drei vollständige Varianten im verlangten JSON-Format aus.",
  ].join("\n");
}
