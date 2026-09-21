import Link from "next/link";
import ObjectActivityTimeline from "./ObjectActivityTimeline";


type Props = {
  listingId:
    string;

  createdAt:
    string;

  archived:
    boolean;

  market:
    string;

  propertyType:
    string;

  location:
    string;

  rooms:
    number |
    null;

  livingArea:
    number |
    null;

  price:
    number |
    null;

  imageCount:
    number;

  coreDataReady:
    boolean;

  imagesReady:
    boolean;

  listingTextReady:
    boolean;
};


function buildObjectNumber(
  listingId:
    string,
  createdAt:
    string
) {

  const date =
    new Date(
      createdAt
    );


  const year =
    Number.isNaN(
      date.getTime()
    )
      ? new Date()
          .getFullYear()
      : date.getFullYear();


  const suffix =
    listingId
      .replace(
        /[^a-z0-9]/gi,
        ""
      )
      .slice(
        -7
      )
      .toUpperCase();


  return [
    "IA",
    year,
    suffix,
  ].join(
    "-"
  );
}


function formatNumber(
  value:
    number |
    null
) {

  if (
    value ===
      null ||
    !Number.isFinite(
      value
    )
  ) {
    return "–";
  }


  return new Intl.NumberFormat(
    "de-CH",
    {
      maximumFractionDigits:
        1,
    }
  ).format(
    value
  );
}


function formatPrice(
  value:
    number |
    null,
  market:
    string
) {

  if (
    value ===
      null ||
    !Number.isFinite(
      value
    )
  ) {
    return "Preis offen";
  }


  return new Intl.NumberFormat(
    market ===
      "DE"
      ? "de-DE"
      : "de-CH",
    {
      style:
        "currency",

      currency:
        market ===
          "DE"
          ? "EUR"
          : "CHF",

      maximumFractionDigits:
        0,
    }
  ).format(
    value
  );
}


export default function ObjectCommandCenterV2(
  props:
    Props
) {

  /*
   * OBJECT_COMMAND_CENTER_V2
   *
   * Kein neuer Workflow-State.
   * Verwendet nur bereits vorhandene
   * Cockpit-Fakten.
   */

  const completedSteps =
    [
      props.coreDataReady,
      props.imagesReady,
      props.listingTextReady,
    ].filter(
      Boolean
    ).length;


  const totalSteps =
    3;


  const completionPercent =
    Math.round(
      (
        completedSteps /
        totalSteps
      ) *
      100
    );


  const packageReady =
    completedSteps ===
      totalSteps;


  const objectNumber =
    buildObjectNumber(
      props.listingId,
      props.createdAt
    );


  const statusLabel =
    props.archived
      ? "Archiviert"
      : packageReady
        ? "Bereit zur Veröffentlichung"
        : "In Bearbeitung";


  const statusColor =
    props.archived
      ? "#cbd5e1"
      : packageReady
        ? "#86efac"
        : "#67e8f9";


  const primaryHref =
    props.archived
      ? "/cockpit/" +
        encodeURIComponent(
          props.listingId
        ) +
        "/edit"
      : packageReady
        ? "/cockpit/" +
          encodeURIComponent(
            props.listingId
          ) +
          "#portal-publishing"
        : "/cockpit/" +
          encodeURIComponent(
            props.listingId
          ) +
          "/edit";


  const primaryLabel =
    props.archived
      ? "Objekt öffnen →"
      : packageReady
        ? "Jetzt veröffentlichen →"
        : "Objekt fertigstellen →";


  const steps =
    [
      {
        label:
          "Daten",

        ready:
          props.coreDataReady,

        detail:
          props.coreDataReady
            ? "Bereit"
            : "Offen",
      },

      {
        label:
          "Bilder",

        ready:
          props.imagesReady,

        detail:
          props.imagesReady
            ? props.imageCount +
              " vorhanden"
            : "Offen",
      },

      {
        label:
          "Inserat",

        ready:
          props.listingTextReady,

        detail:
          props.listingTextReady
            ? "Bereit"
            : "Offen",
      },

      {
        label:
          "Publishing",

        ready:
          false,

        detail:
          packageReady
            ? "Bereit"
            : "Danach",
      },
    ];


  return (
    <section
      style={{
        marginBottom:
          "18px",

        padding:
          "20px",

        border:
          "1px solid rgba(56,189,248,.22)",

        borderRadius:
          "20px",

        background:
          "linear-gradient(135deg, rgba(8,47,73,.58), rgba(15,23,42,.94) 54%, rgba(124,45,18,.30))",

        boxShadow:
          "0 18px 60px rgba(2,6,23,.28)",
      }}
    >
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            "18px",

          alignItems:
            "flex-start",

          flexWrap:
            "wrap",
        }}
      >
        <div
          style={{
            minWidth:
              0,

            flex:
              "1 1 520px",
          }}
        >
          <div
            style={{
              display:
                "flex",

              gap:
                "8px",

              alignItems:
                "center",

              flexWrap:
                "wrap",

              marginBottom:
                "9px",
            }}
          >
            <span
              style={{
                padding:
                  "5px 8px",

                borderRadius:
                  "999px",

                background:
                  "rgba(251,191,36,.10)",

                border:
                  "1px solid rgba(251,191,36,.24)",

                color:
                  "#fde68a",

                fontSize:
                  "10px",

                fontWeight:
                  950,

                letterSpacing:
                  ".08em",
              }}
            >
              {objectNumber}
            </span>

            <span
              style={{
                padding:
                  "5px 8px",

                borderRadius:
                  "999px",

                background:
                  "rgba(15,23,42,.58)",

                border:
                  "1px solid rgba(148,163,184,.18)",

                color:
                  statusColor,

                fontSize:
                  "10px",

                fontWeight:
                  950,
              }}
            >
              {statusLabel}
            </span>
          </div>


          <h1
            style={{
              margin:
                0,

              color:
                "#f8fafc",

              fontSize:
                "clamp(24px, 3vw, 36px)",

              lineHeight:
                1.05,

              letterSpacing:
                "-.035em",
            }}
          >
            {props.rooms !== null
              ? formatNumber(
                  props.rooms
                ) +
                "-Zimmer-"
              : ""}
            {props.propertyType} in{" "}
            {props.location}
          </h1>


          <div
            style={{
              display:
                "flex",

              gap:
                "12px",

              alignItems:
                "center",

              flexWrap:
                "wrap",

              marginTop:
                "10px",

              color:
                "#cbd5e1",

              fontSize:
                "13px",
            }}
          >
            <span>
              {formatNumber(
                props.livingArea
              )}{" "}
              m²
            </span>

            <span
              style={{
                color:
                  "rgba(148,163,184,.40)",
              }}
            >
              •
            </span>

            <strong
              style={{
                color:
                  "#fbbf24",

                fontSize:
                  "16px",
              }}
            >
              {formatPrice(
                props.price,
                props.market
              )}
            </strong>
          </div>
        </div>


        <div
          style={{
            display:
              "flex",

            gap:
              "8px",

            flexWrap:
              "wrap",

            justifyContent:
              "flex-end",
          }}
        >
          <Link
            href={
              "/cockpit/" +
              encodeURIComponent(
                props.listingId
              ) +
              "/edit"
            }
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              minHeight:
                "42px",

              padding:
                "0 14px",

              border:
                "1px solid rgba(148,163,184,.22)",

              borderRadius:
                "11px",

              background:
                "rgba(15,23,42,.56)",

              color:
                "#e2e8f0",

              fontSize:
                "12px",

              fontWeight:
                850,

              textDecoration:
                "none",
            }}
          >
            Bearbeiten
          </Link>


          <Link
            href={
              "/cockpit/" +
              encodeURIComponent(
                props.listingId
              ) +
              "/abschlussprotokoll"
            }
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              minHeight:
                "42px",

              padding:
                "0 14px",

              border:
                "1px solid rgba(251,191,36,.24)",

              borderRadius:
                "11px",

              background:
                "rgba(251,191,36,.07)",

              color:
                "#fde68a",

              fontSize:
                "12px",

              fontWeight:
                850,

              textDecoration:
                "none",
            }}
          >
            Protokoll
          </Link>


          <Link
            href={
              primaryHref
            }
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              minHeight:
                "42px",

              padding:
                "0 17px",

              border:
                0,

              borderRadius:
                "11px",

              background:
                props.archived
                  ? "rgba(148,163,184,.24)"
                  : "linear-gradient(135deg, #facc15, #f97316)",

              color:
                props.archived
                  ? "#e2e8f0"
                  : "#111827",

              fontSize:
                "12px",

              fontWeight:
                950,

              textDecoration:
                "none",

              boxShadow:
                props.archived
                  ? "none"
                  : "0 12px 28px rgba(249,115,22,.20)",
            }}
          >
            {primaryLabel}
          </Link>
        </div>
      </div>


      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "minmax(170px, .75fr) minmax(0, 2.25fr)",

          gap:
            "14px",

          alignItems:
            "stretch",

          marginTop:
            "18px",
        }}
      >
        <div
          style={{
            padding:
              "13px",

            border:
              "1px solid rgba(255,255,255,.08)",

            borderRadius:
              "13px",

            background:
              "rgba(15,23,42,.40)",
          }}
        >
          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              gap:
                "8px",

              marginBottom:
                "8px",

              fontSize:
                "11px",
            }}
          >
            <span
              style={{
                color:
                  "#94a3b8",

                fontWeight:
                  800,
              }}
            >
              Objektpaket
            </span>

            <strong
              style={{
                color:
                  packageReady
                    ? "#86efac"
                    : "#67e8f9",
              }}
            >
              {completionPercent} %
            </strong>
          </div>


          <div
            style={{
              height:
                "7px",

              overflow:
                "hidden",

              borderRadius:
                "999px",

              background:
                "rgba(148,163,184,.14)",
            }}
          >
            <div
              style={{
                width:
                  completionPercent +
                  "%",

                height:
                  "100%",

                borderRadius:
                  "999px",

                background:
                  packageReady
                    ? "linear-gradient(90deg, #22c55e, #86efac)"
                    : "linear-gradient(90deg, #06b6d4, #38bdf8)",

                transition:
                  "width .25s ease",
              }}
            />
          </div>


          <div
            style={{
              marginTop:
                "8px",

              color:
                "#64748b",

              fontSize:
                "10px",
            }}
          >
            {completedSteps} von {totalSteps} Kernbereichen bereit
          </div>
        </div>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(4, minmax(120px, 1fr))",

            gap:
              "8px",
          }}
        >
          {steps.map(
            (
              step
            ) => (

              <div
                key={
                  step.label
                }
                style={{
                  padding:
                    "11px 12px",

                  border:
                    step.ready
                      ? "1px solid rgba(34,197,94,.20)"
                      : "1px solid rgba(148,163,184,.12)",

                  borderRadius:
                    "12px",

                  background:
                    step.ready
                      ? "rgba(20,83,45,.12)"
                      : "rgba(15,23,42,.34)",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    gap:
                      "7px",

                    alignItems:
                      "center",
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#f8fafc",

                      fontSize:
                        "11px",
                    }}
                  >
                    {step.label}
                  </strong>

                  <span
                    style={{
                      color:
                        step.ready
                          ? "#86efac"
                          : "#64748b",

                      fontSize:
                        "12px",

                      fontWeight:
                        950,
                    }}
                  >
                    {step.ready
                      ? "✓"
                      : "·"}
                  </span>
                </div>

                <div
                  style={{
                    marginTop:
                      "5px",

                    color:
                      step.ready
                        ? "#86efac"
                        : "#94a3b8",

                    fontSize:
                      "10px",

                    fontWeight:
                      750,
                  }}
                >
                  {step.detail}
                </div>
              </div>
            )
          )}
        </div>
      </div>


      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            "12px",

          alignItems:
            "center",

          flexWrap:
            "wrap",

          marginTop:
            "12px",

          paddingTop:
            "11px",

          borderTop:
            "1px solid rgba(255,255,255,.07)",
        }}
      >
        <span
          style={{
            color:
              "#64748b",

            fontSize:
              "10px",
          }}
        >
          Performance erscheint hier automatisch nach Veröffentlichung.
        </span>

        {!props.archived && (
          <strong
            style={{
              color:
                packageReady
                  ? "#86efac"
                  : "#fde68a",

              fontSize:
                "10px",
            }}
          >
            {packageReady
              ? "Nächster Schritt: veröffentlichen"
              : "Nächster Schritt: Objektpaket vervollständigen"}
          </strong>
        )}
      </div>

      <ObjectActivityTimeline
        listingId={
          props.listingId
        }
      />
</section>
  );
}
