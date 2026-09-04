"use client";

import { useState } from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import type { InseratAiMarket } from "@/lib/inserat-ai-market";

type ExampleGeneratorProps = {
  market: InseratAiMarket;
};

export default function ExampleGenerator({
  market,
}: ExampleGeneratorProps) {
  const locale = useLocale();
  const t = useTranslations("ExampleGenerator");

  const [rooms, setRooms] = useState(
    () =>
      market === "DE" ? "4" : t("defaults.rooms")
  );

  const [propertyType, setPropertyType] = useState(
    () => t("defaults.propertyType")
  );

  const [location, setLocation] = useState(
    () =>
      market === "DE"
        ? "München, Bayern"
        : t("defaults.location")
  );

  const [livingSpace, setLivingSpace] = useState(
    () => t("defaults.livingSpace")
  );

  const [price, setPrice] = useState(
    () =>
      market === "DE"
        ? "795.000 €"
        : t("defaults.price")
  );

  const [highlights, setHighlights] = useState(
    () => t("defaults.highlights")
  );

  const [title, setTitle] = useState(
    () =>
      market === "DE"
        ? "Stilvolle 4-Zimmer-Wohnung mit Balkon in München"
        : t("defaults.title")
  );

  const [description, setDescription] = useState(
    () => t("defaults.description")
  );

  function generateExample() {
    const locationWithoutRegion =
      location.split(",")[0]?.trim();

    const cleanLocation =
      locationWithoutRegion ||
      location.trim() ||
      t("defaults.location");

    const firstHighlight =
      highlights.split(",")[0]?.trim() ||
      t("defaults.fallbackHighlight");

    const propertyTypeLower =
      propertyType.toLocaleLowerCase(locale);

    setTitle(
      t("generated.title", {
        rooms,
        propertyType,
        propertyTypeLower,
        firstHighlight,
        location: cleanLocation,
      })
    );

    setDescription(
      t("generated.description", {
        rooms,
        propertyType,
        propertyTypeLower,
        location: cleanLocation,
        highlights,
        livingSpace,
        price,
      })
    );
  }

  return (
    <section className="landingExampleDemo relative overflow-hidden bg-slate-950 px-4 py-16 sm:px-6 md:py-28">
      <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />

      <div className="landingExampleContainer relative mx-auto max-w-7xl">
        <div className="landingExampleIntro mb-14 max-w-3xl">
          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold uppercase tracking-wide text-amber-300">
            {t("intro.eyebrow")}
          </span>

          <h2 className="mt-7 text-4xl font-light tracking-tight text-white md:text-6xl">
            {t("intro.title")}
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            {t("intro.description")}
          </p>
        </div>

        <div className="landingExampleWorkspace grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur md:p-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="landingExampleInputPanel rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                  {t("input.eyebrow")}
                </p>

                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {t("input.title")}
                </h3>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {t("input.demo")}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  {t("input.labels.rooms")}
                </label>

                <input
                  value={rooms}
                  onChange={(event) =>
                    setRooms(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  {t("input.labels.propertyType")}
                </label>

                <input
                  value={propertyType}
                  onChange={(event) =>
                    setPropertyType(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  {t("input.labels.location")}
                </label>

                <input
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  {t("input.labels.livingSpace")}
                </label>

                <input
                  value={livingSpace}
                  onChange={(event) =>
                    setLivingSpace(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  {t("input.labels.price")}
                </label>

                <input
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  {t("input.labels.highlights")}
                </label>

                <input
                  value={highlights}
                  onChange={(event) =>
                    setHighlights(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={generateExample}
              className="mt-8 w-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.25)] transition hover:scale-[1.01] hover:from-amber-200 hover:to-amber-400"
            >
              {t("input.generateButton")}
            </button>

            <p className="mt-4 text-center text-sm text-slate-400">
              {t("input.note")}
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-300">
                {t("creates.eyebrow")}
              </p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-white">
                    {t(
                      "creates.professionalTitle.title"
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {t(
                      "creates.professionalTitle.description"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-white">
                    {t(
                      "creates.emotionalDescription.title"
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {t(
                      "creates.emotionalDescription.description"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-white">
                    {t("creates.social.title")}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {t("creates.social.description")}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
{market === "DE"
                    ? "ImmobilienScout24"
                    : "Homegate"}
                </span>

                <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
{market === "DE"
                    ? "immowelt"
                    : "ImmoScout24"}
                </span>

                <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  {t("creates.expose")}
                </span>

                <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Social Media
                </span>
              </div>
            </div>
          </div>

          <div className="landingExampleResultPanel rounded-[1.5rem] border border-amber-400/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                  {t("output.eyebrow")}
                </p>

                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {t("output.title")}
                </h3>
              </div>

              <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                {t("output.ready")}
              </span>
            </div>

            <div className="landingExampleResultCard rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm uppercase tracking-wide text-slate-400">
                {t("output.titleLabel")}
              </p>

              <h4 className="mt-3 text-3xl font-light leading-tight text-white">
                {title}
              </h4>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {t("output.roomsValue", {
                    rooms,
                  })}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {propertyType}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {livingSpace}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {location}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {price}
                </span>
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-sm uppercase tracking-wide text-slate-400">
                  {t("output.descriptionLabel")}
                </p>

                <p className="mt-4 text-lg leading-8 text-slate-300">
                  {description}
                </p>
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-sm uppercase tracking-wide text-slate-400">
                  {t("output.highlightsLabel")}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {highlights
                    .split(",")
                    .map((item, index) => (
                      <span
                        key={item + index}
                        className="rounded-full bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200"
                      >
                        {item.trim()}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/register"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-4 font-bold text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.25)] transition hover:scale-[1.01] hover:from-amber-200 hover:to-amber-400"
              >
                {t("output.register")}
              </a>

              <a
                href="#preise"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-6 py-4 font-bold text-white transition hover:bg-white/10"
              >
                {t("output.prices")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
