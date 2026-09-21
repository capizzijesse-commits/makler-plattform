"use client";


import Link from "next/link";

import BatchPublishingV23
  from "./BatchPublishingV23";


type ActivityItem = {
  id?:
    string;

  kind:
    string;

  severity?:
    "info" |
    "success" |
    "warning" |
    "error";

  status?:
    string |
    null;

  listingId:
    string;

  listingLabel:
    string;

  location:
    string;

  title?:
    string;

  message?:
    string;

  icon?:
    string;

  count:
    number;

  createdAt?:
    string;

  latestAt:
    string;

  unread:
    boolean;

  href:
    string;
};

type PrimaryAction = {
  id:
    string;

  title:
    string;

  location:
    string;

  postalCode:
    string | null;

  rooms:
    number | null;

  livingArea:
    number | null;

  imageUrl:
    string | null;

  href:
    string;

  label:
    string;
};


type Props = {
  market:
    "CH" | "DE";

  displayName:
    string;

  activeCount:
    number;

  readyCount:
    number;

  actionCount:
    number;

  viewsToday:
    number | null;

  primaryAction:
    PrimaryAction | null;

  activityItems:
    ActivityItem[];

  activityLoading:
    boolean;

  activityError:
    string;

  listings:
    any[];
};


export default function CockpitOverviewV3View({
  market,
  displayName,
  activeCount,
  readyCount,
  actionCount,
  viewsToday,
  primaryAction,
  activityItems,
  activityLoading,
  activityError,
  listings,
}: Props) {

  /*
   * COCKPIT_V3_CLEAN
   *
   * Neue visuelle Oberfläche.
   *
   * Bestehende Datenquellen bleiben:
   * - Listings
   * - Analytics
   * - Activity Center
   * - Batch Publishing
   *
   * Keine DB Writes.
   * Kein Auto Dispatch.
   */

  const today =
    new Date();


  const dateLabel =
    today.toLocaleDateString(
      market === "DE"
        ? "de-DE"
        : "de-CH",
      {
        weekday:
          "long",

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    );


  return (
    <main className="cockpitV3">
      <section className="v3Hero">
        <div className="v3HeroShade" />


        <div className="v3HeroCopy">
          <span className="v3Eyebrow">
            {market === "DE"
              ? "INSERAT-AI DEUTSCHLAND"
              : "INSERAT-AI SCHWEIZ"}
          </span>


          <div className="v3HeroHeading">
            <h1>
              Willkommen zurück, {displayName}
            </h1>

            <span className="v3Active">
              <i />
              {activeCount} aktiv
            </span>
          </div>


          <p>
            Mehr Reichweite. Mehr Anfragen.
            Mit KI zu besseren Inseraten.
          </p>
        </div>


        <div className="v3HeroCenter">
          <span>
            Immobilien
            <br />
            haben Zukunft.
          </span>
        </div>


        <div className="v3HeroActions">
          <Link
            href="/dashboard"
            className="v3NewObject"
          >
            <span className="v3Plus">
              +
            </span>

            <strong>
              Neues Objekt
            </strong>

            <span
              className="v3CtaBalance"
              aria-hidden="true"
            />
          </Link>


          <a
            href="#batch-publishing"
            className="v3Publish"
          >
            Veröffentlichen →
          </a>
        </div>
      </section>


      <section className="v3Today">
        <header className="v3TodayHeader">
          <div className="v3TodayTitle">
            <span className="v3Calendar">
              ▣
            </span>

            <div>
              <span className="v3SectionLabel">
                HEUTE
              </span>

              <h2>
                Dein Arbeitstag auf einen Blick
              </h2>

              <p>
                Die wichtigsten Objekte, Aufgaben
                und Aktivitäten – ohne Umwege.
              </p>
            </div>
          </div>


          <div className="v3Date">
            <span className="v3Sun">
              ☀
            </span>

            <div>
              <strong suppressHydrationWarning>
                {dateLabel}
              </strong>

              <small>
                Schön, dass du da bist!
              </small>
            </div>
          </div>
        </header>


        <div className="v3Kpis">
          <article className="blue">
            <span className="v3KpiIcon">
              ▤
            </span>

            <div>
              <strong>
                {activeCount}
              </strong>

              <b>
                Aktive Objekte
              </b>

              <small>
                aktuell im Bestand
              </small>
            </div>

            <i>›</i>
          </article>


          <article className="green">
            <span className="v3KpiIcon">
              ✓
            </span>

            <div>
              <strong>
                {readyCount}
              </strong>

              <b>
                Paket bereit
              </b>

              <small>
                Text + Bilder vorhanden
              </small>
            </div>

            <i>›</i>
          </article>


          <article className="orange">
            <span className="v3KpiIcon">
              !
            </span>

            <div>
              <strong>
                {actionCount}
              </strong>

              <b>
                Aktion nötig
              </b>

              <small>
                Inhalt oder Bilder fehlen
              </small>
            </div>

            <i>›</i>
          </article>


          <article className="violet">
            <span className="v3KpiIcon">
              ◉
            </span>

            <div>
              <strong>
                {viewsToday ?? "–"}
              </strong>

              <b>
                Aufrufe heute
              </b>

              <small>
                echte Inserat-AI-Aufrufe
              </small>
            </div>

            <i>›</i>
          </article>
        </div>
      </section>


      <section className="v3WorkGrid">
        <article className="v3WorkCard">
          <header className="v3CardHeader">
            <div>
              <span className="v3Lightning">
                ⚡
              </span>

              <strong>
                JETZT ERLEDIGEN
              </strong>
            </div>

            {primaryAction && (
              <span className="v3Warning">
                ◉ Aktion nötig
              </span>
            )}
          </header>


          {primaryAction ? (
            <div className="v3Object">
              <div
                className={
                  primaryAction.imageUrl
                    ? "v3ObjectImage hasImage"
                    : "v3ObjectImage"
                }
                aria-hidden="true"
                style={
                  primaryAction.imageUrl
                    ? {
                        backgroundImage:
                          `linear-gradient(
                            180deg,
                            rgba(5,28,50,.03),
                            rgba(5,28,50,.12)
                          ),
                          url("${primaryAction.imageUrl}")`,
                      }
                    : undefined
                }
              >
                <span className="v3HousePlaceholder">
                  <i className="v3HouseRoof" />
                  <i className="v3HouseBody" />
                  <i className="v3HouseDoor" />
                </span>
              </div>


              <div className="v3ObjectBody">
                <h3>
                  {primaryAction.title}
                </h3>

                <p>
                  Dieses Objekt benötigt noch einen
                  Schritt, bevor es vollständig
                  vorbereitet ist.
                </p>


                <div className="v3ObjectMeta">
                  <span>
                    ⌖{" "}
                    {primaryAction.postalCode
                      ? primaryAction.postalCode + " "
                      : ""}
                    {primaryAction.location}
                  </span>

                  <span>
                    ⌂{" "}
                    {primaryAction.rooms ?? "–"} Zi.
                  </span>

                  <span>
                    ◫{" "}
                    {primaryAction.livingArea ?? "–"} m²
                  </span>
                </div>


                <Link
                  href={primaryAction.href}
                  className="v3ObjectAction"
                >
                  {primaryAction.label} →
                </Link>
              </div>
            </div>
          ) : (
            <div className="v3NoObject">
              Alles erledigt. Du kannst direkt ein
              neues Objekt starten.
            </div>
          )}
        </article>


        <article className="v3Activity">
          <header className="v3CardHeader">
            <div>
              <span className="v3Bars">
                ▥
              </span>

              <strong>
                AKTIVITÄT
              </strong>
            </div>
          </header>


          <h3>
            Was passiert gerade?
          </h3>


          {activityLoading ? (
            <div className="v3ActivityEmpty">
              Aktivitäten werden geladen…
            </div>
          ) : activityError ? (
            <div className="v3ActivityEmpty">
              {activityError}
            </div>
          ) : activityItems.length === 0 ? (
            <div className="v3ActivityEmpty">
              <span className="v3Inbox">
                ▱
              </span>

              <p>
                Heute gibt es noch keine neue
                Objektaktivität.
              </p>
            </div>
          ) : (
            <div className="v3ActivityList">
              {activityItems
                .slice(0, 4)
                .map(
                  (item) => (
                    <Link
                      key={
                        item.id ??
                        (
                          item.listingId +
                          item.latestAt
                        )
                      }
                      href={
                        item.href ||
                        "/cockpit/" +
                          item.listingId
                      }
                    >
                      <span>
                        {item.kind === "views"
                          ? item.listingLabel
                          : (
                              (item.icon
                                ? item.icon + " "
                                : "") +
                              (
                                item.title ??
                                item.listingLabel
                              )
                            )}
                      </span>

                      <strong>
                        {item.kind === "views"
                          ? item.count
                          : item.severity === "success"
                            ? "✓"
                            : item.severity === "error"
                              ? "!"
                              : item.severity === "warning"
                                ? "!"
                                : "→"}
                      </strong>
                    </Link>
                  )
                )}
            </div>
          )}
        </article>
      </section>


      <section className="v3Portals">
        <header>
          <div className="v3PortalTitle">
            <span className="v3PortalIcon">
              ⇄
            </span>

            <div>
              <h2>
                Portal-Verbindungen
              </h2>

              <p>
                Freigaben und technische Details
              </p>
            </div>
          </div>

          <a href="#batch-publishing">
            Portale verwalten →
          </a>
        </header>


        {/* COCKPIT_V36_MARKET_PORTALS */}
        <div className="v3PortalLogos">
          {market === "CH" ? (
            <>
              <div>
                <span className="logoScout">
                  <b>Immo</b>
                  Scout24
                </span>
              </div>


              <div>
                <span className="logoHomegate">
                  <b>✕</b>
                  homegate
                </span>
              </div>


              <div>
                <span className="logoComparis">
                  ✓comparis
                </span>
              </div>


              <div>
                <span className="logoNewhome">
                  <b>new</b>
                  home
                </span>
              </div>


              <div>
                <span className="logoFlatfox">
                  <b>F</b>
                  Flatfox
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="logoScout">
                  <b>Immo</b>
                  Scout24
                </span>
              </div>


              <div>
                <span className="logoImmowelt">
                  <b>immo</b>
                  <em>welt</em>
                </span>
              </div>


              <div>
                <span className="logoKlein">
                  <b>♧</b>
                  kleinanzeigen
                </span>
              </div>


              <div>
                <span
                  className="logoImmobilienDe"
                  style={{
                    color: "#17436b",
                    fontSize: "17px",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  immobilien.de
                </span>
              </div>


              <div>
                <span
                  className="logoWgGesucht"
                  style={{
                    color: "#e55225",
                    fontSize: "16px",
                    fontWeight: 900,
                    letterSpacing: "-0.035em",
                    whiteSpace: "nowrap",
                  }}
                >
                  WG-Gesucht.de
                </span>
              </div>
            </>
          )}
        </div>
      </section>


      <section className="v3Publishing">
        <BatchPublishingV23
          listings={listings}
        />
      </section>


      <style jsx>{`
        .cockpitV3 {
          width: 100%;
          padding: 24px 28px 40px;
          background:
            linear-gradient(
              180deg,
              #f7fbff 0%,
              #eef5fb 100%
            );
        }

        .v3Hero {
          position: relative;
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            250px
            205px;
          min-height: 164px;
          align-items: center;
          gap: 22px;
          overflow: hidden;
          padding: 26px 30px;
          border-radius: 22px;
          background:
            linear-gradient(
              105deg,
              rgba(3,23,44,.98) 0%,
              rgba(5,62,99,.92) 51%,
              rgba(5,139,169,.82) 100%
            ),
            url("/cockpit-skyline.png");
          background-size: cover;
          background-position: center right;
          box-shadow:
            0 18px 40px
            rgba(20,55,89,.14);
        }

        .v3HeroShade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              rgba(4,21,39,.78) 0%,
              rgba(4,21,39,.38) 46%,
              rgba(5,118,152,.10) 100%
            );
        }

        .v3HeroCopy,
        .v3HeroCenter,
        .v3HeroActions {
          position: relative;
          z-index: 2;
        }

        .v3Eyebrow {
          display: block;
          margin-bottom: 9px;
          color: #ffd54a;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .16em;
        }

        .v3HeroHeading {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .v3HeroHeading h1 {
          margin: 0;
          color: #fff;
          font-size:
            clamp(27px, 2.5vw, 39px);
          line-height: 1.04;
          letter-spacing: -.035em;
        }

        .v3HeroCopy > p {
          margin: 11px 0 0;
          color: rgba(240,248,255,.86);
          font-size: 12px;
        }

        .v3Active {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border: 1px solid rgba(74,222,128,.28);
          border-radius: 999px;
          background: rgba(22,163,74,.18);
          color: #a7f3c1;
          font-size: 8px;
          font-weight: 900;
        }

        .v3Active i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow:
            0 0 9px rgba(74,222,128,.8);
        }

        .v3HeroCenter {
          color: #fff;
          font-family: Georgia, serif;
          font-size: 21px;
          font-style: italic;
          line-height: 1.15;
          text-align: center;
          transform: rotate(-4deg);
          text-shadow:
            0 3px 10px rgba(0,34,60,.22);
        }

        .v3HeroActions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .v3NewObject {
          position: relative;
          display: flex;
          min-height: 61px;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0 18px;
          border: 1px solid #ffe36a;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #ffe979 0%,
              #ffd54a 39%,
              #ffad20 73%,
              #f18b08 100%
            );
          color: #151b24;
          text-decoration: none;
          text-shadow:
            0 1px 0 rgba(255,255,255,.5);
          box-shadow:
            0 2px 0 #fff3ab inset,
            0 -5px 0 rgba(170,80,0,.30) inset,
            0 7px 0 #ad5700,
            0 15px 28px rgba(255,157,14,.32),
            0 0 28px rgba(255,200,65,.25);
          transform: translateY(-3px);
        }

        .v3NewObject:hover {
          transform:
            translateY(-5px) scale(1.015);
        }

        .v3Plus {
          display: grid;
          width: 37px;
          height: 37px;
          flex: 0 0 37px;
          place-items: center;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #563000,
              #241300
            );
          color: #ffe368;
          font-size: 25px;
          box-shadow:
            0 3px 8px rgba(50,25,0,.28);
        }

        .v3NewObject strong {
          white-space: nowrap;
          font-size: 13px;
          font-weight: 950;
        }

        .v3Publish {
          display: flex;
          min-height: 35px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(210,240,255,.30);
          border-radius: 13px;
          background: rgba(255,255,255,.07);
          color: #fff;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
        }

        .v3Today {
          margin-top: 16px;
          padding: 20px;
          border: 1px solid #e4edf5;
          border-radius: 22px;
          background: #fff;
          box-shadow:
            0 14px 34px rgba(22,57,90,.055);
        }

        .v3TodayHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .v3TodayTitle {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .v3Calendar {
          display: grid;
          width: 45px;
          height: 45px;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              #147fe9,
              #35c9dc
            );
          color: #fff;
          font-size: 18px;
          box-shadow:
            0 8px 18px rgba(20,127,233,.20);
        }

        .v3SectionLabel {
          color: #526c89;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .12em;
        }

        .v3TodayTitle h2 {
          margin: 2px 0 0;
          color: #10233e;
          font-size: 20px;
        }

        .v3TodayTitle p {
          margin: 4px 0 0;
          color: #7c8da1;
          font-size: 10px;
        }

        .v3Date {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 22px;
          border-left: 1px solid #e6edf4;
        }

        .v3Sun {
          color: #ffab16;
          font-size: 26px;
        }

        .v3Date div {
          display: flex;
          flex-direction: column;
        }

        .v3Date strong {
          color: #203650;
          font-size: 9px;
        }

        .v3Date small {
          margin-top: 3px;
          color: #8797aa;
          font-size: 8px;
        }

        .v3Kpis {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .v3Kpis article {
          display: grid;
          min-height: 94px;
          grid-template-columns:
            48px 1fr 14px;
          align-items: center;
          gap: 12px;
          padding: 14px 15px;
          border: 1px solid;
          border-radius: 14px;
        }

        .v3Kpis .blue {
          border-color: #d5e7ff;
          background:
            linear-gradient(135deg,#f7faff,#edf5ff);
        }

        .v3Kpis .green {
          border-color: #d7efdf;
          background:
            linear-gradient(135deg,#f7fdf9,#edf9f3);
        }

        .v3Kpis .orange {
          border-color: #f7dfbd;
          background:
            linear-gradient(135deg,#fffaf3,#fff3e2);
        }

        .v3Kpis .violet {
          border-color: #e9ddff;
          background:
            linear-gradient(135deg,#fbf9ff,#f3edff);
        }

        .v3KpiIcon {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border-radius: 50%;
          font-size: 17px;
          font-weight: 950;
          box-shadow:
            inset 0 0 0 8px rgba(255,255,255,.3);
        }

        .blue .v3KpiIcon {
          background: #dcecff;
          color: #1677e8;
        }

        .green .v3KpiIcon {
          background: #d9f5e5;
          color: #20a35a;
        }

        .orange .v3KpiIcon {
          background: #ffe8c5;
          color: #e9790c;
        }

        .violet .v3KpiIcon {
          background: #eadfff;
          color: #8b4de8;
        }

        .v3Kpis article > div {
          display: flex;
          flex-direction: column;
        }

        .v3Kpis article strong {
          color: #10233e;
          font-size: 23px;
          line-height: 1;
        }

        .v3Kpis article b {
          margin-top: 4px;
          color: #223750;
          font-size: 10px;
        }

        .v3Kpis article small {
          margin-top: 3px;
          color: #8797aa;
          font-size: 8px;
        }

        .v3Kpis article > i {
          font-size: 24px;
          font-style: normal;
        }

        .v3WorkGrid {
          display: grid;
          grid-template-columns:
            minmax(0,1fr) minmax(0,1fr);
          gap: 14px;
          margin-top: 14px;
        }

        .v3WorkCard,
        .v3Activity {
          min-height: 220px;
          padding: 18px;
          border: 1px solid #e4ecf4;
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 10px 28px rgba(22,55,89,.045);
        }

        .v3CardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .v3CardHeader > div {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .v3CardHeader strong {
          color: #526781;
          font-size: 9px;
          letter-spacing: .13em;
        }

        .v3Lightning {
          color: #ff9d17;
          font-size: 24px;
        }

        .v3Bars {
          color: #1595e8;
          font-size: 22px;
        }

        .v3Warning {
          padding: 6px 9px;
          border-radius: 999px;
          background: #fff2db;
          color: #dc7200;
          font-size: 8px;
          font-weight: 900;
        }

        .v3Object {
          display: grid;
          grid-template-columns: 112px 1fr;
          gap: 14px;
          margin-top: 15px;
        }

        .v3ObjectImage {
          display: grid;
          min-height: 104px;
          place-items: center;
          overflow: hidden;
          border-radius: 12px;
          background:
            linear-gradient(
              155deg,
              rgba(157,218,255,.18),
              rgba(91,175,122,.20)
            ),
            url("/cockpit-skyline.png");
          background-size: cover;
          background-position: center;
        }

        .v3ObjectImage span {
          display: none;
        }

        .v3ObjectBody h3 {
          margin: 0;
          color: #10233e;
          font-size: 16px;
        }

        .v3ObjectBody p {
          margin: 8px 0 0;
          color: #72849a;
          font-size: 10px;
          line-height: 1.5;
        }

        .v3ObjectMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 11px;
        }

        .v3ObjectMeta span {
          padding: 6px 9px;
          border: 1px solid #dfe7ef;
          border-radius: 9px;
          background: #f8fbfd;
          color: #425871;
          font-size: 8px;
          font-weight: 800;
        }

        .v3ObjectAction {
          display: inline-flex;
          margin-top: 13px;
          color: #0874df;
          font-size: 10px;
          font-weight: 950;
          text-decoration: none;
        }

        .v3Activity h3 {
          margin: 13px 0 0;
          color: #10233e;
          font-size: 17px;
        }

        .v3ActivityEmpty {
          display: flex;
          min-height: 124px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
          border-radius: 13px;
          background:
            linear-gradient(180deg,#fbfdff,#f3f8fd);
          color: #75889f;
          font-size: 9px;
          text-align: center;
        }

        .v3Inbox {
          display: grid;
          width: 48px;
          height: 35px;
          place-items: center;
          border: 3px solid #bfd4e8;
          border-radius: 8px 8px 12px 12px;
          color: #1383eb;
          font-size: 20px;
          font-weight: 900;
        }

        .v3ActivityEmpty p {
          margin: 0;
        }

        .v3ActivityList {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 12px;
        }

        .v3ActivityList a {
          display: flex;
          min-height: 37px;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px;
          border-radius: 9px;
          background: #f8fbfd;
          color: #243b57;
          font-size: 9px;
          text-decoration: none;
        }

        .v3Portals {
          margin-top: 14px;
          padding: 18px;
          border: 1px solid #e1eaf3;
          border-radius: 19px;
          background: #fff;
          box-shadow:
            0 12px 29px rgba(25,63,99,.05);
        }

        .v3Portals header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .v3PortalTitle {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .v3PortalIcon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 12px;
          background:
            linear-gradient(135deg,#e8f5ff,#dbeeff);
          color: #0d7fe8;
          font-size: 19px;
          font-weight: 950;
        }

        .v3PortalTitle h2 {
          margin: 0;
          color: #10233e;
          font-size: 16px;
        }

        .v3PortalTitle p {
          margin: 3px 0 0;
          color: #7c8da1;
          font-size: 9px;
        }

        .v3Portals header > a {
          color: #0878e4;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
        }

        .v3PortalLogos {
          display: grid;
          grid-template-columns:
            repeat(5,minmax(0,1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .v3PortalLogos > div {
          display: flex;
          min-height: 64px;
          align-items: center;
          justify-content: center;
          padding: 9px;
          border: 1px solid #dfe8f1;
          border-radius: 12px;
          background:
            linear-gradient(180deg,#fff,#f8fbfe);
        }

        .logoScout {
          color: #26313e;
          font-size: 18px;
          font-weight: 650;
          white-space: nowrap;
        }

        .logoScout b {
          margin-right: 2px;
          padding: 3px 5px;
          background: #43e0cb;
          color: #087a77;
          font-weight: 600;
          transform: skew(-7deg);
        }

        .logoHomegate {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #232936;
          font-size: 18px;
          font-weight: 650;
          white-space: nowrap;
        }

        .logoHomegate b {
          color: #ef3340;
          font-size: 27px;
        }

        .logoImmowelt {
          display: inline-flex;
          overflow: hidden;
          border-radius: 999px;
          background: #383d42;
          color: #fff;
          font-size: 15px;
          font-style: normal;
          font-weight: 850;
          white-space: nowrap;
        }

        .logoImmowelt b {
          padding: 7px 3px 7px 10px;
        }

        .logoImmowelt em {
          padding: 7px 10px 7px 3px;
          border-radius: 999px;
          background: #ffc32b;
          color: #353535;
          font-style: normal;
        }

        .logoKlein {
          color: #30753b;
          font-size: 15px;
          font-weight: 650;
          white-space: nowrap;
        }

        .logoKlein b {
          margin-right: 6px;
          color: #68aa59;
          font-size: 25px;
        }

        .logoComparis {
          color: #49ad23;
          font-size: 19px;
          font-weight: 650;
          white-space: nowrap;
        }

        .v3Publishing {
          margin-top: 14px;
        }

        .v3NoObject {
          margin-top: 20px;
          padding: 25px;
          border-radius: 12px;
          background: #f6f9fc;
          color: #72849a;
          font-size: 10px;
          text-align: center;
        }

        @media (max-width: 1200px) {
          .v3Hero {
            grid-template-columns:
              minmax(0,1fr) 180px;
          }

          .v3HeroCenter {
            display: none;
          }

          .v3Kpis {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .v3PortalLogos {
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }
        }

        @media (max-width: 820px) {
          .cockpitV3 {
            padding: 15px;
          }

          .v3Hero {
            grid-template-columns: 1fr;
          }

          .v3HeroHeading {
            align-items: flex-start;
            flex-direction: column;
          }

          .v3HeroActions {
            width: 100%;
          }

          .v3WorkGrid {
            grid-template-columns: 1fr;
          }

          .v3PortalLogos {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .v3Date {
            display: none;
          }
        }
      `}</style>


      <style jsx global>{`
        /*
         * COCKPIT V3 GLOBAL SHELL
         */

        .appLoggedInNavbar {
          display: none !important;
        }

        .v2Topbar {
          min-height: 72px !important;
          padding: 13px 28px !important;
          border-bottom:
            1px solid #e5edf5 !important;
          background: #fff !important;
          box-shadow:
            0 4px 18px rgba(15,43,72,.045) !important;
        }

        .v2Search {
          min-height: 46px !important;
          border:
            1px solid #dce7f1 !important;
          border-radius: 13px !important;
          background: #fff !important;
          box-shadow:
            0 5px 16px rgba(29,57,86,.045) !important;
        }

        .v2Sidebar {
          top: 0 !important;
          min-height: 100vh !important;
          background:
            linear-gradient(
              180deg,
              #06192d 0%,
              #0b2744 100%
            ) !important;
        }

        .v2LegacyHidden {
          display: none !important;
        }

        .cockpitV3 .batch23 {
          margin-top: 0 !important;
          border-radius: 19px !important;
          border-color: #e1eaf3 !important;
          box-shadow:
            0 12px 29px rgba(25,63,99,.05) !important;
        }

        /*
         * ========================================
         * COCKPIT_V31_MOCKUP_MATCH
         * ========================================
         */


        .cockpitV3 {
          padding:
            20px 24px 34px !important;

          background:
            linear-gradient(
              180deg,
              #f6faff 0%,
              #eef5fb 100%
            ) !important;
        }


        /*
         * HERO — REAL ALPS PHOTO
         */

        .v3Hero {
          min-height:
            166px !important;

          grid-template-columns:
            minmax(0,1.35fr)
            260px
            220px !important;

          gap:
            18px !important;

          padding:
            24px 30px !important;

          border:
            1px solid
            rgba(13,74,112,.15);

          border-radius:
            22px !important;

          background-image:
            linear-gradient(
              90deg,
              rgba(2,22,42,.94) 0%,
              rgba(3,35,61,.83) 33%,
              rgba(5,68,95,.47) 64%,
              rgba(5,99,125,.18) 100%
            ),
            url("/cockpit-alps.jpg") !important;

          background-size:
            cover !important;

          background-position:
            center 53% !important;

          background-repeat:
            no-repeat !important;

          box-shadow:
            0 18px 42px
            rgba(18,52,84,.16) !important;
        }


        .v3HeroShade {
          background:
            linear-gradient(
              90deg,
              rgba(1,18,35,.40) 0%,
              rgba(1,18,35,.20) 45%,
              transparent 78%
            ) !important;
        }


        .v3HeroHeading h1 {
          color:
            #ffffff !important;

          font-size:
            clamp(
              28px,
              2.45vw,
              39px
            ) !important;

          font-weight:
            820;

          line-height:
            1.02 !important;

          letter-spacing:
            -.038em !important;

          text-shadow:
            0 2px 12px
            rgba(0,18,35,.25);
        }


        .v3HeroCopy > p {
          color:
            rgba(255,255,255,.91) !important;

          font-size:
            12px !important;

          text-shadow:
            0 2px 8px
            rgba(0,18,35,.25);
        }


        .v3HeroCenter {
          align-self:
            center;

          color:
            #ffffff !important;

          font-family:
            Georgia,
            "Times New Roman",
            serif !important;

          font-size:
            22px !important;

          line-height:
            1.17 !important;

          text-align:
            center;

          text-shadow:
            0 3px 12px
            rgba(0,30,50,.32);

          transform:
            rotate(-5deg);
        }


        /*
         * GOLD 3D BUTTON
         */

        .v3HeroActions {
          width:
            205px;

          justify-self:
            end;
        }


        .v3NewObject {
          min-height:
            63px !important;

          padding:
            0 17px !important;

          border:
            1px solid
            #ffe77a !important;

          border-radius:
            16px !important;

          background:
            linear-gradient(
              180deg,
              #fff08b 0%,
              #ffd850 35%,
              #ffaf21 72%,
              #f38c08 100%
            ) !important;

          color:
            #111820 !important;

          box-shadow:
            0 2px 0
            rgba(255,255,255,.85)
            inset,

            0 -5px 0
            rgba(171,77,0,.28)
            inset,

            0 6px 0
            #aa5600,

            0 13px 24px
            rgba(255,157,14,.34),

            0 0 27px
            rgba(255,206,76,.30) !important;
        }


        .v3NewObject::before {
          content:
            "";

          position:
            absolute;

          top:
            4px;

          right:
            7px;

          left:
            7px;

          height:
            19px;

          border-radius:
            11px;

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.53),
              rgba(255,255,255,0)
            );

          pointer-events:
            none;
        }


        .v3Plus {
          width:
            38px !important;

          height:
            38px !important;

          flex-basis:
            38px !important;

          border:
            1px solid
            rgba(255,222,89,.24);

          background:
            linear-gradient(
              180deg,
              #543003,
              #211200
            ) !important;

          color:
            #ffe46b !important;

          box-shadow:
            0 2px 0
            rgba(255,255,255,.12)
            inset,

            0 4px 9px
            rgba(50,24,0,.30) !important;
        }


        /*
         * TODAY
         */

        .v3Today {
          margin-top:
            14px !important;

          padding:
            18px 19px !important;

          border-radius:
            20px !important;
        }


        .v3Kpis {
          gap:
            11px !important;

          margin-top:
            15px !important;
        }


        .v3Kpis article {
          min-height:
            89px !important;
        }


        /*
         * WORK CARDS
         */

        .v3WorkGrid {
          gap:
            12px !important;

          margin-top:
            12px !important;
        }


        .v3WorkCard,
        .v3Activity {
          min-height:
            201px !important;

          padding:
            16px !important;

          border-radius:
            17px !important;
        }


        .v3Object {
          grid-template-columns:
            120px
            minmax(0,1fr) !important;

          gap:
            15px !important;

          margin-top:
            13px !important;
        }


        .v3ObjectImage {
          min-height:
            110px !important;

          border:
            1px solid
            #d7e5f1;

          border-radius:
            12px !important;

          background-image:
            linear-gradient(
              180deg,
              rgba(5,28,50,.04),
              rgba(5,28,50,.13)
            ),
            url("/cockpit-alps.jpg");

          background-size:
            cover !important;

          background-position:
            center !important;

          box-shadow:
            0 6px 15px
            rgba(20,56,90,.10);
        }


        .v3ObjectBody h3 {
          font-size:
            15px !important;

          font-weight:
            800;
        }


        .v3ObjectBody p {
          max-width:
            570px;

          margin-top:
            6px !important;
        }


        .v3ObjectMeta {
          margin-top:
            9px !important;
        }


        .v3ObjectAction {
          margin-top:
            10px !important;

          color:
            #0877e2 !important;
        }


        /*
         * ACTIVITY
         */

        .v3ActivityEmpty {
          min-height:
            111px !important;

          margin-top:
            10px !important;
        }


        /*
         * PORTALS
         */

        .v3Portals {
          margin-top:
            12px !important;

          padding:
            15px 17px 16px !important;

          border-radius:
            18px !important;
        }


        .v3PortalLogos {
          gap:
            9px !important;

          margin-top:
            12px !important;
        }


        .v3PortalLogos > div {
          min-height:
            58px !important;

          border-radius:
            11px !important;

          box-shadow:
            0 3px 10px
            rgba(35,71,105,.035);
        }


        /*
         * PUBLISHING
         */

        .v3Publishing {
          margin-top:
            12px !important;
        }


        .cockpitV3
        .batch23 {
          padding:
            17px 18px !important;

          border-radius:
            18px !important;
        }


        @media
        (max-width: 1250px) {

          .v3Hero {
            grid-template-columns:
              minmax(0,1fr)
              200px !important;
          }


          .v3HeroCenter {
            display:
              none;
          }
        }


        @media
        (max-width: 900px) {

          .v3Hero {
            grid-template-columns:
              1fr !important;

            background-position:
              62% center !important;
          }


          .v3HeroActions {
            width:
              100%;

            justify-self:
              stretch;
          }
        }


        /*
         * ========================================
         * COCKPIT_V32_TOP_POLISH
         * Nur oberer Cockpit-Bereich.
         * Portal + Publishing bleiben unverändert.
         * ========================================
         */


        /*
         * HERO — BRIGHTER ALPS / BETTER CROP
         */

        .v3Hero {
          min-height:
            160px !important;

          grid-template-columns:
            minmax(0,1.45fr)
            245px
            205px !important;

          gap:
            20px !important;

          padding:
            23px 30px !important;

          background-image:
            linear-gradient(
              90deg,
              rgba(2,20,39,.94) 0%,
              rgba(3,31,54,.78) 34%,
              rgba(3,42,67,.42) 57%,
              rgba(0,72,96,.10) 82%,
              rgba(0,78,101,.12) 100%
            ),
            url("/cockpit-alps.jpg") !important;

          background-position:
            center 36% !important;

          background-size:
            cover !important;

          box-shadow:
            0 16px 38px
            rgba(15,50,81,.14) !important;
        }


        .v3HeroShade {
          background:
            linear-gradient(
              90deg,
              rgba(1,16,31,.32) 0%,
              rgba(1,16,31,.14) 45%,
              transparent 72%
            ) !important;
        }


        .v3HeroCopy {
          max-width:
            720px;
        }


        .v3Eyebrow {
          margin-bottom:
            8px !important;

          color:
            #ffd54b !important;
        }


        .v3HeroHeading {
          gap:
            11px !important;

          flex-wrap:
            nowrap;
        }


        .v3HeroHeading h1 {
          white-space:
            nowrap;

          font-size:
            clamp(
              27px,
              2.35vw,
              37px
            ) !important;

          line-height:
            1.03 !important;
        }


        .v3HeroCopy > p {
          margin-top:
            10px !important;

          font-size:
            11px !important;

          font-weight:
            520;
        }


        /*
         * HERO SLOGAN
         */

        .v3HeroCenter {
          align-self:
            center;

          justify-self:
            center;

          padding:
            10px 12px;

          color:
            #ffffff !important;

          font-size:
            20px !important;

          font-weight:
            500;

          line-height:
            1.13 !important;

          text-shadow:
            0 3px 12px
            rgba(0,22,42,.42);
        }


        /*
         * PRIMARY CTA — CLEANER 3D
         */

        .v3HeroActions {
          width:
            202px !important;
        }


        .v3NewObject {
          min-height:
            58px !important;

          gap:
            10px !important;

          border-radius:
            14px !important;

          transform:
            translateY(-2px) !important;

          box-shadow:
            0 2px 0
            rgba(255,255,255,.88)
            inset,

            0 -4px 0
            rgba(168,76,0,.28)
            inset,

            0 5px 0
            #a95500,

            0 11px 23px
            rgba(255,157,14,.29),

            0 0 22px
            rgba(255,204,67,.20) !important;
        }


        .v3NewObject:hover {
          transform:
            translateY(-4px)
            scale(1.012) !important;
        }


        .v3Plus {
          width:
            34px !important;

          height:
            34px !important;

          flex-basis:
            34px !important;

          font-size:
            23px !important;
        }


        .v3NewObject strong {
          font-size:
            12px !important;
        }


        .v3Publish {
          min-height:
            32px !important;

          border-radius:
            12px !important;

          background:
            rgba(4,49,74,.28) !important;

          backdrop-filter:
            blur(5px);
        }


        /*
         * TODAY HEADER — LESS EMPTY / MORE PREMIUM
         */

        .v3Today {
          padding:
            17px 18px !important;
        }


        .v3TodayHeader {
          min-height:
            48px;
        }


        .v3TodayTitle h2 {
          font-size:
            19px !important;

          font-weight:
            790;
        }


        .v3Calendar {
          width:
            43px !important;

          height:
            43px !important;

          border-radius:
            12px !important;
        }


        /*
         * KPI CARDS — CLEANER
         */

        .v3Kpis {
          margin-top:
            14px !important;
        }


        .v3Kpis article {
          min-height:
            84px !important;

          padding:
            12px 14px !important;

          grid-template-columns:
            44px 1fr 12px !important;
        }


        .v3KpiIcon {
          width:
            43px !important;

          height:
            43px !important;
        }


        .v3Kpis article strong {
          font-size:
            21px !important;
        }


        /*
         * WORK CARDS
         */

        .v3WorkCard,
        .v3Activity {
          min-height:
            190px !important;
        }


        .v3Object {
          grid-template-columns:
            112px
            minmax(0,1fr) !important;
        }


        /*
         * PROPERTY FALLBACK
         * Kein Alpenfoto mehr als Objektbild.
         */

        .v3ObjectImage:not(.hasImage) {
          position:
            relative;

          display:
            grid;

          place-items:
            center;

          overflow:
            hidden;

          background:
            linear-gradient(
              180deg,
              #ccecff 0%,
              #dff4ff 48%,
              #96cf91 49%,
              #6cb574 100%
            ) !important;
        }


        .v3ObjectImage:not(.hasImage)::after {
          content:
            "";

          position:
            absolute;

          right:
            -22px;

          bottom:
            -14px;

          left:
            -22px;

          height:
            48px;

          border-radius:
            50%;

          background:
            rgba(62,142,76,.24);
        }


        .v3HousePlaceholder {
          position:
            relative;

          z-index:
            2;

          display:
            block;

          width:
            52px;

          height:
            50px;
        }


        .v3ObjectImage.hasImage
        .v3HousePlaceholder {
          display:
            none;
        }


        .v3HouseRoof {
          position:
            absolute;

          top:
            5px;

          left:
            9px;

          width:
            34px;

          height:
            34px;

          border-top:
            4px solid #143d64;

          border-left:
            4px solid #143d64;

          transform:
            rotate(45deg);
        }


        .v3HouseBody {
          position:
            absolute;

          right:
            10px;

          bottom:
            2px;

          left:
            10px;

          height:
            29px;

          border:
            4px solid #143d64;

          border-top:
            0;

          background:
            rgba(255,255,255,.20);
        }


        .v3HouseDoor {
          position:
            absolute;

          z-index:
            3;

          bottom:
            2px;

          left:
            23px;

          width:
            9px;

          height:
            16px;

          background:
            #143d64;
        }


        .v3ObjectImage.hasImage {
          background-size:
            cover !important;

          background-position:
            center !important;
        }


        .v3ObjectBody h3 {
          font-size:
            15px !important;
        }


        .v3ObjectMeta span {
          padding:
            5px 8px !important;
        }


        /*
         * ACTIVITY EMPTY STATE
         */

        .v3Activity h3 {
          font-size:
            16px !important;
        }


        .v3ActivityEmpty {
          min-height:
            101px !important;
        }


        /*
         * TOP TOOLBAR
         */

        .v2Topbar {
          min-height:
            70px !important;

          padding:
            12px 26px !important;

          background:
            #ffffff !important;
        }


        .v2Search {
          width:
            min(
              635px,
              55vw
            ) !important;

          min-height:
            46px !important;
        }


        @media
        (max-width: 1300px) {

          .v3Hero {
            grid-template-columns:
              minmax(0,1fr)
              205px !important;

            background-position:
              center 34% !important;
          }


          .v3HeroCenter {
            display:
              none;
          }


          .v3HeroHeading h1 {
            white-space:
              normal;
          }
        }


        /*
         * ========================================
         * COCKPIT_V33_CTA_SYMMETRY
         * Nur Neues Objekt.
         * ========================================
         */

        .v3HeroActions {
          width:
            218px !important;
        }


        .v3NewObject {
          display:
            grid !important;

          grid-template-columns:
            38px
            minmax(0,1fr)
            38px !important;

          min-height:
            60px !important;

          align-items:
            center !important;

          justify-items:
            center !important;

          gap:
            8px !important;

          padding:
            0 13px !important;

          border-radius:
            15px !important;
        }


        .v3Plus {
          width:
            36px !important;

          height:
            36px !important;

          flex-basis:
            36px !important;

          justify-self:
            start !important;

          border-radius:
            10px !important;
        }


        .v3NewObject strong {
          width:
            100%;

          margin:
            0 !important;

          color:
            #14191f !important;

          font-size:
            12px !important;

          font-weight:
            950 !important;

          line-height:
            1 !important;

          text-align:
            center !important;

          white-space:
            nowrap;
        }


        .v3CtaBalance {
          display:
            block;

          width:
            36px;

          height:
            36px;

          justify-self:
            end;

          pointer-events:
            none;
        }


        .v3Publish {
          width:
            100%;

          box-sizing:
            border-box;
        }


        /*
         * ========================================
         * COCKPIT_V34_CLEAN_GOLD_CTA
         *
         * Nur Neues Objekt Button.
         * Orange Unterkante / Glow entfernt.
         * ========================================
         */


        .v3HeroActions {
          width:
            218px !important;
        }


        .v3NewObject {
          position:
            relative !important;

          display:
            grid !important;

          grid-template-columns:
            38px
            minmax(0,1fr)
            38px !important;

          width:
            100% !important;

          min-height:
            60px !important;

          box-sizing:
            border-box !important;

          align-items:
            center !important;

          justify-items:
            center !important;

          gap:
            8px !important;

          padding:
            0 13px !important;

          border:
            1px solid
            #e3bd42 !important;

          border-radius:
            15px !important;

          background:
            linear-gradient(
              180deg,
              #ffe46c 0%,
              #ffd047 48%,
              #f7b72c 100%
            ) !important;

          color:
            #14191f !important;

          text-decoration:
            none !important;

          text-shadow:
            none !important;

          /*
           * KEINE orange Lippe mehr.
           * Nur neutraler Premium-Schatten.
           */
          box-shadow:
            0 1px 0
            rgba(255,255,255,.72)
            inset,

            0 7px 18px
            rgba(15,35,55,.16) !important;

          transform:
            none !important;

          transition:
            transform .16s ease,
            box-shadow .16s ease,
            filter .16s ease;
        }


        /*
         * Nur sehr dezenter heller Glanz.
         */

        .v3NewObject::before {
          content:
            "";

          position:
            absolute;

          top:
            4px;

          right:
            8px;

          left:
            8px;

          height:
            15px;

          border-radius:
            11px;

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.30),
              rgba(255,255,255,0)
            );

          pointer-events:
            none;
        }


        /*
         * Falls eine alte orange After-Ebene
         * vorhanden war: komplett aus.
         */

        .v3NewObject::after {
          display:
            none !important;

          content:
            none !important;

          background:
            none !important;

          box-shadow:
            none !important;
        }


        /*
         * PLUS
         */

        .v3Plus {
          position:
            relative;

          z-index:
            2;

          display:
            grid !important;

          width:
            36px !important;

          height:
            36px !important;

          flex:
            0 0 36px !important;

          place-items:
            center !important;

          justify-self:
            start !important;

          border:
            1px solid
            rgba(255,218,91,.18) !important;

          border-radius:
            10px !important;

          background:
            linear-gradient(
              180deg,
              #4a2d08 0%,
              #211300 100%
            ) !important;

          color:
            #ffe268 !important;

          font-size:
            23px !important;

          font-weight:
            500 !important;

          line-height:
            1 !important;

          text-shadow:
            none !important;

          box-shadow:
            0 3px 8px
            rgba(20,25,30,.20) !important;
        }


        /*
         * TEXT EXAKT MITTIG
         */

        .v3NewObject strong {
          position:
            relative;

          z-index:
            2;

          display:
            block;

          width:
            100%;

          margin:
            0 !important;

          color:
            #111820 !important;

          font-size:
            12px !important;

          font-weight:
            950 !important;

          line-height:
            1 !important;

          letter-spacing:
            -.01em;

          text-align:
            center !important;

          white-space:
            nowrap;
        }


        /*
         * Unsichtbares Gegengewicht
         * für perfekte Symmetrie.
         */

        .v3CtaBalance {
          display:
            block !important;

          width:
            36px !important;

          height:
            36px !important;

          justify-self:
            end !important;

          visibility:
            hidden;

          pointer-events:
            none;
        }


        /*
         * HOVER
         */

        .v3NewObject:hover {
          transform:
            translateY(-2px) !important;

          filter:
            brightness(1.025);

          box-shadow:
            0 1px 0
            rgba(255,255,255,.76)
            inset,

            0 9px 20px
            rgba(15,35,55,.18) !important;
        }


        /*
         * CLICK
         */

        .v3NewObject:active {
          transform:
            translateY(0) !important;

          filter:
            brightness(.99);

          box-shadow:
            0 1px 0
            rgba(255,255,255,.55)
            inset,

            0 4px 10px
            rgba(15,35,55,.14) !important;
        }


        /*
         * Veröffentlichungs-Button
         * bleibt exakt gleich breit.
         */

        .v3Publish {
          width:
            100% !important;

          box-sizing:
            border-box !important;
        }


        /*
         * ========================================
         * COCKPIT_V35_OBJECT_ACTION
         * Objekt fertigstellen
         * ========================================
         */

        .v3ObjectAction {
          display:
            inline-flex !important;

          width:
            fit-content;

          min-height:
            34px;

          align-items:
            center;

          justify-content:
            center;

          margin-top:
            11px !important;

          padding:
            0 13px;

          border:
            1px solid
            #cfe3f8;

          border-radius:
            10px;

          background:
            linear-gradient(
              180deg,
              #f9fcff 0%,
              #eef7ff 100%
            );

          color:
            #0874df !important;

          font-size:
            10px !important;

          font-weight:
            900 !important;

          letter-spacing:
            -.01em;

          text-decoration:
            none !important;

          box-shadow:
            0 3px 9px
            rgba(24,91,150,.06);

          transition:
            transform .15s ease,
            border-color .15s ease,
            background .15s ease,
            box-shadow .15s ease;
        }


        .v3ObjectAction:hover {
          transform:
            translateY(-1px);

          border-color:
            #9cccf5;

          background:
            linear-gradient(
              180deg,
              #f2f9ff 0%,
              #e4f2ff 100%
            );

          box-shadow:
            0 6px 14px
            rgba(24,91,150,.11);
        }


        .v3ObjectAction:active {
          transform:
            translateY(0);

          box-shadow:
            0 2px 5px
            rgba(24,91,150,.08);
        }


        /*
         * ========================================
         * COCKPIT_V36_MARKET_PORTALS
         * ========================================
         */

        .logoNewhome {
          display:
            inline-flex;

          align-items:
            center;

          color:
            #283b52;

          font-size:
            18px;

          font-weight:
            700;

          letter-spacing:
            -.04em;

          white-space:
            nowrap;
        }


        .logoNewhome b {
          margin-right:
            2px;

          color:
            #008bc5;

          font-weight:
            900;
        }


        .logoFlatfox {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            7px;

          color:
            #202f40;

          font-size:
            18px;

          font-weight:
            700;

          white-space:
            nowrap;
        }


        .logoFlatfox b {
          display:
            grid;

          width:
            28px;

          height:
            28px;

          place-items:
            center;

          border-radius:
            8px;

          background:
            linear-gradient(
              135deg,
              #ff734e,
              #e84b39
            );

          color:
            #ffffff;

          font-size:
            15px;

          font-weight:
            950;
        }

      `}</style>
    </main>
  );
}
