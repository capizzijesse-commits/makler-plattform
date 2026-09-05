"use client";

import {
  useMemo,
  useState,
} from "react";

type GermanyFinancingCheckProps = {
  askingPrice: number | null;
  equityValue: string;
  onEquityChange: (
    value: string
  ) => void;
  locale: string;
};

type LocaleKey =
  | "de"
  | "it"
  | "fr"
  | "en";

const COPY = {
  de: {
    eyebrow:
      "FINANZIERUNGS-CHECK DEUTSCHLAND",
    title:
      "Käufer-Finanzierung simulieren",
    description:
      "Unverbindliche Orientierung zu Eigenkapital, Kaufnebenkosten und anfänglicher Kreditrate.",
    equity:
      "Eigenkapital in EUR",
    ancillary:
      "Kaufnebenkosten in %",
    interest:
      "Sollzins p.a. in %",
    repayment:
      "Anfängliche Tilgung p.a. in %",
    income:
      "Netto-Haushaltseinkommen pro Monat in EUR",
    totalCost:
      "Gesamtkosten",
    ancillaryCost:
      "Kaufnebenkosten",
    financing:
      "Finanzierungsbedarf",
    equityRatio:
      "Eigenkapitalquote",
    recommendedEquity:
      "Orientierungs-Eigenkapital",
    annualInterest:
      "Zinskosten / Jahr",
    annualRepayment:
      "Tilgung / Jahr",
    monthlyRate:
      "Anfängliche Monatsrate",
    paymentRatio:
      "Rate / Nettoeinkommen",
    status:
      "Orientierung",
    ok:
      "Im Orientierungsrahmen",
    equityLow:
      "Eigenkapital unter dem Orientierungswert",
    rateHigh:
      "Monatliche Kreditrate relativ hoch",
    incomplete:
      "Angaben für Berechnung ergänzen",
    assumptions:
      "Orientierung: Eigenkapitalziel mindestens Kaufnebenkosten plus 20 % des Kaufpreises. Die anfängliche Kreditrate wird aus Sollzins und Tilgung berechnet. Eine Rate bis etwa 40 % des Netto-Haushaltseinkommens dient nur als grober Orientierungswert.",
    privacy:
      "Sollzins, Tilgung, Kaufnebenkosten und Nettoeinkommen werden nur für diese Simulation verwendet und nicht mit den Finanzdaten gespeichert.",
    disclaimer:
      "Keine Finanzierungszusage und keine individuelle Kreditberatung. Banken prüfen Einkommen, Ausgaben, Sicherheiten, Beleihungswert und weitere Kriterien individuell.",
  },

  it: {
    eyebrow:
      "CHECK FINANZIAMENTO GERMANIA",
    title:
      "Simulare il finanziamento dell'acquirente",
    description:
      "Orientamento non vincolante su capitale proprio, costi accessori e rata iniziale.",
    equity:
      "Capitale proprio in EUR",
    ancillary:
      "Costi accessori di acquisto in %",
    interest:
      "Tasso debitore annuo in %",
    repayment:
      "Ammortamento iniziale annuo in %",
    income:
      "Reddito netto mensile del nucleo familiare in EUR",
    totalCost:
      "Costi complessivi",
    ancillaryCost:
      "Costi accessori",
    financing:
      "Fabbisogno finanziario",
    equityRatio:
      "Quota di capitale proprio",
    recommendedEquity:
      "Capitale proprio orientativo",
    annualInterest:
      "Interessi / anno",
    annualRepayment:
      "Ammortamento / anno",
    monthlyRate:
      "Rata mensile iniziale",
    paymentRatio:
      "Rata / reddito netto",
    status:
      "Orientamento",
    ok:
      "Nel quadro orientativo",
    equityLow:
      "Capitale proprio sotto il valore orientativo",
    rateHigh:
      "Rata mensile relativamente elevata",
    incomplete:
      "Completare i dati per il calcolo",
    assumptions:
      "Orientamento: capitale proprio almeno pari ai costi accessori più il 20 % del prezzo di acquisto. La rata iniziale deriva da interesse e ammortamento. Il 40 % del reddito netto è soltanto un valore orientativo.",
    privacy:
      "Interesse, ammortamento, costi accessori e reddito netto vengono utilizzati solo per questa simulazione e non vengono salvati.",
    disclaimer:
      "Nessuna promessa di finanziamento e nessuna consulenza creditizia individuale. Le banche effettuano una valutazione individuale.",
  },

  fr: {
    eyebrow:
      "CHECK FINANCEMENT ALLEMAGNE",
    title:
      "Simuler le financement de l'acquéreur",
    description:
      "Orientation non contraignante sur les fonds propres, les frais d'acquisition et la mensualité initiale.",
    equity:
      "Fonds propres en EUR",
    ancillary:
      "Frais d'acquisition en %",
    interest:
      "Taux débiteur annuel en %",
    repayment:
      "Amortissement initial annuel en %",
    income:
      "Revenu net mensuel du ménage en EUR",
    totalCost:
      "Coût total",
    ancillaryCost:
      "Frais d'acquisition",
    financing:
      "Besoin de financement",
    equityRatio:
      "Quote-part de fonds propres",
    recommendedEquity:
      "Fonds propres indicatifs",
    annualInterest:
      "Intérêts / an",
    annualRepayment:
      "Amortissement / an",
    monthlyRate:
      "Mensualité initiale",
    paymentRatio:
      "Mensualité / revenu net",
    status:
      "Orientation",
    ok:
      "Dans le cadre indicatif",
    equityLow:
      "Fonds propres sous la valeur indicative",
    rateHigh:
      "Mensualité relativement élevée",
    incomplete:
      "Compléter les données pour le calcul",
    assumptions:
      "Orientation : fonds propres au moins égaux aux frais d'acquisition plus 20 % du prix. La mensualité initiale est calculée à partir du taux et de l'amortissement. Le seuil de 40 % du revenu net reste indicatif.",
    privacy:
      "Le taux, l'amortissement, les frais d'acquisition et le revenu net servent uniquement à cette simulation et ne sont pas enregistrés.",
    disclaimer:
      "Aucun engagement de financement ni conseil de crédit individuel. Les banques évaluent chaque dossier individuellement.",
  },

  en: {
    eyebrow:
      "GERMANY FINANCING CHECK",
    title:
      "Simulate buyer financing",
    description:
      "Non-binding orientation for equity, acquisition costs and the initial mortgage payment.",
    equity:
      "Equity in EUR",
    ancillary:
      "Acquisition costs in %",
    interest:
      "Borrowing rate p.a. in %",
    repayment:
      "Initial repayment p.a. in %",
    income:
      "Monthly net household income in EUR",
    totalCost:
      "Total acquisition cost",
    ancillaryCost:
      "Acquisition costs",
    financing:
      "Financing requirement",
    equityRatio:
      "Equity ratio",
    recommendedEquity:
      "Indicative equity target",
    annualInterest:
      "Interest / year",
    annualRepayment:
      "Repayment / year",
    monthlyRate:
      "Initial monthly payment",
    paymentRatio:
      "Payment / net income",
    status:
      "Orientation",
    ok:
      "Within the indicative range",
    equityLow:
      "Equity below the indicative level",
    rateHigh:
      "Monthly loan payment relatively high",
    incomplete:
      "Complete the inputs for calculation",
    assumptions:
      "Orientation: equity target of at least acquisition costs plus 20% of the purchase price. The initial payment is calculated from interest and repayment. A 40% share of net household income is only a rough guideline.",
    privacy:
      "Interest, repayment, acquisition costs and net income are used only for this simulation and are not saved with the finance record.",
    disclaimer:
      "No financing commitment and no individual credit advice. Banks assess income, expenses, collateral and other criteria individually.",
  },
} as const;


function parseNumber(
  value: string
): number | null {
  const normalized =
    value
      .trim()
      .replace(/['’\s]/g, "")
      .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed =
    Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}


export default function GermanyFinancingCheck({
  askingPrice,
  equityValue,
  onEquityChange,
  locale,
}: GermanyFinancingCheckProps) {
  const localeKey =
    locale
      .toLowerCase()
      .slice(0, 2) as LocaleKey;

  const text =
    COPY[localeKey] ??
    COPY.de;

  const [ancillaryRate, setAncillaryRate] =
    useState("10");

  const [interestRate, setInterestRate] =
    useState("");

  const [repaymentRate, setRepaymentRate] =
    useState("2");

  const [monthlyNetIncome, setMonthlyNetIncome] =
    useState("");


  const result =
    useMemo(() => {
      const price =
        askingPrice;

      const equity =
        parseNumber(
          equityValue
        );

      const ancillary =
        parseNumber(
          ancillaryRate
        );

      const interest =
        parseNumber(
          interestRate
        );

      const repayment =
        parseNumber(
          repaymentRate
        );

      const netIncome =
        parseNumber(
          monthlyNetIncome
        );

      if (
        price === null ||
        price <= 0 ||
        equity === null ||
        equity < 0 ||
        ancillary === null ||
        ancillary < 0 ||
        interest === null ||
        interest < 0 ||
        repayment === null ||
        repayment < 0 ||
        netIncome === null ||
        netIncome <= 0
      ) {
        return null;
      }

      const ancillaryCosts =
        price *
        (ancillary / 100);

      const totalCost =
        price +
        ancillaryCosts;

      const financingRequirement =
        Math.max(
          0,
          totalCost - equity
        );

      const equityRatio =
        totalCost > 0
          ? (
              equity /
              totalCost
            ) * 100
          : 0;

      const recommendedEquity =
        ancillaryCosts +
        price * 0.20;

      const annualInterest =
        financingRequirement *
        (interest / 100);

      const annualRepayment =
        financingRequirement *
        (repayment / 100);

      const annualPayment =
        annualInterest +
        annualRepayment;

      const monthlyRate =
        annualPayment / 12;

      const paymentRatio =
        (
          monthlyRate /
          netIncome
        ) * 100;

      const equityOk =
        equity >=
        recommendedEquity;

      const affordabilityOk =
        paymentRatio <= 40;

      return {
        ancillaryCosts,
        totalCost,
        financingRequirement,
        equityRatio,
        recommendedEquity,
        annualInterest,
        annualRepayment,
        monthlyRate,
        paymentRatio,
        equityOk,
        affordabilityOk,
      };
    }, [
      askingPrice,
      equityValue,
      ancillaryRate,
      interestRate,
      repaymentRate,
      monthlyNetIncome,
    ]);


  function formatMoney(
    value: number
  ) {
    const localeMap:
      Record<
        LocaleKey,
        string
      > = {
        de: "de-DE",
        it: "it-IT",
        fr: "fr-FR",
        en: "en-DE",
      };

    return new Intl.NumberFormat(
      localeMap[localeKey] ??
        "de-DE",
      {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }
    ).format(value);
  }


  const inputClass =
    "min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition focus:border-emerald-300";


  return (
    <section
      data-section="FINANCING-CHECK-DE-V1"
      className="mt-8 rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-slate-950/95 via-[#071b26] to-[#083c38] p-6 shadow-2xl shadow-black/20 sm:p-8 lg:col-span-2 lg:p-10"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
        {text.eyebrow}
      </p>

      <h3 className="mt-2 text-xl font-black">
        {text.title}
      </h3>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        {text.description}
      </p>


      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-200">
            {text.equity}
          </span>

          <input
            inputMode="decimal"
            value={equityValue}
            onChange={(event) =>
              onEquityChange(
                event.target.value
              )
            }
            placeholder="100000"
            className={inputClass}
          />
        </label>


        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-200">
            {text.ancillary}
          </span>

          <input
            inputMode="decimal"
            value={ancillaryRate}
            onChange={(event) =>
              setAncillaryRate(
                event.target.value
              )
            }
            placeholder="10"
            className={inputClass}
          />
        </label>


        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-200">
            {text.interest}
          </span>

          <input
            inputMode="decimal"
            value={interestRate}
            onChange={(event) =>
              setInterestRate(
                event.target.value
              )
            }
            placeholder="3,5"
            className={inputClass}
          />
        </label>


        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-200">
            {text.repayment}
          </span>

          <input
            inputMode="decimal"
            value={repaymentRate}
            onChange={(event) =>
              setRepaymentRate(
                event.target.value
              )
            }
            placeholder="2"
            className={inputClass}
          />
        </label>


        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-200">
            {text.income}
          </span>

          <input
            inputMode="decimal"
            value={monthlyNetIncome}
            onChange={(event) =>
              setMonthlyNetIncome(
                event.target.value
              )
            }
            placeholder="5000"
            className={inputClass}
          />
        </label>
      </div>


      <div className="mt-8 rounded-[24px] border border-emerald-300/20 bg-emerald-300/[0.045] p-5 sm:p-6">
        {result ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Summary
                label={text.ancillaryCost}
                value={formatMoney(
                  result.ancillaryCosts
                )}
              />

              <Summary
                label={text.totalCost}
                value={formatMoney(
                  result.totalCost
                )}
              />

              <Summary
                label={text.financing}
                value={formatMoney(
                  result.financingRequirement
                )}
              />

              <Summary
                label={text.equityRatio}
                value={
                  result.equityRatio.toFixed(
                    1
                  ) + " %"
                }
              />

              <Summary
                label={
                  text.recommendedEquity
                }
                value={formatMoney(
                  result.recommendedEquity
                )}
              />

              <Summary
                label={text.annualInterest}
                value={formatMoney(
                  result.annualInterest
                )}
              />

              <Summary
                label={text.annualRepayment}
                value={formatMoney(
                  result.annualRepayment
                )}
              />

              <Summary
                label={text.monthlyRate}
                value={formatMoney(
                  result.monthlyRate
                )}
              />

              <Summary
                label={text.paymentRatio}
                value={
                  result.paymentRatio.toFixed(
                    1
                  ) + " %"
                }
              />
            </div>


            <div
              className={
                "mt-5 rounded-xl border p-4 " +
                (
                  !result.equityOk
                    ? "border-amber-400/30 bg-amber-400/[0.08]"
                    : result.affordabilityOk
                      ? "border-emerald-400/30 bg-emerald-400/[0.08]"
                      : "border-orange-400/30 bg-orange-400/[0.08]"
                )
              }
            >
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                {text.status}
              </p>

              <p className="mt-2 font-black">
                {!result.equityOk
                  ? text.equityLow
                  : result.affordabilityOk
                    ? text.ok
                    : text.rateHigh}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm font-bold text-slate-300">
            {text.incomplete}
          </p>
        )}
      </div>


      <p className="mt-5 text-xs leading-5 text-slate-400">
        {text.assumptions}
      </p>

      <p className="mt-3 text-xs leading-5 text-emerald-200/65">
        {text.privacy}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {text.disclaimer}
      </p>
    </section>
  );
}


function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-black text-white">
        {value}
      </p>
    </div>
  );
}