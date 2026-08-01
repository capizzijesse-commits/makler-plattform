import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {getLocale} from "next-intl/server";

const SUPPORTED_LOCALES = ["de", "it", "fr", "en"] as const;

type SupportedLocale =
  (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(
  value: string
): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(
    value as SupportedLocale
  );
}

const COPY = {
  de: {
    metadataTitle: "\u00dcber uns | Inserat-AI",
    metadataDescription:
      "Erfahren Sie, warum Inserat-AI entwickelt wurde und welche Vision hinter der Plattform steht.",
    eyebrow: "\u00dcBER INSERAT-AI",
    title: "Warum gibt es Inserat-AI?",
    lead:
      "Wir haben Inserat-AI entwickelt, weil wir aus eigener Erfahrung wissen, wie viel Zeit das Erstellen von Inseraten, Expos\u00e9s und Social-Media-Beitr\u00e4gen kostet.",
    missionTitle: "Unsere Mission",
    missionText:
      "Unser Ziel ist eine Plattform, die alle wichtigen Werkzeuge an einem Ort vereint \u2013 einfach, effizient und f\u00fcr jeden zug\u00e4nglich.",
    audienceTitle:
      "F\u00fcr wen wir Inserat-AI entwickeln",
    audienceText:
      "Ob Makler, Verwaltung oder Privatverk\u00e4ufer: Inserat-AI unterst\u00fctzt Sie dabei, Immobilien professionell zu vermarkten und wertvolle Zeit zu sparen.",
    visionTitle: "Unsere Vision",
    visionText:
      "Wir m\u00f6chten die Zukunft der Immobilienvermarktung aktiv mitgestalten \u2013 innovativ, einfach und f\u00fcr alle zug\u00e4nglich.",
    valuesTitle: "Unser Anspruch",
    values: [
      "Professionelle Ergebnisse in wenigen Sekunden",
      "Einfache und verst\u00e4ndliche Bedienung",
      "Schweizer Begriffe, CHF und mehrsprachige Kommunikation",
      "Transparente Kennzeichnung von Funktionen in Entwicklung",
    ],
    imageCaptionTitle:
      "Pers\u00f6nlich. Engagiert. Schweizerisch.",
    imageCaptionText:
      "Wir entwickeln Inserat-AI laufend weiter, damit Immobilienvermarktung einfacher, schneller und professioneller wird.",
    journey:
      "Vielen Dank, dass Sie Inserat-AI auf dieser Reise begleiten.",
    ctaTitle:
      "Lernen Sie Inserat-AI kostenlos kennen",
    ctaText:
      "Erstellen Sie Ihr erstes professionelles Immobilieninserat und entdecken Sie den vollst\u00e4ndigen Workflow.",
    register: "Kostenlos registrieren",
    prices: "Angebote ansehen",
    imageAlt:
      "Die Menschen hinter Inserat-AI",
  },

  it: {
    metadataTitle: "Chi siamo | Inserat-AI",
    metadataDescription:
      "Scopri perch\u00e9 \u00e8 nata Inserat-AI e quale visione guida la piattaforma.",
    eyebrow: "CHI SIAMO",
    title: "Perch\u00e9 esiste Inserat-AI?",
    lead:
      "Abbiamo sviluppato Inserat-AI perch\u00e9 sappiamo per esperienza diretta quanto tempo richiedono annunci, dossier di vendita e contenuti per i social media.",
    missionTitle: "La nostra missione",
    missionText:
      "Il nostro obiettivo \u00e8 offrire una piattaforma che riunisca tutti gli strumenti importanti in un unico posto: semplice, efficiente e accessibile.",
    audienceTitle:
      "Per chi sviluppiamo Inserat-AI",
    audienceText:
      "Agenti immobiliari, amministrazioni e venditori privati possono commercializzare immobili in modo professionale e risparmiare tempo prezioso.",
    visionTitle: "La nostra visione",
    visionText:
      "Vogliamo contribuire attivamente al futuro del marketing immobiliare: innovativo, semplice e accessibile a tutti.",
    valuesTitle: "Il nostro impegno",
    values: [
      "Risultati professionali in pochi secondi",
      "Utilizzo semplice e comprensibile",
      "Terminologia svizzera, CHF e comunicazione multilingue",
      "Funzioni in sviluppo indicate con trasparenza",
    ],
    imageCaptionTitle:
      "Personale. Impegnata. Svizzera.",
    imageCaptionText:
      "Sviluppiamo continuamente Inserat-AI per rendere il marketing immobiliare pi\u00f9 semplice, veloce e professionale.",
    journey:
      "Grazie per accompagnare Inserat-AI in questo viaggio.",
    ctaTitle:
      "Scopri Inserat-AI gratuitamente",
    ctaText:
      "Crea il tuo primo annuncio immobiliare professionale e scopri l\u2019intero flusso di lavoro.",
    register: "Registrati gratuitamente",
    prices: "Vedi le offerte",
    imageAlt:
      "Le persone dietro Inserat-AI",
  },

  fr: {
    metadataTitle:
      "\u00c0 propos | Inserat-AI",
    metadataDescription:
      "D\u00e9couvrez pourquoi Inserat-AI a \u00e9t\u00e9 cr\u00e9\u00e9 et quelle vision guide la plateforme.",
    eyebrow:
      "\u00c0 PROPOS D\u2019INSERAT-AI",
    title:
      "Pourquoi Inserat-AI existe-t-il?",
    lead:
      "Nous avons d\u00e9velopp\u00e9 Inserat-AI parce que nous savons par exp\u00e9rience combien de temps demandent les annonces, les dossiers de vente et les contenus pour les r\u00e9seaux sociaux.",
    missionTitle: "Notre mission",
    missionText:
      "Notre objectif est de r\u00e9unir tous les outils importants sur une seule plateforme, simple, efficace et accessible.",
    audienceTitle:
      "Pour qui d\u00e9veloppons-nous Inserat-AI?",
    audienceText:
      "Courtiers, r\u00e9gies et vendeurs priv\u00e9s peuvent commercialiser leurs biens de mani\u00e8re professionnelle tout en gagnant un temps pr\u00e9cieux.",
    visionTitle: "Notre vision",
    visionText:
      "Nous voulons contribuer activement \u00e0 l\u2019avenir de la commercialisation immobili\u00e8re: innovante, simple et accessible \u00e0 tous.",
    valuesTitle: "Notre engagement",
    values: [
      "Des r\u00e9sultats professionnels en quelques secondes",
      "Une utilisation simple et compr\u00e9hensible",
      "Terminologie suisse, CHF et communication multilingue",
      "Une indication transparente des fonctions en d\u00e9veloppement",
    ],
    imageCaptionTitle:
      "Personnel. Engag\u00e9. Suisse.",
    imageCaptionText:
      "Nous am\u00e9liorons continuellement Inserat-AI afin de rendre la commercialisation immobili\u00e8re plus simple, rapide et professionnelle.",
    journey:
      "Merci d\u2019accompagner Inserat-AI dans cette aventure.",
    ctaTitle:
      "D\u00e9couvrez Inserat-AI gratuitement",
    ctaText:
      "Cr\u00e9ez votre premi\u00e8re annonce immobili\u00e8re professionnelle et d\u00e9couvrez le flux de travail complet.",
    register: "S\u2019inscrire gratuitement",
    prices: "Voir les offres",
    imageAlt:
      "Les personnes derri\u00e8re Inserat-AI",
  },

  en: {
    metadataTitle: "About us | Inserat-AI",
    metadataDescription:
      "Discover why Inserat-AI was created and the vision behind the platform.",
    eyebrow: "ABOUT INSERAT-AI",
    title: "Why does Inserat-AI exist?",
    lead:
      "We developed Inserat-AI because we know from experience how much time it takes to create property listings, brochures and social-media content.",
    missionTitle: "Our mission",
    missionText:
      "Our goal is to provide one platform that brings every important tool together: simple, efficient and accessible.",
    audienceTitle:
      "Who we build Inserat-AI for",
    audienceText:
      "Estate agents, property managers and private sellers can market properties professionally while saving valuable time.",
    visionTitle: "Our vision",
    visionText:
      "We want to help shape the future of property marketing: innovative, simple and accessible to everyone.",
    valuesTitle: "Our commitment",
    values: [
      "Professional results in seconds",
      "Simple and understandable operation",
      "Swiss terminology, CHF and multilingual communication",
      "Transparent labelling of features in development",
    ],
    imageCaptionTitle:
      "Personal. Committed. Swiss.",
    imageCaptionText:
      "We continuously improve Inserat-AI to make property marketing simpler, faster and more professional.",
    journey:
      "Thank you for joining Inserat-AI on this journey.",
    ctaTitle: "Discover Inserat-AI for free",
    ctaText:
      "Create your first professional property listing and discover the complete workflow.",
    register: "Register for free",
    prices: "View plans",
    imageAlt:
      "The people behind Inserat-AI",
  },
} as const;

async function getPageText() {
  const locale = await getLocale();
  const candidate = locale.split("-")[0];

  return COPY[
    isSupportedLocale(candidate)
      ? candidate
      : "de"
  ];
}

export async function generateMetadata(): Promise<Metadata> {
  const text = await getPageText();

  return {
    title: text.metadataTitle,
    description: text.metadataDescription,
  };
}

export default async function AboutPage() {
  const text = await getPageText();

  return (
    <main className="min-h-screen bg-[#050918] px-4 pb-24 pt-10 text-white sm:px-6 sm:pt-16 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="grid overflow-hidden rounded-[32px] border border-amber-300/25 bg-gradient-to-br from-slate-950 via-[#07142d] to-[#0a2855] shadow-2xl shadow-black/35 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300 sm:text-sm">
              {text.eyebrow}
            </p>

            <h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {text.title}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              {text.lead}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-14 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5"
              >
                {text.register}
                <span className="ml-2" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link
                href="/#preise"
                className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/15 bg-white/[0.045] px-7 font-black text-white transition hover:bg-white/[0.09]"
              >
                {text.prices}
              </Link>
            </div>
          </div>

          <div className="relative border-t border-white/10 bg-slate-950/45 p-4 sm:p-6 lg:border-l lg:border-t-0">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#020817]">
              <Image
                src="/ueber-uns-inserat-ai.jpeg"
                alt={text.imageAlt}
                width={1080}
                height={1440}
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="h-auto w-full"
              />
            </div>

            <div className="relative mx-3 -mt-14 rounded-2xl border border-amber-300/25 bg-[#061126]/95 p-5 shadow-2xl backdrop-blur sm:mx-6 sm:p-6">
              <h2 className="text-lg font-black text-amber-300 sm:text-xl">
                {text.imageCaptionTitle}
              </h2>

              <p className="mt-2 leading-7 text-slate-300">
                {text.imageCaptionText}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              number: "01",
              title: text.missionTitle,
              text: text.missionText,
            },
            {
              number: "02",
              title: text.audienceTitle,
              text: text.audienceText,
            },
            {
              number: "03",
              title: text.visionTitle,
              text: text.visionText,
            },
          ].map((item) => (
            <article
              key={item.number}
              className="rounded-[26px] border border-white/10 bg-white/[0.045] p-7 shadow-xl"
            >
              <span className="text-sm font-black tracking-[0.18em] text-amber-300">
                {item.number}
              </span>

              <h2 className="mt-5 text-2xl font-black">
                {item.title}
              </h2>

              <p className="mt-4 leading-7 text-slate-300">
                {item.text}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.025] p-7 sm:p-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              INSERAT-AI
            </p>

            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              {text.valuesTitle}
            </h2>

            <p className="mt-5 text-lg font-bold leading-8 text-white">
              {text.journey}
            </p>
          </div>

          <div className="grid gap-3">
            {text.values.map((value) => (
              <div
                key={value}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-300 font-black text-slate-950">
                  &#10003;
                </span>

                <p className="pt-1 font-bold leading-6 text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 flex flex-col items-start justify-between gap-7 rounded-[30px] border border-amber-300/25 bg-gradient-to-r from-[#07142c] to-[#0b2b59] p-8 sm:p-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">
              {text.ctaTitle}
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              {text.ctaText}
            </p>
          </div>

          <Link
            href="/register"
            className="inline-flex min-h-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5"
          >
            {text.register}
            <span className="ml-2" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
