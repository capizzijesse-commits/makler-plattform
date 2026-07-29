import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canUseListingCoreForUser } from "@/lib/listing-access";
import { getAuthenticatedUser } from "@/lib/session";

type SupportedLocale = "de" | "it" | "fr" | "en";
type GenerationPhase = "initial" | "remaining" | "all";

type SocialVariant = {
  title: string;
  text: string;
};

type SocialResponse = {
  variants: SocialVariant[];
};

type SocialInput = {
  location: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  highlights: string;
  styleText: string;
  imageAnalysis: string;
};

const API_COPY: Record<
  SupportedLocale,
  {
    login: string;
    paymentRequired: string;
    genericError: string;
    languageName: string;
    systemMessage: string;
    defaultPropertyType: string;
    defaultStyle: string;
    noHighlights: string;
    noImageAnalysis: string;
  }
> = {
  de: {
    login: "Bitte zuerst einloggen.",
    paymentRequired:
      "Social-Media-Texte sind für dieses Objekt erst nach der Freischaltung verfügbar.",
    genericError:
      "Social-Media-Texte konnten nicht erstellt werden.",
    languageName: "Deutsch",
    systemMessage:
      "Du schreibst hochwertige, seriöse und verkaufsstarke Social-Media-Texte für Schweizer Immobilienmakler.",
    defaultPropertyType: "Wohnung",
    defaultStyle: "hochwertig und modern",
    noHighlights: "keine",
    noImageAnalysis: "Keine Bildanalyse vorhanden",
  },
  it: {
    login: "Effettua prima il login.",
    paymentRequired:
      "I testi per i social media saranno disponibili per questo immobile dopo l’attivazione.",
    genericError:
      "Non è stato possibile creare i testi per i social media.",
    languageName: "italiano",
    systemMessage:
      "Scrivi testi professionali, affidabili e persuasivi per i social media destinati ad agenti immobiliari svizzeri.",
    defaultPropertyType: "appartamento",
    defaultStyle: "pregiato e moderno",
    noHighlights: "nessuno",
    noImageAnalysis: "Nessuna analisi delle immagini disponibile",
  },
  fr: {
    login: "Veuillez d’abord vous connecter.",
    paymentRequired:
      "Les textes pour les réseaux sociaux seront disponibles pour ce bien après son activation.",
    genericError:
      "Les textes pour les réseaux sociaux n’ont pas pu être créés.",
    languageName: "français",
    systemMessage:
      "Rédige des textes professionnels, sérieux et vendeurs pour les réseaux sociaux d’agents immobiliers suisses.",
    defaultPropertyType: "appartement",
    defaultStyle: "haut de gamme et moderne",
    noHighlights: "aucun",
    noImageAnalysis: "Aucune analyse d’image disponible",
  },
  en: {
    login: "Please log in first.",
    paymentRequired:
      "Social media texts for this property are available after activation.",
    genericError:
      "The social media texts could not be created.",
    languageName: "English",
    systemMessage:
      "Write polished, credible and persuasive social media copy for Swiss real estate professionals.",
    defaultPropertyType: "apartment",
    defaultStyle: "high-quality and modern",
    noHighlights: "none",
    noImageAnalysis: "No image analysis is available",
  },
};

function normalizeLocale(value: unknown): SupportedLocale {
  if (typeof value !== "string") {
    return "de";
  }

  const normalized = value.trim().toLowerCase().split("-")[0];

  if (
    normalized === "de" ||
    normalized === "it" ||
    normalized === "fr" ||
    normalized === "en"
  ) {
    return normalized;
  }

  return "de";
}

function normalizePhase(value: unknown): GenerationPhase {
  if (
    value === "initial" ||
    value === "remaining" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

function cleanValue(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim() || fallback;
}

function locationTag(location: string) {
  return location
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function canonicalTitle(
  platform: "Instagram" | "Facebook" | "LinkedIn" | "X",
  number: number
) {
  return `${platform} Variant ${number}`;
}

function germanFallback(data: SocialInput): SocialVariant[] {
  const {
    location,
    propertyType,
    rooms,
    livingArea,
    price,
    highlights,
    styleText,
    imageAnalysis,
  } = data;
  const tag = locationTag(location);
  const priceLine = price
    ? `Der Richtpreis liegt bei CHF ${price}.`
    : "";
  const highlightLine = highlights
    ? `Besonders hervorzuheben sind ${highlights}.`
    : "Die Immobilie überzeugt mit einer attraktiven Lage, angenehmer Raumwirkung und einem stimmigen Gesamtbild.";
  const imageLine = imageAnalysis
    ? "Die vorhandenen Objektbilder wurden bei der Formulierung berücksichtigt."
    : "";

  return [
    {
      title: canonicalTitle("Instagram", 1),
      text: `🏡 Stilvoll wohnen in ${location}

Diese ${rooms}-Zimmer-${propertyType} mit ca. ${livingArea} m² Wohnfläche verbindet Wohnkomfort, Lagequalität und eine moderne Präsentation.

${highlightLine}

Der Stil wirkt ${styleText}. ${priceLine}
${imageLine}

📩 Jetzt Kontakt aufnehmen und Besichtigung vereinbaren.

#ImmobilienSchweiz #${tag} #Immobilien #Wohnen #Zuhause #RealEstate`,
    },
    {
      title: canonicalTitle("Instagram", 2),
      text: `✨ Neues Zuhause gesucht?

Diese ${propertyType} in ${location} bietet ${rooms} Zimmer, ca. ${livingArea} m² Wohnfläche und einen ${styleText}en Gesamteindruck.

${highlightLine}
${priceLine}

📲 Interesse geweckt? Jetzt weitere Informationen anfragen.

#Immobilien #${tag} #SchweizerImmobilien #Wohnqualität #Immobilienangebot`,
    },
    {
      title: canonicalTitle("Instagram", 3),
      text: `🏠 Ein Objekt, das Raum, Lage und Wohngefühl verbindet.

Die ${rooms}-Zimmer-${propertyType} in ${location} bietet ca. ${livingArea} m² Wohnfläche und präsentiert sich ${styleText}.

${highlightLine}

📩 Jetzt mehr erfahren und Besichtigung anfragen.

#Immobilienmarketing #${tag} #ImmobilienSchweiz #Wohntraum #Property`,
    },
    {
      title: canonicalTitle("Facebook", 1),
      text: `Diese Immobilie in ${location} bietet eine attraktive Möglichkeit für alle, die Wert auf Wohnqualität, eine gute Lage und ein stimmiges Gesamtbild legen.

Es handelt sich um eine ${rooms}-Zimmer-${propertyType} mit ca. ${livingArea} m² Wohnfläche. Der Stil wirkt ${styleText}.

${highlightLine}
${priceLine}

Gerne stellen wir weitere Informationen zur Verfügung oder vereinbaren eine Besichtigung.

#Immobilien #ImmobilienSchweiz #${tag} #Wohnen #Besichtigung`,
    },
    {
      title: canonicalTitle("Facebook", 2),
      text: `Ein neues Zuhause sollte mehr sein als nur vier Wände. Diese ${propertyType} in ${location} bietet dafür eine starke Grundlage.

Mit ${rooms} Zimmern, ca. ${livingArea} m² Wohnfläche und einem ${styleText}en Erscheinungsbild präsentiert sich das Objekt als spannende Möglichkeit.

${highlightLine}
${priceLine}

Kontaktieren Sie uns für weitere Informationen oder einen Besichtigungstermin.

#Immobilienangebot #Schweiz #${tag} #Wohntraum #RealEstate`,
    },
    {
      title: canonicalTitle("Facebook", 3),
      text: `Immobilie in ${location}: Diese ${rooms}-Zimmer-${propertyType} überzeugt mit ca. ${livingArea} m² Wohnfläche und einer professionellen Gesamtwirkung.

${highlightLine}
Der Stil wirkt ${styleText}. ${priceLine}

Jetzt Kontakt aufnehmen und weitere Informationen erhalten.

#Immobilien #${tag} #Wohnen #Immobilienmarketing #Property`,
    },
    {
      title: canonicalTitle("LinkedIn", 1),
      text: `Professionelle Immobilienvermarktung beginnt mit einer klaren und zielgruppengerechten Präsentation.

Diese ${rooms}-Zimmer-${propertyType} in ${location} bietet ca. ${livingArea} m² Wohnfläche, einen ${styleText}en Gesamteindruck und relevante Highlights.

${highlightLine}
${priceLine}

Das Objekt verbindet Wohnqualität, Lage und Präsentation zu einem überzeugenden Gesamtbild.

#Immobilien #Immobilienmarketing #RealEstate #Schweiz #${tag}`,
    },
    {
      title: canonicalTitle("LinkedIn", 2),
      text: `Der erste digitale Eindruck entscheidet oft darüber, ob ein Immobilienangebot Aufmerksamkeit erhält.

Diese ${propertyType} in ${location} bietet ${rooms} Zimmer, ca. ${livingArea} m² Wohnfläche und einen ${styleText}en Stil.

${highlightLine}
${priceLine}

Eine strukturierte, glaubwürdige Präsentation schafft Vertrauen und macht den Mehrwert schneller sichtbar.

#RealEstateSwitzerland #ImmobilienSchweiz #${tag} #PropertyMarketing`,
    },
    {
      title: canonicalTitle("LinkedIn", 3),
      text: `Immobilien erfolgreich zu vermarkten bedeutet, Fakten und Wirkung sinnvoll zu verbinden.

Bei dieser ${rooms}-Zimmer-${propertyType} in ${location} stehen ca. ${livingArea} m² Wohnfläche, ein ${styleText}er Stil und klare Objektstärken im Mittelpunkt.

${highlightLine}
${priceLine}

#Immobilien #RealEstate #Immobilienmarketing #Schweiz #${tag}`,
    },
    {
      title: canonicalTitle("X", 1),
      text: `🏡 ${rooms}-Zimmer-${propertyType} in ${location}: ca. ${livingArea} m², ${styleText} und starke Highlights. Jetzt mehr erfahren. #Immobilien #${tag}`,
    },
    {
      title: canonicalTitle("X", 2),
      text: `Neue Immobilie in ${location}: ${rooms} Zimmer, ca. ${livingArea} m² und ein hochwertiger Gesamteindruck. Besichtigung anfragen. #ImmobilienSchweiz #RealEstate`,
    },
    {
      title: canonicalTitle("X", 3),
      text: `✨ ${propertyType} in ${location} mit ca. ${livingArea} m² und ${rooms} Zimmern. Ein Zuhause mit Qualität und Ausstrahlung. #Wohnen #${tag}`,
    },
  ];
}

function italianFallback(data: SocialInput): SocialVariant[] {
  const {
    location,
    propertyType,
    rooms,
    livingArea,
    price,
    highlights,
    styleText,
    imageAnalysis,
  } = data;
  const tag = locationTag(location);
  const priceLine = price
    ? `Il prezzo indicativo è di CHF ${price}.`
    : "";
  const highlightLine = highlights
    ? `Tra i punti di forza spiccano ${highlights}.`
    : "L’immobile convince per la posizione interessante, gli spazi piacevoli e l’insieme armonioso.";
  const imageLine = imageAnalysis
    ? "Le immagini disponibili sono state considerate nella formulazione."
    : "";

  return [
    {
      title: canonicalTitle("Instagram", 1),
      text: `🏡 Vivere con stile a ${location}

Questo ${propertyType} di ${rooms} locali offre circa ${livingArea} m² di superficie abitabile, comfort e una presentazione moderna.

${highlightLine}

Lo stile è ${styleText}. ${priceLine}
${imageLine}

📩 Contattaci per maggiori informazioni o per fissare una visita.

#ImmobiliSvizzera #${tag} #Immobili #Casa #RealEstate`,
    },
    {
      title: canonicalTitle("Instagram", 2),
      text: `✨ Cerchi una nuova casa?

Questo ${propertyType} a ${location} propone ${rooms} locali, circa ${livingArea} m² e un’immagine ${styleText}.

${highlightLine}
${priceLine}

📲 Richiedi ora la documentazione completa.

#Immobili #${tag} #Svizzera #CasaDeiSogni #RealEstate`,
    },
    {
      title: canonicalTitle("Instagram", 3),
      text: `🏠 Spazio, posizione e qualità abitativa in un’unica proposta.

Il ${propertyType} a ${location} dispone di ${rooms} locali e circa ${livingArea} m².

${highlightLine}

📩 Scopri tutti i dettagli e prenota una visita.

#MarketingImmobiliare #${tag} #ImmobiliSvizzera #Property`,
    },
    {
      title: canonicalTitle("Facebook", 1),
      text: `Questo immobile a ${location} è una proposta interessante per chi cerca qualità abitativa, una buona posizione e un insieme coerente.

Si tratta di un ${propertyType} di ${rooms} locali con circa ${livingArea} m². Lo stile è ${styleText}.

${highlightLine}
${priceLine}

Siamo volentieri a disposizione per ulteriori informazioni o per una visita.

#Immobili #Svizzera #${tag} #Casa #Visita`,
    },
    {
      title: canonicalTitle("Facebook", 2),
      text: `Una nuova casa deve adattarsi alla vita quotidiana e trasmettere una sensazione positiva.

Questo ${propertyType} a ${location} offre ${rooms} locali, circa ${livingArea} m² e una presentazione ${styleText}.

${highlightLine}
${priceLine}

Contattaci per ricevere maggiori informazioni.

#OffertaImmobiliare #${tag} #CasaDeiSogni #RealEstate`,
    },
    {
      title: canonicalTitle("Facebook", 3),
      text: `Immobile a ${location}: ${rooms} locali, circa ${livingArea} m² e una presentazione professionale.

${highlightLine}
Lo stile è ${styleText}. ${priceLine}

Richiedi ora la documentazione o una visita.

#Immobili #${tag} #Abitare #MarketingImmobiliare #Property`,
    },
    {
      title: canonicalTitle("LinkedIn", 1),
      text: `Una commercializzazione immobiliare professionale parte da una presentazione chiara e orientata al pubblico giusto.

Questo ${propertyType} di ${rooms} locali a ${location} offre circa ${livingArea} m², uno stile ${styleText} e punti di forza rilevanti.

${highlightLine}
${priceLine}

La proposta unisce qualità abitativa, posizione e comunicazione efficace.

#Immobili #MarketingImmobiliare #RealEstate #Svizzera #${tag}`,
    },
    {
      title: canonicalTitle("LinkedIn", 2),
      text: `La prima impressione digitale determina spesso quanta attenzione riceve un immobile.

Questo ${propertyType} a ${location} offre ${rooms} locali, circa ${livingArea} m² e uno stile ${styleText}.

${highlightLine}
${priceLine}

Una presentazione strutturata crea fiducia e rende immediatamente visibili i vantaggi.

#RealEstateSwitzerland #ImmobiliSvizzera #${tag} #PropertyMarketing`,
    },
    {
      title: canonicalTitle("LinkedIn", 3),
      text: `Commercializzare con successo significa unire dati affidabili e comunicazione efficace.

Per questo ${propertyType} di ${rooms} locali a ${location}, l’attenzione è rivolta a circa ${livingArea} m², allo stile ${styleText} e ai punti di forza dell’immobile.

${highlightLine}
${priceLine}

#Immobili #RealEstate #MarketingImmobiliare #Svizzera #${tag}`,
    },
    {
      title: canonicalTitle("X", 1),
      text: `🏡 ${propertyType} di ${rooms} locali a ${location}: circa ${livingArea} m², stile ${styleText} e ottimi punti di forza. Scopri di più. #Immobili #${tag}`,
    },
    {
      title: canonicalTitle("X", 2),
      text: `Nuovo immobile a ${location}: ${rooms} locali, circa ${livingArea} m² e una presentazione di qualità. Prenota una visita. #ImmobiliSvizzera #RealEstate`,
    },
    {
      title: canonicalTitle("X", 3),
      text: `✨ ${propertyType} a ${location}, circa ${livingArea} m² e ${rooms} locali. Una proposta con qualità e carattere. #Casa #${tag}`,
    },
  ];
}

function frenchFallback(data: SocialInput): SocialVariant[] {
  const {
    location,
    propertyType,
    rooms,
    livingArea,
    price,
    highlights,
    styleText,
    imageAnalysis,
  } = data;
  const tag = locationTag(location);
  const priceLine = price
    ? `Le prix indicatif est de CHF ${price}.`
    : "";
  const highlightLine = highlights
    ? `Parmi les principaux atouts: ${highlights}.`
    : "Le bien séduit par sa situation, ses espaces agréables et son ensemble harmonieux.";
  const imageLine = imageAnalysis
    ? "Les images disponibles ont été prises en compte dans la rédaction."
    : "";

  return [
    {
      title: canonicalTitle("Instagram", 1),
      text: `🏡 Vivre avec style à ${location}

Ce ${propertyType} de ${rooms} pièces offre environ ${livingArea} m² de surface habitable, du confort et une présentation moderne.

${highlightLine}

Le style est ${styleText}. ${priceLine}
${imageLine}

📩 Contactez-nous pour recevoir plus d’informations ou organiser une visite.

#ImmobilierSuisse #${tag} #Immobilier #Logement #RealEstate`,
    },
    {
      title: canonicalTitle("Instagram", 2),
      text: `✨ À la recherche d’un nouveau chez-soi?

Ce ${propertyType} à ${location} propose ${rooms} pièces, environ ${livingArea} m² et une présentation ${styleText}.

${highlightLine}
${priceLine}

📲 Demandez maintenant le dossier complet.

#Immobilier #${tag} #Suisse #NouveauChezSoi #RealEstate`,
    },
    {
      title: canonicalTitle("Instagram", 3),
      text: `🏠 Espace, situation et qualité de vie réunis dans un seul bien.

Le ${propertyType} à ${location} dispose de ${rooms} pièces et d’environ ${livingArea} m².

${highlightLine}

📩 Découvrez tous les détails et planifiez une visite.

#MarketingImmobilier #${tag} #ImmobilierSuisse #Property`,
    },
    {
      title: canonicalTitle("Facebook", 1),
      text: `Ce bien à ${location} représente une belle opportunité pour les personnes qui recherchent une bonne qualité de vie et une présentation soignée.

Il s’agit d’un ${propertyType} de ${rooms} pièces avec environ ${livingArea} m². Le style est ${styleText}.

${highlightLine}
${priceLine}

Nous vous renseignons volontiers ou organisons une visite.

#Immobilier #Suisse #${tag} #Logement #Visite`,
    },
    {
      title: canonicalTitle("Facebook", 2),
      text: `Un nouveau logement doit correspondre au quotidien et procurer une sensation positive.

Ce ${propertyType} à ${location} offre ${rooms} pièces, environ ${livingArea} m² et une présentation ${styleText}.

${highlightLine}
${priceLine}

Contactez-nous pour obtenir davantage d’informations.

#OffreImmobilière #${tag} #NouveauChezSoi #RealEstate`,
    },
    {
      title: canonicalTitle("Facebook", 3),
      text: `Bien immobilier à ${location}: ${rooms} pièces, environ ${livingArea} m² et une présentation professionnelle.

${highlightLine}
Le style est ${styleText}. ${priceLine}

Demandez maintenant le dossier ou une visite.

#Immobilier #${tag} #Habitat #MarketingImmobilier #Property`,
    },
    {
      title: canonicalTitle("LinkedIn", 1),
      text: `Une commercialisation immobilière professionnelle commence par une présentation claire et adaptée au public cible.

Ce ${propertyType} de ${rooms} pièces à ${location} offre environ ${livingArea} m², un style ${styleText} et des atouts pertinents.

${highlightLine}
${priceLine}

Le bien réunit qualité de vie, situation et communication efficace.

#Immobilier #MarketingImmobilier #RealEstate #Suisse #${tag}`,
    },
    {
      title: canonicalTitle("LinkedIn", 2),
      text: `La première impression numérique détermine souvent l’attention accordée à un bien.

Ce ${propertyType} à ${location} offre ${rooms} pièces, environ ${livingArea} m² et un style ${styleText}.

${highlightLine}
${priceLine}

Une présentation structurée inspire confiance et rend les avantages immédiatement visibles.

#RealEstateSwitzerland #ImmobilierSuisse #${tag} #PropertyMarketing`,
    },
    {
      title: canonicalTitle("LinkedIn", 3),
      text: `Réussir une commercialisation, c’est associer des données fiables à une communication efficace.

Pour ce ${propertyType} de ${rooms} pièces à ${location}, l’accent est mis sur environ ${livingArea} m², le style ${styleText} et les qualités du bien.

${highlightLine}
${priceLine}

#Immobilier #RealEstate #MarketingImmobilier #Suisse #${tag}`,
    },
    {
      title: canonicalTitle("X", 1),
      text: `🏡 ${propertyType} de ${rooms} pièces à ${location}: env. ${livingArea} m², style ${styleText} et de beaux atouts. En savoir plus. #Immobilier #${tag}`,
    },
    {
      title: canonicalTitle("X", 2),
      text: `Nouveau bien à ${location}: ${rooms} pièces, env. ${livingArea} m² et une présentation soignée. Planifiez une visite. #ImmobilierSuisse #RealEstate`,
    },
    {
      title: canonicalTitle("X", 3),
      text: `✨ ${propertyType} à ${location}, env. ${livingArea} m² et ${rooms} pièces. Un bien de qualité avec du caractère. #Logement #${tag}`,
    },
  ];
}

function englishFallback(data: SocialInput): SocialVariant[] {
  const {
    location,
    propertyType,
    rooms,
    livingArea,
    price,
    highlights,
    styleText,
    imageAnalysis,
  } = data;
  const tag = locationTag(location);
  const priceLine = price
    ? `The guide price is CHF ${price}.`
    : "";
  const highlightLine = highlights
    ? `Key highlights include ${highlights}.`
    : "The property stands out for its attractive location, pleasant sense of space and coherent overall presentation.";
  const imageLine = imageAnalysis
    ? "The available property images were considered when writing the copy."
    : "";

  return [
    {
      title: canonicalTitle("Instagram", 1),
      text: `🏡 Stylish living in ${location}

This ${rooms}-room ${propertyType} offers approximately ${livingArea} m² of living space, comfort and a modern presentation.

${highlightLine}

The style is ${styleText}. ${priceLine}
${imageLine}

📩 Contact us for further details or to arrange a viewing.

#SwissRealEstate #${tag} #RealEstate #Home #Property`,
    },
    {
      title: canonicalTitle("Instagram", 2),
      text: `✨ Looking for a new home?

This ${propertyType} in ${location} offers ${rooms} rooms, approximately ${livingArea} m² and a ${styleText} overall impression.

${highlightLine}
${priceLine}

📲 Request the full property details today.

#RealEstate #${tag} #SwissProperty #DreamHome #Property`,
    },
    {
      title: canonicalTitle("Instagram", 3),
      text: `🏠 Space, location and quality of living in one compelling property.

The ${propertyType} in ${location} provides ${rooms} rooms and approximately ${livingArea} m².

${highlightLine}

📩 Discover the details and arrange a viewing.

#PropertyMarketing #${tag} #SwissRealEstate #Home`,
    },
    {
      title: canonicalTitle("Facebook", 1),
      text: `This property in ${location} is an attractive opportunity for anyone seeking quality of living, a good location and a polished presentation.

It is a ${rooms}-room ${propertyType} with approximately ${livingArea} m². The style is ${styleText}.

${highlightLine}
${priceLine}

We would be pleased to provide further information or arrange a viewing.

#RealEstate #Switzerland #${tag} #Property #Viewing`,
    },
    {
      title: canonicalTitle("Facebook", 2),
      text: `A new home should fit everyday life and feel right from the start.

This ${propertyType} in ${location} offers ${rooms} rooms, approximately ${livingArea} m² and a ${styleText} presentation.

${highlightLine}
${priceLine}

Contact us to receive more information.

#PropertyForSale #${tag} #DreamHome #RealEstate`,
    },
    {
      title: canonicalTitle("Facebook", 3),
      text: `Property in ${location}: ${rooms} rooms, approximately ${livingArea} m² and a professional overall presentation.

${highlightLine}
The style is ${styleText}. ${priceLine}

Request the property details or a viewing today.

#RealEstate #${tag} #Home #PropertyMarketing`,
    },
    {
      title: canonicalTitle("LinkedIn", 1),
      text: `Professional property marketing starts with a clear presentation tailored to the right audience.

This ${rooms}-room ${propertyType} in ${location} offers approximately ${livingArea} m², a ${styleText} overall impression and relevant highlights.

${highlightLine}
${priceLine}

The property combines quality of living, location and effective communication.

#RealEstate #PropertyMarketing #Switzerland #${tag}`,
    },
    {
      title: canonicalTitle("LinkedIn", 2),
      text: `The first digital impression often determines how much attention a property receives.

This ${propertyType} in ${location} offers ${rooms} rooms, approximately ${livingArea} m² and a ${styleText} style.

${highlightLine}
${priceLine}

A structured presentation builds trust and makes the property’s value easier to understand.

#SwissRealEstate #${tag} #PropertyMarketing #RealEstate`,
    },
    {
      title: canonicalTitle("LinkedIn", 3),
      text: `Successful property marketing combines reliable facts with the right impact.

For this ${rooms}-room ${propertyType} in ${location}, the focus is on approximately ${livingArea} m², a ${styleText} style and clear property strengths.

${highlightLine}
${priceLine}

#RealEstate #Property #Marketing #Switzerland #${tag}`,
    },
    {
      title: canonicalTitle("X", 1),
      text: `🏡 ${rooms}-room ${propertyType} in ${location}: approx. ${livingArea} m², ${styleText} and strong highlights. Find out more. #RealEstate #${tag}`,
    },
    {
      title: canonicalTitle("X", 2),
      text: `New property in ${location}: ${rooms} rooms, approx. ${livingArea} m² and a polished presentation. Arrange a viewing. #SwissRealEstate #Property`,
    },
    {
      title: canonicalTitle("X", 3),
      text: `✨ ${propertyType} in ${location} with approx. ${livingArea} m² and ${rooms} rooms. Quality and character in one home. #RealEstate #${tag}`,
    },
  ];
}

function fallbackPosts(
  data: SocialInput,
  locale: SupportedLocale
): SocialVariant[] {
  if (locale === "it") {
    return italianFallback(data);
  }

  if (locale === "fr") {
    return frenchFallback(data);
  }

  if (locale === "en") {
    return englishFallback(data);
  }

  return germanFallback(data);
}

function getVariantNumber(title: string) {
  const match = title.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

function expectedTitlesForPhase(
  phase: GenerationPhase
) {
  const variantNumbers =
    phase === "initial"
      ? [1]
      : phase === "remaining"
        ? [2, 3]
        : [1, 2, 3];

  return [
    "Instagram",
    "Facebook",
    "LinkedIn",
    "X",
  ].flatMap((platform) =>
    variantNumbers.map(
      (number) => `${platform} Variant ${number}`
    )
  );
}

function selectVariantsForPhase(
  variants: SocialVariant[],
  phase: GenerationPhase
) {
  if (phase === "all") {
    return variants;
  }

  const allowedNumbers =
    phase === "initial" ? new Set([1]) : new Set([2, 3]);

  return variants.filter((variant) =>
    allowedNumbers.has(getVariantNumber(variant.title))
  );
}

function normalizeVariants(rawVariants: unknown): SocialVariant[] {
  if (!Array.isArray(rawVariants)) {
    return [];
  }

  return rawVariants
    .filter((item) => {
      return (
        item &&
        typeof item === "object" &&
        typeof (item as SocialVariant).title === "string" &&
        typeof (item as SocialVariant).text === "string"
      );
    })
    .map((item) => ({
      title: (item as SocialVariant).title,
      text: (item as SocialVariant).text,
    }));
}

function extractJson(content: string): SocialResponse | null {
  try {
    return JSON.parse(content) as SocialResponse;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as SocialResponse;
    } catch {
      return null;
    }
  }
}

function buildPrompt(
  locale: SupportedLocale,
  data: SocialInput,
  phase: GenerationPhase
) {
  const copy = API_COPY[locale];
  const expectedTitles = expectedTitlesForPhase(phase);
  const requestedVariants =
    phase === "initial"
      ? `Create exactly:
- 1 variant for Instagram
- 1 variant for Facebook
- 1 variant for LinkedIn
- 1 variant for X / Twitter`
      : phase === "remaining"
        ? `Create exactly:
- Instagram variants 2 and 3
- Facebook variants 2 and 3
- LinkedIn variants 2 and 3
- X / Twitter variants 2 and 3`
        : `Create exactly:
- 3 variants for Instagram
- 3 variants for Facebook
- 3 variants for LinkedIn
- 3 variants for X / Twitter`;

  const titleTemplate = expectedTitles
    .map(
      (title) =>
        `    { "title": "${title}", "text": "..." }`
    )
    .join(",\n");

  return `
Create EXACTLY ${expectedTitles.length} high-quality social media texts for marketing a Swiss property.

Output language: ${copy.languageName}.
Use natural terminology appropriate for the Swiss real estate market in that language.

${requestedVariants}

Use ONLY these details:
- Location: ${data.location}
- Property type: ${data.propertyType}
- Rooms: ${data.rooms}
- Living space: ${data.livingArea} m²
- Price: CHF ${data.price || "-"}
- Highlights: ${data.highlights || copy.noHighlights}
- Style: ${data.styleText}
- Image analysis: ${
    data.imageAnalysis || copy.noImageAnalysis
  }

Quality requirements:
- Write polished, persuasive, professional and natural copy.
- Do not invent facts or features.
- Use only image features explicitly present in the image analysis.
- Avoid empty marketing phrases and false promises.
- Use emojis sparingly where appropriate.
- End every text with suitable hashtags.
- Use 5 to 9 hashtags per Instagram, Facebook and LinkedIn variant.
- Use 2 to 4 hashtags for X.
- Every variant must be distinctly worded.
- Instagram: 700 to 1,000 characters.
- Facebook: 800 to 1,200 characters.
- LinkedIn: 900 to 1,400 characters.
- X / Twitter: 220 to 280 characters.
- Return ONLY valid JSON without Markdown or explanations.

Use these exact title values so the platforms can be grouped reliably:
{
  "variants": [
${titleTemplate}
  ]
}
`;
}

export async function POST(request: NextRequest) {
  let locale: SupportedLocale = "de";

  try {
    const body = await request.json().catch(() => ({}));
    locale = normalizeLocale(body?.locale);
    const phase = normalizePhase(body?.phase);
    const copy = API_COPY[locale];

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: copy.login,
        },
        {
          status: 401,
        }
      );
    }

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    const hasListingAccess =
      await canUseListingCoreForUser({
        userId: user.id,
        plan: user.plan,
        listingId,
      });

    if (!hasListingAccess) {
      return NextResponse.json(
        {
          error: copy.paymentRequired,
          code: "LISTING_PAYMENT_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    const input: SocialInput = {
      location: cleanValue(body.location, "Winterthur"),
      propertyType: cleanValue(
        body.propertyType,
        copy.defaultPropertyType
      ),
      rooms: cleanValue(body.rooms, "4.5"),
      livingArea: cleanValue(body.livingArea, "120"),
      price: cleanValue(body.price, ""),
      highlights: cleanValue(body.highlights, ""),
      styleText: cleanValue(
        body.styleText,
        copy.defaultStyle
      ),
      imageAnalysis: cleanValue(
        body.imageAnalysis,
        ""
      ),
    };

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        variants: selectVariantsForPhase(
          fallbackPosts(input, locale),
          phase
        ),
      });
    }

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.85,
          messages: [
            {
              role: "system",
              content: copy.systemMessage,
            },
            {
              role: "user",
              content: buildPrompt(
                locale,
                input,
                phase
              ),
            },
          ],
        }),
      }
    );

    if (!openAiResponse.ok) {
      return NextResponse.json({
        variants: selectVariantsForPhase(
          fallbackPosts(input, locale),
          phase
        ),
      });
    }

    const openAiData = await openAiResponse.json();
    const content =
      openAiData?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return NextResponse.json({
        variants: selectVariantsForPhase(
          fallbackPosts(input, locale),
          phase
        ),
      });
    }

    const parsed = extractJson(content);
    const expectedTitles = new Set(
      expectedTitlesForPhase(phase)
    );
    const variants = normalizeVariants(
      parsed?.variants
    ).filter((variant) =>
      expectedTitles.has(variant.title)
    );

    if (variants.length < expectedTitles.size) {
      return NextResponse.json({
        variants: selectVariantsForPhase(
          fallbackPosts(input, locale),
          phase
        ),
      });
    }

    return NextResponse.json({
      variants,
      phase,
    });
  } catch (error) {
    console.error("generate-social error:", error);

    return NextResponse.json(
      {
        error: API_COPY[locale].genericError,
      },
      {
        status: 500,
      }
    );
  }
}
