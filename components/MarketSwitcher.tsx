"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";


type InseratAiMarket =
  | "CH"
  | "DE";

type MarketCode =
  | "CH"
  | "DE"
  | "AT";


const STORAGE_KEY =
  "inseratAiMarket";


const markets = [
  {
    code: "CH" as const,
    name: "Inserat-AI Schweiz",
    domain: "inserat-ai.ch",
    enabled: true,
  },
  {
    code: "DE" as const,
    name: "Inserat-AI Deutschland",
    domain: "inserat-ai.de",
    enabled: true,
  },
  {
    code: "AT" as const,
    name: "Inserat-AI Österreich",
    domain: "inserat-ai.at",
    enabled: false,
  },
];


function detectDomainMarket():
  MarketCode | null {

  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const hostname =
    window.location.hostname
      .toLowerCase();

  if (
    hostname === "inserat-ai.de" ||
    hostname.endsWith(
      ".inserat-ai.de"
    )
  ) {
    return "DE";
  }

  if (
    hostname === "inserat-ai.ch" ||
    hostname.endsWith(
      ".inserat-ai.ch"
    )
  ) {
    return "CH";
  }

  if (
    hostname === "inserat-ai.at" ||
    hostname.endsWith(
      ".inserat-ai.at"
    )
  ) {
    return "AT";
  }

  return null;
}


function isInseratAiDomain(
  hostname: string
) {
  return (
    hostname === "inserat-ai.ch" ||
    hostname.endsWith(
      ".inserat-ai.ch"
    ) ||
    hostname === "inserat-ai.de" ||
    hostname.endsWith(
      ".inserat-ai.de"
    ) ||
    hostname === "inserat-ai.at" ||
    hostname.endsWith(
      ".inserat-ai.at"
    )
  );
}


function MarketFlag({
  code,
}: {
  code: MarketCode;
}) {

  if (code === "CH") {
    return (
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          display: "inline-block",
          width: "28px",
          height: "19px",
          flex: "0 0 28px",
          overflow: "hidden",
          borderRadius: "4px",
          background: "#e21b2d",
          boxShadow:
            "0 3px 10px rgba(0,0,0,.24)",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "11px",
            top: "4px",
            width: "6px",
            height: "11px",
            background: "#ffffff",
          }}
        />

        <span
          style={{
            position: "absolute",
            left: "8px",
            top: "7px",
            width: "12px",
            height: "5px",
            background: "#ffffff",
          }}
        />
      </span>
    );
  }


  if (code === "DE") {
    return (
      <span
        aria-hidden="true"
        style={{
          display: "inline-grid",
          width: "28px",
          height: "19px",
          flex: "0 0 28px",
          overflow: "hidden",
          borderRadius: "4px",
          gridTemplateRows:
            "repeat(3, 1fr)",
          boxShadow:
            "0 3px 10px rgba(0,0,0,.24)",
        }}
      >
        <span
          style={{
            background: "#111111",
          }}
        />

        <span
          style={{
            background: "#dd0000",
          }}
        />

        <span
          style={{
            background: "#ffce00",
          }}
        />
      </span>
    );
  }


  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-grid",
        width: "28px",
        height: "19px",
        flex: "0 0 28px",
        overflow: "hidden",
        borderRadius: "4px",
        gridTemplateRows:
          "repeat(3, 1fr)",
        boxShadow:
          "0 3px 10px rgba(0,0,0,.24)",
      }}
    >
      <span
        style={{
          background: "#ed2939",
        }}
      />

      <span
        style={{
          background: "#ffffff",
        }}
      />

      <span
        style={{
          background: "#ed2939",
        }}
      />
    </span>
  );
}


/*
 * GLOBAL_INSERAT_AI_MARKET_SWITCHER_V6
 *
 * Der aktive Markt ist Teil der Marke:
 *
 * Inserat-AI Schweiz
 * Inserat-AI Deutschland
 * Inserat-AI Österreich
 */
export default function MarketSwitcher() {

  const [
    market,
    setMarket,
  ] =
    useState<InseratAiMarket>(
      "CH"
    );

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const rootRef =
    useRef<HTMLDivElement>(
      null
    );


  useEffect(() => {

    const detected =
      detectDomainMarket();


    /*
     * Landesdomain gewinnt immer.
     */
    if (
      detected === "CH" ||
      detected === "DE"
    ) {
      localStorage.setItem(
        STORAGE_KEY,
        detected
      );

      setMarket(
        detected
      );

      return;
    }


    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (
      saved === "CH" ||
      saved === "DE"
    ) {
      setMarket(
        saved
      );
    }

  }, []);


  useEffect(() => {

    function closeOutside(
      event: MouseEvent
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }


    document.addEventListener(
      "mousedown",
      closeOutside
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        closeOutside
      );
    };

  }, []);


  const current =
    markets.find(
      item =>
        item.code === market
    ) ??
    markets[0];


  const orderedMarkets =
    useMemo(
      () =>
        [
          ...markets,
        ].sort(
          (
            a,
            b
          ) => {

            if (
              a.code === market
            ) {
              return -1;
            }

            if (
              b.code === market
            ) {
              return 1;
            }

            return 0;
          }
        ),
      [
        market,
      ]
    );


  function selectMarket(
    nextMarket:
      InseratAiMarket
  ) {

    setOpen(false);


    if (
      nextMarket === market
    ) {
      return;
    }


    localStorage.setItem(
      STORAGE_KEY,
      nextMarket
    );


    window.dispatchEvent(
      new CustomEvent(
        "inserat-ai-market-change",
        {
          detail: {
            market:
              nextMarket,
          },
        }
      )
    );


    const hostname =
      window.location.hostname
        .toLowerCase();


    /*
     * Auf den echten Landesdomains
     * später direkt zur entsprechenden
     * Domain wechseln.
     */
    if (
      isInseratAiDomain(
        hostname
      )
    ) {

      const destination =
        markets.find(
          item =>
            item.code ===
            nextMarket
        );


      if (destination) {

        const url =
          new URL(
            window.location.href
          );

        url.hostname =
          destination.domain;

        window.location.href =
          url.toString();

        return;
      }
    }


    /*
     * localhost
     */
    window.location.reload();
  }


  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        minWidth: 0,
        zIndex: 350,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() =>
          setOpen(
            value => !value
          )
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "9px",
          maxWidth: "330px",
          padding: "6px 4px",
          border: 0,
          background: "transparent",
          color: "#ffffff",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <MarketFlag
          code={current.code}
        />


        <span
          style={{
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "21px",
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing:
              "-0.025em",
          }}
        >
          {current.name}
        </span>


        <span
          aria-hidden="true"
          style={{
            marginLeft: "2px",
            color: "#f5bd21",
            fontSize: "10px",
            transform: open
              ? "rotate(180deg)"
              : "rotate(0deg)",
            transition:
              "transform 150ms ease",
          }}
        >
          ▼
        </span>
      </button>


      {open && (
        <div
          style={{
            position: "absolute",
            top:
              "calc(100% + 10px)",
            left: 0,
            width: "285px",
            padding: "7px",
            border:
              "1px solid rgba(255,255,255,.09)",
            borderRadius: "15px",
            background:
              "linear-gradient(155deg, rgba(8,17,39,.995), rgba(4,10,27,.995))",
            boxShadow:
              "0 22px 55px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.04)",
            boxSizing:
              "border-box",
          }}
        >
          {orderedMarkets.map(
            item => {

              const active =
                item.code ===
                market;

              const disabled =
                !item.enabled;


              return (
                <button
                  key={item.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => {

                    if (
                      item.code ===
                        "CH" ||
                      item.code ===
                        "DE"
                    ) {
                      selectMarket(
                        item.code
                      );
                    }

                  }}
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    display: "grid",
                    gridTemplateColumns:
                      "32px minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: "10px",
                    padding: "7px 9px",
                    border: active
                      ? "1px solid rgba(245,189,33,.52)"
                      : "1px solid transparent",
                    borderRadius: "11px",
                    background: active
                      ? "rgba(245,189,33,.07)"
                      : "transparent",
                    color: "#ffffff",
                    cursor: disabled
                      ? "not-allowed"
                      : "pointer",
                    opacity: disabled
                      ? 0.42
                      : 1,
                    textAlign: "left",
                  }}
                >
                  <MarketFlag
                    code={item.code}
                  />


                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "12px",
                      fontWeight: 850,
                    }}
                  >
                    {item.name}
                  </span>


                  {active ? (
                    <span
                      style={{
                        color: "#f5bd21",
                        fontSize: "14px",
                        fontWeight: 950,
                      }}
                    >
                      ✓
                    </span>
                  ) : disabled ? (
                    <span
                      style={{
                        color:
                          "rgba(255,255,255,.40)",
                        fontSize: "8px",
                        fontWeight: 900,
                      }}
                    >
                      BALD
                    </span>
                  ) : null}
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
