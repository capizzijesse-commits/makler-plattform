"use client";

import { useState } from "react";

import {
  downloadValuationPdf,
} from "@/lib/valuation-pdf";

type ValuationForm = {
  propertyType: string;
  street: string;
  zip: string;
  city: string;
  livingArea: string;
  landArea: string;
  rooms: string;
  yearBuilt: string;
  condition: string;
  renovationYear: string;
  standard: string;
  floor: string;
  lift: string;
  parking: string;
  outdoorArea: string;
  view: string;
};

type LocationStatus =
  | "idle"
  | "checking"
  | "verified"
  | "error";

type VerifiedLocation = {
  label: string;
  detail: string;

  latitude: number;
  longitude: number;

  featureId: string | null;

  buildingAddressUrl?: string | null;
  buildingRegisterUrl?: string | null;
};

type ValuationStatus =
  | "idle"
  | "loading"
  | "success"
  | "unconfigured"
  | "error";

type MarketValuation = {
  salePrice: number;

  salePriceRange: {
    lower: number;
    upper: number;
  };

  currency: string;

  confidence:
    | "poor"
    | "medium"
    | "good";

  locationScore?: number | null;

  latitude?: number | null;
  longitude?: number | null;
};

const initialForm: ValuationForm = {
  propertyType: "",
  street: "",
  zip: "",
  city: "",
  livingArea: "",
  landArea: "",
  rooms: "",
  yearBuilt: "",
  condition: "",
  renovationYear: "",
  standard: "",
  floor: "",
  lift: "",
  parking: "",
  outdoorArea: "",
  view: "",
};

const steps = [
  "Objekt",
  "Flächen",
  "Zustand",
  "Ausstattung",
];

export default function BewertungPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] =
    useState<ValuationForm>(initialForm);

  const [
    locationStatus,
    setLocationStatus,
  ] = useState<LocationStatus>("idle");

  const [
    locationMessage,
    setLocationMessage,
  ] = useState("");

  const [
    verifiedLocation,
    setVerifiedLocation,
  ] = useState<VerifiedLocation | null>(
    null
  );

  const [
    verifiedAddressKey,
    setVerifiedAddressKey,
  ] = useState("");

  const [
    valuationStatus,
    setValuationStatus,
  ] =
    useState<ValuationStatus>(
      "idle"
    );

  const [
    valuation,
    setValuation,
  ] =
    useState<MarketValuation | null>(
      null
    );

  const [
    valuationMessage,
    setValuationMessage,
  ] =
    useState("");

  const [
    pdfStatus,
    setPdfStatus,
  ] =
    useState<
      "idle" |
      "generating" |
      "error"
    >("idle");

  const [
    pdfMessage,
    setPdfMessage,
  ] =
    useState("");

  const [
    savedValuationId,
    setSavedValuationId,
  ] =
    useState<string | null>(
      null
    );

  const updateField = (
    field: keyof ValuationForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setValuationStatus("idle");
    setValuation(null);
    setValuationMessage("");

    setPdfStatus("idle");
    setPdfMessage("");

    /*
     * Sobald Objektdaten geändert werden,
     * gehört eine spätere Bewertung zu
     * einem neuen Bewertungsstand.
     */
    setSavedValuationId(
      null
    );

    if (
      field === "street" ||
      field === "zip" ||
      field === "city"
    ) {
      setLocationStatus("idle");
      setLocationMessage("");
      setVerifiedLocation(null);
      setVerifiedAddressKey("");
    }
  };

  const nextStep = async () => {
    if (step !== 1) {
      setStep((current) =>
        Math.min(current + 1, 4)
      );

      return;
    }

    if (!form.propertyType) {
      setLocationStatus("error");
      setLocationMessage(
        "Bitte zuerst den Immobilientyp auswählen."
      );
      return;
    }

    const street =
      form.street.trim();

    const zip =
      form.zip.trim();

    const city =
      form.city.trim();

    if (!street || !zip || !city) {
      setLocationStatus("error");
      setLocationMessage(
        "Bitte Strasse, PLZ und Ort vollständig eingeben."
      );
      return;
    }

    if (!/^\d{4}$/.test(zip)) {
      setLocationStatus("error");
      setLocationMessage(
        "Bitte eine gültige vierstellige Schweizer PLZ eingeben."
      );
      return;
    }

    const addressKey = [
      street.toLocaleLowerCase("de-CH"),
      zip,
      city.toLocaleLowerCase("de-CH"),
    ].join("|");

    if (
      verifiedLocation &&
      verifiedAddressKey === addressKey
    ) {
      setStep(2);
      return;
    }

    setLocationStatus("checking");
    setLocationMessage(
      "Schweizer Adresse wird geprüft ..."
    );

    try {
      const response =
        await fetch(
          "/api/valuation/location",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              street,
              zip,
              city,
            }),

            cache: "no-store",
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
          location?: VerifiedLocation;
        };

      if (
        !response.ok ||
        !data.success ||
        !data.location
      ) {
        throw new Error(
          data.error ||
            "Die Adresse konnte nicht bestätigt werden."
        );
      }

      setVerifiedLocation(
        data.location
      );

      setVerifiedAddressKey(
        addressKey
      );

      setLocationStatus(
        "verified"
      );

      setLocationMessage(
        "Schweizer Adresse erkannt."
      );

      setStep(2);
    } catch (error) {
      setVerifiedLocation(null);
      setVerifiedAddressKey("");

      setLocationStatus(
        "error"
      );

      setLocationMessage(
        error instanceof Error
          ? error.message
          : "Die Adresse konnte momentan nicht geprüft werden."
      );
    }
  };

  const parseNumber = (
    value: string
  ) => {
    const normalized =
      value
        .trim()
        .replace(",", ".");

    if (!normalized) {
      return null;
    }

    const number =
      Number(normalized);

    return Number.isFinite(number)
      ? number
      : null;
  };

  const formatCHF = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      "de-CH",
      {
        style: "currency",
        currency: "CHF",
        maximumFractionDigits: 0,
      }
    ).format(value);
  };

  const confidenceLabel = (
    confidence:
      MarketValuation["confidence"]
  ) => {
    if (confidence === "good") {
      return "hoch";
    }

    if (confidence === "medium") {
      return "mittel";
    }

    return "eingeschränkt";
  };

  const propertyTypeLabel = (
    value: string
  ) => {
    const labels: Record<
      string,
      string
    > = {
      apartment:
        "Eigentumswohnung",

      house:
        "Einfamilienhaus",

      "row-house":
        "Reihenhaus",

      "semi-detached":
        "Doppeleinfamilienhaus",

      "multi-family":
        "Mehrfamilienhaus",
    };

    return (
      labels[value] ||
      "Nicht angegeben"
    );
  };

  const conditionLabel = (
    value: string
  ) => {
    const labels: Record<
      string,
      string
    > = {
      new:
        "Neubau / neuwertig",

      "very-good":
        "Sehr guter Zustand",

      good:
        "Guter Zustand",

      average:
        "Durchschnittlich",

      renovation:
        "Renovationsbedürftig",
    };

    return (
      labels[value] ||
      "Nicht angegeben"
    );
  };

  const standardLabel = (
    value: string
  ) => {
    const labels: Record<
      string,
      string
    > = {
      simple:
        "Einfach",

      standard:
        "Standard",

      good:
        "Gehobener Standard",

      luxury:
        "Hochwertig / luxuriös",
    };

    return (
      labels[value] ||
      "Nicht angegeben"
    );
  };

  const parkingLabel = (
    value: string
  ) => {
    const labels: Record<
      string,
      string
    > = {
      none:
        "Kein Parkplatz",

      outdoor:
        "Aussenparkplatz",

      garage:
        "Garage",

      underground:
        "Tiefgarage",

      multiple:
        "Mehrere Plätze",
    };

    return (
      labels[value] ||
      "Nicht angegeben"
    );
  };

  const outdoorLabel = (
    value: string
  ) => {
    const labels: Record<
      string,
      string
    > = {
      none:
        "Kein Aussenbereich",

      balcony:
        "Balkon",

      terrace:
        "Terrasse",

      garden:
        "Garten",

      multiple:
        "Mehrere Aussenbereiche",
    };

    return (
      labels[value] ||
      "Nicht angegeben"
    );
  };

  const viewLabel = (
    value: string
  ) => {
    const labels: Record<
      string,
      string
    > = {
      normal:
        "Normale Wohnlage",

      quiet:
        "Besonders ruhig",

      open:
        "Freie Aussicht",

      mountain:
        "Bergsicht",

      lake:
        "See- / Wassersicht",

      premium:
        "Aussergewöhnliche Premiumlage",
    };

    return (
      labels[value] ||
      "Nicht angegeben"
    );
  };

  const liftLabel = (
    value: string
  ) => {
    if (value === "yes") {
      return "Ja";
    }

    if (value === "no") {
      return "Nein";
    }

    if (
      value ===
      "not-relevant"
    ) {
      return "Nicht relevant";
    }

    return "Nicht angegeben";
  };

  const displayValue = (
    value: string,
    suffix = ""
  ) => {
    const trimmed =
      value.trim();

    return trimmed
      ? `${trimmed}${suffix}`
      : "Nicht angegeben";
  };

  const handleDownloadValuationPdf =
    async () => {
      if (
        !valuation ||
        !verifiedLocation ||
        pdfStatus ===
          "generating"
      ) {
        return;
      }

      setPdfStatus(
        "generating"
      );

      setPdfMessage("");

      try {
        const livingArea =
          Math.max(
            parseNumber(
              form.livingArea
            ) ?? 1,
            1
          );

        await downloadValuationPdf({
          address:
            verifiedLocation.label,

          propertyType:
            propertyTypeLabel(
              form.propertyType
            ),

          livingArea:
            displayValue(
              form.livingArea,
              " m²"
            ),

          landArea:
            form.propertyType !==
              "apartment"
              ? displayValue(
                  form.landArea,
                  " m²"
                )
              : null,

          rooms:
            displayValue(
              form.rooms
            ),

          buildingYear:
            displayValue(
              form.yearBuilt
            ),

          renovationYear:
            displayValue(
              form.renovationYear
            ),

          condition:
            conditionLabel(
              form.condition
            ),

          standard:
            standardLabel(
              form.standard
            ),

          floor:
            form.propertyType ===
              "apartment"
              ? displayValue(
                  form.floor
                )
              : null,

          lift:
            form.propertyType ===
              "apartment"
              ? liftLabel(
                  form.lift
                )
              : null,

          parking:
            parkingLabel(
              form.parking
            ),

          outdoorArea:
            outdoorLabel(
              form.outdoorArea
            ),

          view:
            viewLabel(
              form.view
            ),

          salePrice:
            valuation.salePrice,

          salePriceRange:
            valuation.salePriceRange,

          pricePerSqm:
            valuation.salePrice /
            livingArea,

          confidence:
            confidenceLabel(
              valuation.confidence
            ),

          locationScore:
            valuation.locationScore,
        });

        setPdfStatus(
          "idle"
        );
      } catch (error) {
        console.error(
          "[valuation-pdf]",
          error
        );

        setPdfStatus(
          "error"
        );

        setPdfMessage(
          "Der PDF-Bewertungsbericht konnte momentan nicht erstellt werden."
        );
      }
    };

  const handleValuation =
    async () => {
      if (
        valuationStatus ===
        "loading"
      ) {
        return;
      }

      if (!verifiedLocation) {
        setValuationStatus(
          "error"
        );

        setValuationMessage(
          "Bitte zuerst eine Schweizer Adresse bestätigen."
        );

        return;
      }

      if (
        form.propertyType !==
          "apartment" &&
        form.propertyType !==
          "house" &&
        form.propertyType !==
          "row-house" &&
        form.propertyType !==
          "semi-detached"
      ) {
        setValuationStatus(
          "error"
        );

        setValuationMessage(
          "Dieser Immobilientyp wird in der aktuellen Bewertungsversion noch nicht unterstützt."
        );

        return;
      }

      const livingArea =
        parseNumber(
          form.livingArea
        );

      const buildingYear =
        parseNumber(
          form.yearBuilt
        );

      const numberOfRooms =
        parseNumber(
          form.rooms
        );

      const renovationYear =
        parseNumber(
          form.renovationYear
        );

      const floorNumber =
        parseNumber(
          form.floor
        );

      const landArea =
        parseNumber(
          form.landArea
        );

      if (
        livingArea == null ||
        livingArea < 20
      ) {
        setValuationStatus(
          "error"
        );

        setValuationMessage(
          "Bitte eine gültige Wohnfläche eingeben."
        );

        return;
      }

      if (
        buildingYear == null
      ) {
        setValuationStatus(
          "error"
        );

        setValuationMessage(
          "Bitte das Baujahr der Immobilie angeben."
        );

        return;
      }

      if (
        form.propertyType !==
          "apartment" &&
        landArea == null
      ) {
        setValuationStatus(
          "error"
        );

        setValuationMessage(
          "Für Häuser wird die Grundstücksfläche benötigt."
        );

        return;
      }

      if (!form.condition) {
        setValuationStatus(
          "error"
        );

        setValuationMessage(
          "Bitte den Objektzustand auswählen."
        );

        return;
      }

      if (!form.standard) {
        setValuationStatus(
          "error"
        );

        setValuationMessage(
          "Bitte den Ausbaustandard auswählen."
        );

        return;
      }

      const hasLift =
        form.propertyType ===
        "apartment"
          ? form.lift ===
              "yes"
            ? true
            : form.lift ===
                "no"
              ? false
              : null
          : null;

      let indoorParking:
        number | undefined;

      let outdoorParking:
        number | undefined;

      if (
        form.parking ===
        "none"
      ) {
        indoorParking = 0;
        outdoorParking = 0;
      }

      if (
        form.parking ===
          "garage" ||
        form.parking ===
          "underground"
      ) {
        indoorParking = 1;
        outdoorParking = 0;
      }

      if (
        form.parking ===
        "outdoor"
      ) {
        indoorParking = 0;
        outdoorParking = 1;
      }

      /*
       * "multiple" wird bewusst nicht
       * in eine erfundene Anzahl
       * Parkplätze übersetzt.
       */

      setValuationStatus(
        "loading"
      );

      setValuation(null);

      setValuationMessage(
        "Bewertungsfall wird vorbereitet ..."
      );

      /*
       * Eingeloggte Nutzer erhalten einen
       * persistenten Bewertungsfall.
       *
       * Für Gäste antwortet /api/valuations
       * mit 401. Das blockiert die öffentliche
       * Marktwertbewertung ausdrücklich nicht.
       */
      let valuationId =
        savedValuationId;

      if (!valuationId) {
        try {
          const draftResponse =
            await fetch(
              "/api/valuations",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    addressLabel:
                      verifiedLocation.label,

                    street:
                      form.street,

                    postalCode:
                      form.zip,

                    city:
                      form.city,

                    latitude:
                      verifiedLocation.latitude,

                    longitude:
                      verifiedLocation.longitude,

                    propertyType:
                      form.propertyType,

                    livingArea,

                    landArea,

                    rooms:
                      numberOfRooms,

                    buildingYear,

                    renovationYear,

                    condition:
                      form.condition,

                    standard:
                      form.standard,

                    floorNumber,

                    hasLift,

                    parking:
                      form.parking,

                    outdoorArea:
                      form.outdoorArea,

                    view:
                      form.view,
                  }),

                cache:
                  "no-store",
              }
            );

          /*
           * 401 = Gast.
           * Kein Fehler für die Bewertung.
           */
          if (
            draftResponse.status !==
            401
          ) {
            const draftData =
              (await draftResponse.json()) as {
                success?: boolean;

                error?: string;

                valuation?: {
                  id?: string;
                };
              };

            if (
              draftResponse.ok &&
              draftData.success &&
              typeof draftData
                .valuation
                ?.id ===
                "string"
            ) {
              valuationId =
                draftData
                  .valuation
                  .id;

              setSavedValuationId(
                valuationId
              );
            } else {
              console.warn(
                "[valuation-draft]",
                draftData.error ||
                  "Bewertungsentwurf konnte nicht gespeichert werden."
              );
            }
          }
        } catch (
          draftError
        ) {
          /*
           * Speichern ist hier bewusst
           * best-effort. Eine temporäre
           * DB-Störung darf die eigentliche
           * Bewertung nicht verhindern.
           */
          console.warn(
            "[valuation-draft]",
            draftError
          );
        }
      }

      setValuationMessage(
        "Schweizer Marktwert wird ermittelt ..."
      );

      try {
        const response =
          await fetch(
            "/api/valuation/estimate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  latitude:
                    verifiedLocation.latitude,

                  longitude:
                    verifiedLocation.longitude,

                  propertyType:
                    form.propertyType,

                  livingArea,

                  landArea,

                  buildingYear,

                  renovationYear,

                  numberOfRooms,

                  floorNumber,

                  hasLift,

                  numberOfIndoorParkingSpaces:
                    indoorParking,

                  numberOfOutdoorParkingSpaces:
                    outdoorParking,

                  valuationId,
                }),

              cache: "no-store",
            }
          );

        const data =
          (await response.json()) as {
            success?: boolean;

            configured?: boolean;

            error?: string;

            valuation?:
              MarketValuation;

            persistence?: {
              saved?: boolean;

              valuationId?:
                string | null;
            };
          };

        if (
          data.configured ===
          false
        ) {
          setValuationStatus(
            "unconfigured"
          );

          setValuationMessage(
            "Die professionelle Schweizer Marktdaten-Anbindung ist technisch vorbereitet, aber noch nicht aktiviert."
          );

          return;
        }

        if (
          !response.ok ||
          !data.success ||
          !data.valuation
        ) {
          throw new Error(
            data.error ||
              "Die Marktwertermittlung konnte nicht abgeschlossen werden."
          );
        }

        if (
          typeof data
            .persistence
            ?.valuationId ===
          "string"
        ) {
          setSavedValuationId(
            data.persistence
              .valuationId
          );
        }

        setValuation(
          data.valuation
        );

        setValuationStatus(
          "success"
        );

        setValuationMessage(
          data.persistence
            ?.saved
            ? "Marktwert erfolgreich ermittelt und im Konto gespeichert."
            : "Marktwert erfolgreich ermittelt."
        );

        window.setTimeout(
          () => {
            document
              .getElementById(
                "valuation-result"
              )
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
          },
          80
        );
      } catch (error) {
        setValuationStatus(
          "error"
        );

        setValuation(null);

        setValuationMessage(
          error instanceof Error
            ? error.message
            : "Die Marktwertermittlung konnte momentan nicht durchgeführt werden."
        );
      }
    };

  const previousStep = () => {
    setStep((current) =>
      Math.max(current - 1, 1)
    );
  };

  const inputClass =
    "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/65 px-4 py-3.5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15";

  const labelClass =
    "text-sm font-black text-slate-200";

  return (
    <main className="min-h-screen bg-[#050a1d] text-white">{/* VALUATION INSERAT-AI MOBILE V1.1 */}{/* VALUATION DARK PREMIUM V2.1 */}
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-amber-300/20 bg-gradient-to-br from-[#162344] via-[#0d1835] to-[#071126] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:p-8">
          <div className="mb-4 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            Inserat-AI Immobilienbewertung
          </div>

          <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            Immobilienwert professionell
            einschätzen
          </h1>

          <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
            Erfassen Sie die wichtigsten
            wertrelevanten Merkmale Ihrer
            Immobilie. Inserat-AI bereitet daraus
            eine strukturierte Markteinschätzung
            für den Schweizer Immobilienmarkt vor.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-amber-300/15 bg-gradient-to-b from-[#101b38] to-[#091329] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.3)] sm:p-5">
            <p className="mb-5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
              Bewertung
            </p>

            {/* VALUATION STEPPER FORCE GRID V1 */}
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
              }}
            >
              {steps.map((item, index) => {
                const number = index + 1;
                const active = step === number;
                const completed = step > number;

                return (
                  <div
                    key={item}
                    className={`flex min-h-14 items-center gap-2 rounded-2xl border px-3 py-2.5 transition lg:min-h-0 lg:gap-3 lg:py-3.5 ${
                      active
                        ? "border-amber-300/40 bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 shadow-[0_10px_30px_rgba(245,158,11,0.15)]"
                        : completed ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200" : "border-white/[0.07] bg-white/[0.025] text-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black lg:h-8 lg:w-8 lg:text-xs ${
                        active
                          ? "bg-slate-950 text-amber-300"
                          : completed
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-white/[0.07] text-slate-400"
                      }`}
                    >
                      {completed ? "✓" : number}
                    </div>

                    <span className="text-xs font-black sm:text-sm">
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 lg:block">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                Ziel
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Marktwertspanne, wahrscheinlichster
                Marktwert, Preis pro m² und
                transparente Werttreiber.
              </p>
            </div>
          </aside>

          <section className="overflow-hidden rounded-[24px] border border-amber-300/15 bg-gradient-to-b from-[#101b38] via-[#0d1731] to-[#091329] shadow-[0_22px_65px_rgba(0,0,0,0.32)]">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-5 sm:px-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                    Schritt {step} von 4
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    {steps[step - 1]}
                  </h2>
                </div>

                <div className="text-sm font-black text-amber-300">
                  {step * 25} %
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.35)] transition-all duration-300"
                  style={{
                    width: `${step * 25}%`,
                  }}
                />
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-7">
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-black text-white">
                    Um welche Immobilie geht es?
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Objektart und Standort bilden
                    die Grundlage jeder seriösen
                    Marktwertermittlung.
                  </p>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className={labelClass}>
                        Immobilientyp
                      </span>
                      <select
                        value={form.propertyType}
                        onChange={(event) =>
                          updateField(
                            "propertyType",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Bitte auswählen
                        </option>
                        <option value="apartment">
                          Wohnung
                        </option>
                        <option value="house">
                          Einfamilienhaus
                        </option>
                        <option value="row-house">
                          Reihenhaus
                        </option>
                        <option value="semi-detached">
                          Doppeleinfamilienhaus
                        </option>
                        <option value="multi-family" disabled>
                          Mehrfamilienhaus – separate Ertragsbewertung
                        </option>
                      </select>
                    </label>

                    <label className="sm:col-span-2">
                      <span className={labelClass}>
                        Strasse / Hausnummer
                      </span>
                      <input
                        value={form.street}
                        onChange={(event) =>
                          updateField(
                            "street",
                            event.target.value
                          )
                        }
                        placeholder="z. B. Bahnhofstrasse 20"
                        className={inputClass}
                      />
                    </label>

                    <label>
                      <span className={labelClass}>
                        PLZ
                      </span>
                      <input
                        value={form.zip}
                        onChange={(event) =>
                          updateField(
                            "zip",
                            event.target.value
                          )
                        }
                        inputMode="numeric"
                        placeholder="8001"
                        className={inputClass}
                      />
                    </label>

                    <label>
                      <span className={labelClass}>
                        Ort
                      </span>
                      <input
                        value={form.city}
                        onChange={(event) =>
                          updateField(
                            "city",
                            event.target.value
                          )
                        }
                        placeholder="Zürich"
                        className={inputClass}
                      />
                    </label>
                  </div>

                  {locationStatus !==
                    "idle" && (
                    <div
                      role={
                        locationStatus ===
                        "error"
                          ? "alert"
                          : "status"
                      }
                      aria-live="polite"
                      className={
                        "mt-5 rounded-xl border px-4 py-3 text-sm " +
                        (
                          locationStatus ===
                          "error"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : locationStatus ===
                                "verified"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                        )
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 font-bold">
                          {locationStatus ===
                          "verified"
                            ? "✓"
                            : locationStatus ===
                                "error"
                              ? "!"
                              : "…"}
                        </div>

                        <div>
                          <p className="font-semibold">
                            {locationMessage}
                          </p>

                          {locationStatus ===
                            "verified" &&
                            verifiedLocation && (
                              <p className="mt-1 text-xs opacity-80">
                                {
                                  verifiedLocation.label
                                }
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  {verifiedLocation && (
                    <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-4 shadow-[0_10px_30px_rgba(16,185,129,0.06)]">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/15 text-xs font-black text-emerald-300">
                          ✓
                        </div>

                        <div>
                          <p className="text-sm font-black text-emerald-300">
                            Schweizer Adresse bestätigt
                          </p>

                          <p className="mt-1 text-xs font-medium text-emerald-100/70">
                            {
                              verifiedLocation.label
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <h3 className="text-lg font-black text-white">
                    Grösse und Baujahr
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Fläche und Objektgrösse haben
                    einen besonders hohen Einfluss
                    auf den Marktwert.
                  </p>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>
                        Wohnfläche in m²
                      </span>
                      <input
                        value={form.livingArea}
                        onChange={(event) =>
                          updateField(
                            "livingArea",
                            event.target.value
                          )
                        }
                        inputMode="decimal"
                        placeholder="125"
                        className={inputClass}
                      />
                    </label>

                    {form.propertyType !==
                      "apartment" && (
                      <label>
                        <span className={labelClass}>
                          Grundstück in m²
                        </span>
                        <input
                          value={form.landArea}
                          onChange={(event) =>
                            updateField(
                              "landArea",
                              event.target.value
                            )
                          }
                          inputMode="decimal"
                          placeholder="450"
                          className={inputClass}
                        />
                      </label>
                    )}

                    <label>
                      <span className={labelClass}>
                        Anzahl Zimmer
                      </span>
                      <input
                        value={form.rooms}
                        onChange={(event) =>
                          updateField(
                            "rooms",
                            event.target.value
                          )
                        }
                        inputMode="decimal"
                        placeholder="4.5"
                        className={inputClass}
                      />
                    </label>

                    <label>
                      <span className={labelClass}>
                        Baujahr
                      </span>
                      <input
                        value={form.yearBuilt}
                        onChange={(event) =>
                          updateField(
                            "yearBuilt",
                            event.target.value
                          )
                        }
                        inputMode="numeric"
                        placeholder="2008"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="text-lg font-black text-white">
                    Zustand und Renovationen
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Ein sanierter Ausbau kann den
                    Marktwert erheblich verändern.
                  </p>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>
                        Objektzustand
                      </span>
                      <select
                        value={form.condition}
                        onChange={(event) =>
                          updateField(
                            "condition",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Bitte auswählen
                        </option>
                        <option value="new">
                          Neubau / neuwertig
                        </option>
                        <option value="very-good">
                          Sehr guter Zustand
                        </option>
                        <option value="good">
                          Guter Zustand
                        </option>
                        <option value="average">
                          Durchschnittlich
                        </option>
                        <option value="renovation">
                          Renovationsbedürftig
                        </option>
                      </select>
                    </label>

                    <label>
                      <span className={labelClass}>
                        Letzte grössere Renovation
                      </span>
                      <input
                        value={form.renovationYear}
                        onChange={(event) =>
                          updateField(
                            "renovationYear",
                            event.target.value
                          )
                        }
                        inputMode="numeric"
                        placeholder="z. B. 2021"
                        className={inputClass}
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <span className={labelClass}>
                        Ausbaustandard
                      </span>
                      <select
                        value={form.standard}
                        onChange={(event) =>
                          updateField(
                            "standard",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Bitte auswählen
                        </option>
                        <option value="simple">
                          Einfach
                        </option>
                        <option value="standard">
                          Standard
                        </option>
                        <option value="good">
                          Gehobener Standard
                        </option>
                        <option value="luxury">
                          Hochwertig / luxuriös
                        </option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="text-lg font-black text-white">
                    Ausstattung und Lagequalität
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Zusätzliche Merkmale verfeinern
                    die spätere Marktwertspanne.
                  </p>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>
                        Etage
                      </span>
                      <input
                        value={form.floor}
                        onChange={(event) =>
                          updateField(
                            "floor",
                            event.target.value
                          )
                        }
                        placeholder="z. B. 3"
                        className={inputClass}
                      />
                    </label>

                    <label>
                      <span className={labelClass}>
                        Lift
                      </span>
                      <select
                        value={form.lift}
                        onChange={(event) =>
                          updateField(
                            "lift",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Bitte auswählen
                        </option>
                        <option value="yes">
                          Ja
                        </option>
                        <option value="no">
                          Nein
                        </option>
                        <option value="not-relevant">
                          Nicht relevant
                        </option>
                      </select>
                    </label>

                    <label>
                      <span className={labelClass}>
                        Parkplatz / Garage
                      </span>
                      <select
                        value={form.parking}
                        onChange={(event) =>
                          updateField(
                            "parking",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Bitte auswählen
                        </option>
                        <option value="none">
                          Kein Parkplatz
                        </option>
                        <option value="outdoor">
                          Aussenparkplatz
                        </option>
                        <option value="garage">
                          Garage
                        </option>
                        <option value="underground">
                          Tiefgarage
                        </option>
                        <option value="multiple">
                          Mehrere Plätze
                        </option>
                      </select>
                    </label>

                    <label>
                      <span className={labelClass}>
                        Aussenbereich
                      </span>
                      <select
                        value={form.outdoorArea}
                        onChange={(event) =>
                          updateField(
                            "outdoorArea",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Bitte auswählen
                        </option>
                        <option value="none">
                          Kein Aussenbereich
                        </option>
                        <option value="balcony">
                          Balkon
                        </option>
                        <option value="terrace">
                          Terrasse
                        </option>
                        <option value="garden">
                          Garten
                        </option>
                        <option value="multiple">
                          Mehrere Aussenbereiche
                        </option>
                      </select>
                    </label>

                    <label className="sm:col-span-2">
                      <span className={labelClass}>
                        Aussicht / Lagebesonderheit
                      </span>
                      <select
                        value={form.view}
                        onChange={(event) =>
                          updateField(
                            "view",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Bitte auswählen
                        </option>
                        <option value="normal">
                          Normale Wohnlage
                        </option>
                        <option value="quiet">
                          Besonders ruhig
                        </option>
                        <option value="open">
                          Freie Aussicht
                        </option>
                        <option value="mountain">
                          Bergsicht
                        </option>
                        <option value="lake">
                          See- / Wassersicht
                        </option>
                        <option value="premium">
                          Aussergewöhnliche Premiumlage
                        </option>
                      </select>
                    </label>
                  </div>

                  {valuationStatus ===
                    "success" &&
                    valuation && (
                      <div
                        id="valuation-result"
                        className="mt-7 scroll-mt-28 overflow-hidden rounded-[24px] border border-amber-300/20 bg-[#0b1530] shadow-[0_24px_70px_rgba(0,0,0,0.34)]"
                      >
                        <div className="border-b border-amber-300/15 bg-gradient-to-br from-[#17264a] via-[#111d3b] to-[#091329] px-5 py-6 text-white sm:px-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                            Geschätzter Marktwert
                          </p>

                          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                            {formatCHF(
                              valuation.salePrice
                            )}
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            Marktwertspanne{" "}
                            {formatCHF(
                              valuation
                                .salePriceRange
                                .lower
                            )}{" "}
                            –{" "}
                            {formatCHF(
                              valuation
                                .salePriceRange
                                .upper
                            )}
                          </p>
                        </div>

                        <div className="grid gap-px bg-white/[0.08] sm:grid-cols-3">
                          <div className="bg-white/[0.025] p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Richtwert
                            </p>

                            <p className="mt-2 text-lg font-bold text-white">
                              {formatCHF(
                                valuation.salePrice /
                                  Math.max(
                                    parseNumber(
                                      form.livingArea
                                    ) ?? 1,
                                    1
                                  )
                              )}
                              /m²
                            </p>
                          </div>

                          <div className="bg-white/[0.025] p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Sicherheit
                            </p>

                            <p className="mt-2 text-lg font-bold capitalize text-white">
                              {confidenceLabel(
                                valuation.confidence
                              )}
                            </p>
                          </div>

                          <div className="bg-white/[0.025] p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Datenbasis
                            </p>

                            <p className="mt-2 text-lg font-bold text-white">
                              Schweizer AVM
                            </p>
                          </div>
                        </div>

                        {typeof valuation.locationScore ===
                          "number" && (
                          <div className="border-t border-white/[0.08] px-6 py-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Lage-Score
                                </p>

                                <p className="mt-1 text-sm leading-6 text-slate-400">
                                  Vom angebundenen
                                  Bewertungsprovider
                                  gelieferte Lagekennzahl.
                                </p>
                              </div>

                              <div className="text-2xl font-bold text-white">
                                {valuation.locationScore}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-white/[0.08] px-6 py-5">
                          <button
                            type="button"
                            onClick={
                              handleDownloadValuationPdf
                            }
                            disabled={
                              pdfStatus ===
                              "generating"
                            }
                            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_10px_28px_rgba(245,158,11,0.16)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                          >
                            {pdfStatus ===
                            "generating"
                              ? "PDF-Bericht wird erstellt ..."
                              : "PDF-Bewertungsbericht herunterladen"}
                          </button>

                          {pdfStatus ===
                            "error" && (
                            <p className="mt-2 text-sm text-rose-300">
                              {pdfMessage}
                            </p>
                          )}
                        </div>

                        <div className="border-t border-white/[0.08] px-6 py-4">
                          <p className="text-xs leading-5 text-slate-400">
                            Die ausgewiesene Marktwertspanne
                            ist eine datenbasierte
                            Markteinschätzung auf Grundlage
                            der verfügbaren Objekt- und
                            Marktdaten. Sie stellt keine
                            verbindliche Verkehrswert-,
                            Belehnungs- oder
                            Verkaufspreisgarantie dar.
                          </p>
                        </div>
                      </div>
                    )}
                  <div className="mt-7 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0a142d]">
                    <div className="border-b border-white/[0.08] bg-white/[0.025] px-5 py-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Bewertungsgrundlage
                      </p>

                      <h4 className="mt-1 text-base font-black text-white">
                        Erfasste Objektmerkmale
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Diese Angaben dokumentieren das
                        bewertete Objekt. Sie werden nicht
                        automatisch als AVM-Werttreiber
                        ausgewiesen.
                      </p>
                    </div>

                    <div className="grid gap-px bg-white/[0.07] sm:grid-cols-2">
                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Adresse
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {verifiedLocation?.label ||
                            "Nicht bestätigt"}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Immobilientyp
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {propertyTypeLabel(
                            form.propertyType
                          )}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Wohnfläche
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {displayValue(
                            form.livingArea,
                            " m²"
                          )}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Zimmer
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {displayValue(
                            form.rooms
                          )}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Baujahr
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {displayValue(
                            form.yearBuilt
                          )}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Letzte Renovation
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {displayValue(
                            form.renovationYear
                          )}
                        </p>
                      </div>

                      {form.propertyType !==
                        "apartment" && (
                        <div className="bg-white/[0.025] p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Grundstück
                          </p>

                          <p className="mt-1 text-sm font-semibold text-white">
                            {displayValue(
                              form.landArea,
                              " m²"
                            )}
                          </p>
                        </div>
                      )}

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Zustand
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {conditionLabel(
                            form.condition
                          )}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Ausbaustandard
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {standardLabel(
                            form.standard
                          )}
                        </p>
                      </div>

                      {form.propertyType ===
                        "apartment" && (
                        <>
                          <div className="bg-white/[0.025] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Etage
                            </p>

                            <p className="mt-1 text-sm font-semibold text-white">
                              {displayValue(
                                form.floor
                              )}
                            </p>
                          </div>

                          <div className="bg-white/[0.025] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Lift
                            </p>

                            <p className="mt-1 text-sm font-semibold text-white">
                              {liftLabel(
                                form.lift
                              )}
                            </p>
                          </div>
                        </>
                      )}

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Parkierung
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {parkingLabel(
                            form.parking
                          )}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Aussenbereich
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {outdoorLabel(
                            form.outdoorArea
                          )}
                        </p>
                      </div>

                      <div className="bg-white/[0.025] p-4 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Aussicht / Lagebesonderheit
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {viewLabel(
                            form.view
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {valuationStatus ===
                    "idle" && (
                    <div className="mt-7 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-5">
                      <p className="font-black text-white">
                        Bereit für die Marktwertermittlung
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Die Objektdaten und die bestätigte
                        Schweizer Adresse werden für die
                        professionelle Marktwertanalyse
                        verwendet.
                      </p>
                    </div>
                  )}

                  {valuationStatus ===
                    "loading" && (
                    <div
                      className="mt-7 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-5"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />

                        <div>
                          <p className="font-black text-white">
                            Marktwert wird berechnet
                          </p>

                          <p className="mt-1 text-sm text-slate-300">
                            {valuationMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {valuationStatus ===
                    "unconfigured" && (
                    <div
                      className="mt-7 rounded-2xl border border-sky-300/20 bg-sky-400/[0.06] p-5"
                      role="status"
                    >
                      <p className="font-black text-white">
                        Marktdaten-Anbindung vorbereitet
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {valuationMessage}
                      </p>

                      <p className="mt-3 text-xs leading-5 text-slate-400">
                        Inserat-AI zeigt bewusst keine
                        geschätzte CHF-Zahl an, solange
                        keine verifizierte Marktdatenquelle
                        aktiviert ist.
                      </p>
                    </div>
                  )}

                  {valuationStatus ===
                    "error" && (
                    <div
                      className="mt-7 rounded-2xl border border-rose-400/25 bg-rose-400/[0.07] p-5"
                      role="alert"
                    >
                      <p className="font-black text-rose-300">
                        Bewertung nicht möglich
                      </p>

                      <p className="mt-1 text-sm leading-6 text-rose-200/80">
                        {valuationMessage}
                      </p>
                    </div>
                  )}

                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-amber-300/15 bg-[#091329]/95 px-4 py-4 shadow-[0_-18px_45px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-8">
              <button
                type="button"
                onClick={previousStep}
                disabled={step === 1}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Zurück
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    step === 1 &&
                    locationStatus ===
                      "checking"
                  }
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_10px_28px_rgba(245,158,11,0.18)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
                >
                  {step === 1 &&
                  locationStatus ===
                    "checking"
                    ? "Adresse wird geprüft ..."
                    : "Weiter"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleValuation}
                  disabled={
                    valuationStatus ===
                    "loading"
                  }
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_10px_28px_rgba(245,158,11,0.18)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
                >
                  {valuationStatus ===
                    "loading"
                    ? "Marktwert wird ermittelt ..."
                    : valuationStatus ===
                        "success"
                      ? "Bewertung aktualisieren"
                      : "Immobilienwert ermitteln"}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
