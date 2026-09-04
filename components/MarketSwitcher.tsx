"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";


type SelectableMarket =
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
    domain: "www.inserat-ai.ch",
    enabled: true,
  },
  {
    code: "DE" as const,
    name: "Inserat-AI Deutschland",
    domain: "www.inserat-ai.de",
    enabled: true,
  },
  {
    code: "AT" as const,
    name: "Inserat-AI Österreich",
    domain: "www.inserat-ai.at",
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
    hostname ===
      "inserat-ai.de" ||
    hostname.endsWith(
      ".inserat-ai.de"
    )
  ) {
    return "DE";
  }


  if (
    hostname ===
      "inserat-ai.ch" ||
    hostname.endsWith(
      ".inserat-ai.ch"
    )
  ) {
    return "CH";
  }


  if (
    hostname ===
      "inserat-ai.at" ||
    hostname.endsWith(
      ".inserat-ai.at"
    )
  ) {
    return "AT";
  }


  return null;
}


/*
 * COUNTRY_DOMAIN_MARKET_SWITCHER_V8
 *
 * Der Landesname bleibt ohne Flagge
 * und ohne Dropdown-Pfeil.
 *
 * Der Name ist auf localhost sowie
 * auf den echten Landesdomains anklickbar.
 *
 * Ein Marktwechsel auf einer Landesdomain
 * führt zur entsprechenden Webadresse.
 */
export default function MarketSwitcher() {

  const [
    market,
    setMarket,
  ] =
    useState<SelectableMarket>(
      "CH"
    );


  const [
    domainMarket,
    setDomainMarket,
  ] =
    useState<MarketCode | null>(
      null
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


    setDomainMarket(
      detected
    );


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


  const displayMarket =
    domainMarket ??
    market;


  const current =
    markets.find(
      item =>
        item.code ===
        displayMarket
    ) ??
    markets[0];


  const orderedMarkets =
    useMemo(
      () => {

        return [
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
        );

      },
      [
        market,
      ]
    );


  function selectMarket(
    nextMarket:
      SelectableMarket
  ) {

    setOpen(false);


    if (
      nextMarket ===
      market
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


    if (
      domainMarket
    ) {

      const destination =
        markets.find(
          item =>
            item.code ===
            nextMarket
        );


      if (
        destination
      ) {

        const url =
          new URL(
            window.location.href
          );

        url.protocol =
          "https:";

        url.hostname =
          destination.domain;

        url.port =
          "";

        window.location.assign(
          url.toString()
        );

        return;
      }

    }


    window.location.reload();
  }


  /*
   * Anklickbarer Marktname ohne
   * Flagge und ohne Pfeil.
   */

  return (
    <div
      ref={rootRef}
      style={{
        position:
          "relative",
        minWidth:
          0,
        zIndex:
          350,
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-label={`Land wechseln. Aktuell ${current.name}`}
        aria-expanded={open}
        onClick={() =>
          setOpen(
            value =>
              !value
          )
        }
        style={{
          display:
            "inline-flex",
          alignItems:
            "center",
          gap:
            "8px",
          padding:
            "6px 4px",
          border:
            0,
          background:
            "transparent",
          color:
            "#ffffff",
          cursor:
            "pointer",
          textAlign:
            "left",
        }}
      >
        <span
          style={{
            fontSize:
              "21px",
            lineHeight:
              1,
            fontWeight:
              900,
            letterSpacing:
              "-0.025em",
            whiteSpace:
              "nowrap",
          }}
        >
          {current.name}
        </span>
      </button>


      {open && (
        <div
          style={{
            position:
              "absolute",
            top:
              "calc(100% + 10px)",
            left:
              0,
            width:
              "255px",
            padding:
              "7px",
            border:
              "1px solid rgba(255,255,255,.09)",
            borderRadius:
              "15px",
            background:
              "linear-gradient(155deg, rgba(8,17,39,.995), rgba(4,10,27,.995))",
            boxShadow:
              "0 22px 55px rgba(0,0,0,.44)",
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
                      item.code === "CH" ||
                      item.code === "DE"
                    ) {
                      selectMarket(
                        item.code
                      );
                    }

                  }}
                  style={{
                    width:
                      "100%",
                    minHeight:
                      "44px",
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr auto",
                    alignItems:
                      "center",
                    gap:
                      "10px",
                    padding:
                      "8px 10px",
                    border:
                      active
                        ? "1px solid rgba(245,189,33,.52)"
                        : "1px solid transparent",
                    borderRadius:
                      "11px",
                    background:
                      active
                        ? "rgba(245,189,33,.07)"
                        : "transparent",
                    color:
                      "#ffffff",
                    cursor:
                      disabled
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      disabled
                        ? 0.42
                        : 1,
                    textAlign:
                      "left",
                  }}
                >
                  <span
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        850,
                    }}
                  >
                    {item.name}
                  </span>


                  {active ? (
                    <span
                      style={{
                        color:
                          "#f5bd21",
                        fontWeight:
                          950,
                      }}
                    >
                      ✓
                    </span>
                  ) : disabled ? (
                    <span
                      style={{
                        color:
                          "rgba(255,255,255,.40)",
                        fontSize:
                          "8px",
                        fontWeight:
                          900,
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
