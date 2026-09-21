"use client";


import Link from "next/link";

import {
  useState,
} from "react";

import type {
  CommandCenterExecutionAction,
} from "@/lib/command-center/command-center-action-registry";

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


type PriorityAction = {
  id:
    string;

  listingId:
    string;

  tone:
    "red" |
    "orange" |
    "blue";

  eyebrow:
    string;

  title:
    string;

  description:
    string;

  resolution:
    string;

  href:
    string;

  label:
    string;

  execution:
    CommandCenterExecutionAction;
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

  priorityActions:
    PriorityAction[];

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
  priorityActions,
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


  /*
   * COMMAND_CENTER_ACTION_EXECUTION_V1
   *
   * Der Command Center darf hier nur
   * bereits vorhandene sichere Operationen
   * auslösen.
   *
   * Aktuell inline erlaubt:
   * - RECONCILE_PUBLICATION
   *
   * Nicht erlaubt:
   * - direkter Publish
   * - manueller Portal-Retry
   * - Approval-Bypass
   */
  const [
    commandActionBusyId,
    setCommandActionBusyId,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    commandActionError,
    setCommandActionError,
  ] =
    useState(
      ""
    );


  async function executeCommandCenterAction(
    action:
      PriorityAction
  ) {

    if (
      action.execution.mode !==
      "reconcile"
    ) {
      return;
    }


    if (
      commandActionBusyId
    ) {
      return;
    }


    try {

      setCommandActionBusyId(
        action.id
      );

      setCommandActionError(
        ""
      );


      const response =
        await fetch(
          `/api/listings/${encodeURIComponent(
            action.execution.listingId
          )}/publication-run`,
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "reconcile",

                runId:
                  action.execution.runId,
              }),
          }
        );


      const data =
        (
          await response
            .json()
            .catch(
              () =>
                null
            )
        ) as
          | {
              success?:
                boolean;

              error?:
                string;

              message?:
                string;
            }
          | null;


      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }


      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
          data?.error ||
          "Status konnte nicht aktualisiert werden."
        );
      }


      /*
       * Activity Center + Prioritäten werden
       * nach erfolgreichem Reconcile frisch
       * vom Server gelesen.
       */
      window.location.reload();
    }
    catch (
      actionError
    ) {

      setCommandActionError(
        actionError instanceof
          Error
          ? actionError.message
          : "Aktion konnte nicht ausgeführt werden."
      );
    }
    finally {

      setCommandActionBusyId(
        null
      );
    }
  }


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

            {priorityActions.length > 0 ? (
              <span className="v3Warning">
                ◉ {priorityActions.length} offen
              </span>
            ) : (
              <span className="v3PriorityReady">
                ✓ Alles erledigt
              </span>
            )}
          </header>


          {commandActionError ? (
            <div
              className="v3CommandActionError"
              role="alert"
            >
              {commandActionError}
            </div>
          ) : null}


          {priorityActions.length > 0 ? (
            <div className="v3PriorityList">
              {priorityActions.map(
                (action) => {

                  const content = (
                    <>
                      <span
                        className="v3PrioritySignal"
                        aria-hidden="true"
                      />

                      <div className="v3PriorityBody">
                        <small>
                          {action.eyebrow}
                        </small>

                        <strong>
                          {action.title}
                        </strong>

                        <p>
                          {action.description}
                        </p>

                        <span className="v3PriorityResolution">
                          <b>
                            Nächster Schritt:
                          </b>{" "}
                          {action.resolution}
                        </span>
                      </div>

                      <span className="v3PriorityCta">
                        {commandActionBusyId ===
                        action.id
                          ? "Status wird aktualisiert …"
                          : `${action.label} →`}
                      </span>
                    </>
                  );


                  if (
                    action.execution.mode ===
                    "reconcile"
                  ) {
                    return (
                      <button
                        key={action.id}
                        type="button"
                        className={
                          `v3PriorityItem v3PriorityButton ${action.tone}`
                        }
                        disabled={
                          commandActionBusyId !==
                          null
                        }
                        aria-busy={
                          commandActionBusyId ===
                          action.id
                        }
                        onClick={() =>
                          void executeCommandCenterAction(
                            action
                          )
                        }
                      >
                        {content}
                      </button>
                    );
                  }


                  return (
                    <Link
                      key={action.id}
                      href={
                        action.execution.href
                      }
                      className={
                        `v3PriorityItem ${action.tone}`
                      }
                    >
                      {content}
                    </Link>
                  );
                }
              )}
            </div>
          ) : (
            <div className="v3PriorityEmpty">
              <span>✓</span>

              <div>
                <strong>
                  Aktuell nichts offen
                </strong>

                <p>
                  Alle bekannten Aufgaben sind
                  erledigt. Du kannst direkt mit
                  dem nächsten Objekt starten.
                </p>
              </div>
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
                                          className={
                        "v3ActivityEvent " +
                        (item.severity ?? "info")
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
        /* COMMAND_CENTER_PRIORITY_V1 */

        .v3PriorityList {
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 14px;
        }

        .v3PriorityItem {
          display: grid;
          grid-template-columns:
            5px minmax(0,1fr) auto;
          min-height: 72px;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          color: inherit;
          text-decoration: none;
          box-shadow:
            0 4px 12px rgba(15,23,42,.035);
          transition:
            transform .15s ease,
            box-shadow .15s ease;
        }

        .v3PriorityItem:hover {
          transform: translateY(-1px);
          box-shadow:
            0 8px 18px rgba(15,23,42,.07);
        }

        .v3PrioritySignal {
          width: 5px;
          height: 42px;
          border-radius: 999px;
        }

        .v3PriorityItem.red {
          border-color: #fecaca;
          background: #fffafa;
        }

        .v3PriorityItem.red .v3PrioritySignal {
          background: #dc2626;
        }

        .v3PriorityItem.orange {
          border-color: #fde6ad;
          background: #fffdf7;
        }

        .v3PriorityItem.orange .v3PrioritySignal {
          background: #f59e0b;
        }

        .v3PriorityItem.blue {
          border-color: #dbeafe;
          background: #fbfdff;
        }

        .v3PriorityItem.blue .v3PrioritySignal {
          background: #2563eb;
        }

        .v3PriorityBody {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .v3PriorityBody small {
          margin-bottom: 3px;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .v3PriorityItem.red .v3PriorityBody small,
        .v3PriorityItem.red .v3PriorityCta {
          color: #b91c1c;
        }

        .v3PriorityItem.orange .v3PriorityBody small,
        .v3PriorityItem.orange .v3PriorityCta {
          color: #b45309;
        }

        .v3PriorityItem.blue .v3PriorityBody small,
        .v3PriorityItem.blue .v3PriorityCta {
          color: #1d4ed8;
        }

        .v3PriorityBody strong {
          overflow: hidden;
          color: #172033;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v3PriorityBody p {
          margin: 4px 0 0;
          color: #718096;
          font-size: 8px;
          line-height: 1.4;
        }

        .v3PriorityResolution {
          display: block;
          margin-top: 5px;
          color: #475569;
          font-size: 8px;
          line-height: 1.4;
        }

        .v3PriorityResolution b {
          color: #1e293b;
          font-weight: 900;
        }

        .v3PriorityItem.red
        .v3PriorityResolution b {
          color: #991b1b;
        }

        .v3PriorityItem.orange
        .v3PriorityResolution b {
          color: #92400e;
        }

        .v3PriorityItem.blue
        .v3PriorityResolution b {
          color: #1e40af;
        }


        .v3PriorityCta {
          color: #2563eb;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .v3PriorityReady {
          padding: 5px 8px;
          border-radius: 999px;
          background: #e8f8ef;
          color: #168f52;
          font-size: 8px;
          font-weight: 900;
        }

        .v3PriorityEmpty {
          display: flex;
          min-height: 190px;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
        }

        .v3PriorityEmpty > span {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          place-items: center;
          border-radius: 50%;
          background: #e8f8ef;
          color: #168f52;
          font-size: 17px;
          font-weight: 950;
        }

        .v3PriorityEmpty strong {
          color: #172033;
          font-size: 11px;
        }

        .v3PriorityEmpty p {
          max-width: 270px;
          margin: 5px 0 0;
          color: #7a889c;
          font-size: 9px;
          line-height: 1.45;
        }

        @media (max-width: 760px) {
          .v3PriorityItem {
            grid-template-columns:
              5px minmax(0,1fr);
          }

          .v3PriorityCta {
            grid-column: 2;
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


        /*
         * ========================================
         * COMMAND_CENTER_FINAL_BRAND_V1
         * ========================================
         * Canonical Inserat-AI cockpit styling.
         * Cascade/order preserved from accepted UI.
         */

        .v3WorkGrid {
          gap: 18px;
        }

        .v3WorkCard,
        .v3Activity {
          position: relative;
          overflow: hidden;
          border: 1px solid
            rgba(148, 163, 184, .20);
          border-radius: 24px;
          background: linear-gradient(
              145deg,
              rgba(255,255,255,1) 0%,
              rgba(250,252,255,.98) 100%
            );
          box-shadow: 0 18px 45px
              rgba(15,23,42,.055),
            0 3px 10px
              rgba(15,23,42,.025);
          transition: border-color .18s ease,
            box-shadow .18s ease;
        }

        .v3WorkCard:hover,
        .v3Activity:hover {
          border-color: rgba(96,165,250,.24);
          box-shadow: 0 22px 55px
              rgba(15,23,42,.075),
            0 4px 12px
              rgba(15,23,42,.035);
        }

        .v3WorkCard
        .v3CardHeader,
        .v3Activity
        .v3CardHeader {
          padding-bottom: 14px;
          border-bottom: 1px solid
            rgba(226,232,240,.76);
        }

        .v3Warning {
          display: inline-flex;
          min-height: 29px;
          align-items: center;
          justify-content: center;
          padding: 0 11px;
          border: 1px solid
            rgba(245,158,11,.18);
          border-radius: 999px;
          background: linear-gradient(
              180deg,
              #fff8e8 0%,
              #fff2cf 100%
            );
          color: #b45309;
          font-size: 9px;
          font-weight: 900;
          box-shadow: inset 0 1px 0
            rgba(255,255,255,.85);
        }

        .v3PriorityList {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 15px;
        }

        .v3PriorityItem {
          position: relative;
          display: grid;
          grid-template-columns: 6px
            minmax(0, 1fr)
            auto;
          gap: 0 15px;
          align-items: center;
          min-height: 126px;
          padding: 15px 16px 15px 14px;
          overflow: hidden;
          border: 1px solid
            rgba(148,163,184,.19);
          border-radius: 18px;
          background: rgba(255,255,255,.96);
          text-decoration: none;
          box-shadow: 0 8px 20px
            rgba(15,23,42,.035);
          transition: transform .17s ease,
            border-color .17s ease,
            box-shadow .17s ease,
            background .17s ease;
        }

        .v3PriorityItem::after {
          content: "";
          position: absolute;
          top: -65px;
          right: -48px;
          width: 145px;
          height: 145px;
          border-radius: 999px;
          opacity: .34;
          pointer-events: none;
        }

        .v3PriorityItem:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px
            rgba(15,23,42,.075);
        }

        .v3PrioritySignal {
          position: relative;
          z-index: 2;
          display: block;
          width: 5px;
          height: 72px;
          border-radius: 999px;
          background: #94a3b8;
          box-shadow: 0 4px 10px
            rgba(15,23,42,.08);
        }

        .v3PriorityItem.red {
          border-color: rgba(239,68,68,.20);
          background: linear-gradient(
              135deg,
              #ffffff 0%,
              #fffafa 55%,
              #fff4f4 100%
            );
        }

        .v3PriorityItem.red::after {
          background: rgba(248,113,113,.29);
        }

        .v3PriorityItem.red
        .v3PrioritySignal {
          background: linear-gradient(
              180deg,
              #fb7185 0%,
              #ef4444 48%,
              #dc2626 100%
            );
          box-shadow: 0 5px 15px
            rgba(220,38,38,.26);
        }

        .v3PriorityItem.orange {
          border-color: rgba(245,158,11,.21);
          background: linear-gradient(
              135deg,
              #ffffff 0%,
              #fffdf7 55%,
              #fff9e9 100%
            );
        }

        .v3PriorityItem.orange::after {
          background: rgba(251,191,36,.28);
        }

        .v3PriorityItem.orange
        .v3PrioritySignal {
          background: linear-gradient(
              180deg,
              #fbbf24 0%,
              #f59e0b 52%,
              #d97706 100%
            );
          box-shadow: 0 5px 15px
            rgba(217,119,6,.22);
        }

        .v3PriorityItem.blue {
          border-color: rgba(59,130,246,.19);
          background: linear-gradient(
              135deg,
              #ffffff 0%,
              #f8fbff 55%,
              #eef6ff 100%
            );
        }

        .v3PriorityItem.blue::after {
          background: rgba(96,165,250,.27);
        }

        .v3PriorityItem.blue
        .v3PrioritySignal {
          background: linear-gradient(
              180deg,
              #60a5fa 0%,
              #3b82f6 48%,
              #2563eb 100%
            );
          box-shadow: 0 5px 15px
            rgba(37,99,235,.24);
        }

        .v3PriorityBody {
          position: relative;
          z-index: 2;
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: flex-start;
        }

        .v3PriorityBody small {
          margin-bottom: 5px;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .09em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .v3PriorityItem.red
        .v3PriorityBody small {
          color: #b91c1c;
        }

        .v3PriorityItem.orange
        .v3PriorityBody small {
          color: #b45309;
        }

        .v3PriorityItem.blue
        .v3PriorityBody small {
          color: #1d4ed8;
        }

        .v3PriorityBody > strong {
          margin: 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: -.025em;
          line-height: 1.28;
        }

        .v3PriorityBody > p {
          max-width: 600px;
          margin: 5px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.48;
        }

        .v3PriorityResolution {
          display: block;
          width: fit-content;
          max-width: 620px;
          margin-top: 9px;
          padding: 7px 10px;
          border: 1px solid
            rgba(148,163,184,.14);
          border-radius: 9px;
          background: rgba(255,255,255,.72);
          color: #475569;
          font-size: 9px;
          line-height: 1.45;
          box-shadow: inset 0 1px 0
            rgba(255,255,255,.88);
        }

        .v3PriorityResolution b {
          color: #0f172a;
          font-weight: 900;
        }

        .v3PriorityItem.red
        .v3PriorityResolution {
          border-color: rgba(239,68,68,.14);
        }

        .v3PriorityItem.orange
        .v3PriorityResolution {
          border-color: rgba(245,158,11,.15);
        }

        .v3PriorityItem.blue
        .v3PriorityResolution {
          border-color: rgba(59,130,246,.14);
        }

        .v3PriorityCta {
          position: relative;
          z-index: 2;
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          padding: 0 13px;
          border: 1px solid
            rgba(37,99,235,.12);
          border-radius: 10px;
          background: rgba(37,99,235,.07);
          color: #2563eb;
          font-size: 9px;
          font-weight: 900;
          box-shadow: inset 0 1px 0
            rgba(255,255,255,.85);
          transition: transform .15s ease,
            background .15s ease,
            box-shadow .15s ease;
        }

        .v3PriorityItem:hover
        .v3PriorityCta {
          transform: translateX(2px);
          box-shadow: 0 5px 14px
            rgba(15,23,42,.06);
        }

        .v3PriorityItem.red
        .v3PriorityCta {
          border-color: rgba(220,38,38,.13);
          background: rgba(220,38,38,.075);
          color: #b91c1c;
        }

        .v3PriorityItem.orange
        .v3PriorityCta {
          border-color: rgba(217,119,6,.14);
          background: rgba(217,119,6,.075);
          color: #b45309;
        }

        .v3Activity h3 {
          margin-top: 20px;
          margin-bottom: 13px;
          color: #0f172a;
          font-size: 19px;
          font-weight: 850;
          letter-spacing: -.025em;
        }

        .v3ActivityList {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
          padding-left: 0;
        }

        .v3ActivityList::before {
          content: "";
          position: absolute;
          top: 20px;
          bottom: 20px;
          left: 17px;
          width: 1px;
          background: linear-gradient(
              180deg,
              rgba(59,130,246,.28),
              rgba(148,163,184,.10)
            );
          pointer-events: none;
        }

        .v3ActivityList a {
          position: relative;
          display: grid;
          grid-template-columns: 34px
            minmax(0, 1fr)
            30px;
          align-items: center;
          min-height: 54px;
          padding: 7px 9px 7px 4px;
          overflow: hidden;
          border: 1px solid
            transparent;
          border-radius: 14px;
          background: rgba(248,250,252,.24);
          color: #0f172a;
          text-decoration: none;
          transition: transform .16s ease,
            border-color .16s ease,
            background .16s ease,
            box-shadow .16s ease;
        }

        .v3ActivityList a::before {
          content: "";
          position: relative;
          z-index: 2;
          display: block;
          width: 12px;
          height: 12px;
          margin-left: 11px;
          border: 3px solid
            #ffffff;
          border-radius: 999px;
          background: linear-gradient(
              135deg,
              #60a5fa,
              #2563eb
            );
          box-shadow: 0 0 0 1px
              rgba(59,130,246,.16),
            0 4px 10px
              rgba(37,99,235,.19);
        }

        .v3ActivityList a:hover {
          transform: translateX(3px);
          border-color: rgba(148,163,184,.18);
          background: rgba(248,250,252,.86);
          box-shadow: 0 7px 20px
            rgba(15,23,42,.045);
        }

        .v3ActivityList a > span {
          position: relative;
          z-index: 2;
          overflow: hidden;
          color: #172033;
          font-size: 12px;
          font-weight: 750;
          letter-spacing: -.01em;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v3ActivityList a > strong {
          position: relative;
          z-index: 2;
          display: inline-flex;
          width: 27px;
          height: 27px;
          align-items: center;
          justify-content: center;
          border: 1px solid
            rgba(148,163,184,.16);
          border-radius: 999px;
          background: rgba(255,255,255,.84);
          color: #2563eb;
          font-size: 11px;
          font-weight: 950;
          box-shadow: 0 3px 9px
            rgba(15,23,42,.045);
        }

        .v3PriorityEmpty {
          min-height: 150px;
          border: 1px solid
            rgba(34,197,94,.15);
          border-radius: 18px;
          background: linear-gradient(
              135deg,
              rgba(240,253,244,.82),
              rgba(255,255,255,.97)
            );
          box-shadow: inset 0 1px 0
            rgba(255,255,255,.9);
        }

        @media (max-width: 900px) {
          .v3PriorityItem {
            grid-template-columns: 5px minmax(0, 1fr);
            gap: 0 12px;
          }
          .v3PriorityCta {
            grid-column: 2;
            width: fit-content;
            margin-top: 10px;
          }
          .v3PrioritySignal {
            grid-row: 1 / span 2;
            align-self: stretch;
            height: auto;
            min-height: 72px;
          }
        }

        .v3WorkGrid {
          gap: 16px;
        }

        .v3WorkCard,
        .v3Activity {
          position: relative;
          border: 1px solid
            rgba(203,213,225,.76);
          border-radius: 22px;
          background: linear-gradient(
              180deg,
              #ffffff 0%,
              #fbfdff 100%
            );
          box-shadow: 0 16px 40px
              rgba(15,23,42,.055),
            0 2px 7px
              rgba(15,23,42,.025);
        }

        .v3WorkCard::before,
        .v3Activity::before {
          content: "";
          position: absolute;
          top: 0;
          left: 25px;
          right: 25px;
          height: 2px;
          border-radius: 0 0 999px 999px;
          pointer-events: none;
        }

        .v3WorkCard::before {
          background: linear-gradient(
              90deg,
              transparent,
              rgba(245,158,11,.65),
              rgba(239,68,68,.42),
              transparent
            );
        }

        .v3Activity::before {
          background: linear-gradient(
              90deg,
              transparent,
              rgba(59,130,246,.58),
              rgba(14,165,233,.42),
              transparent
            );
        }

        .v3PriorityList {
          gap: 10px;
          margin-top: 13px;
        }

        .v3PriorityItem {
          min-height: 103px;
          padding: 12px 14px 12px 13px;
          grid-template-columns: 5px
            minmax(0, 1fr)
            auto;
          gap: 0 13px;
          border-radius: 16px;
          box-shadow: 0 5px 16px
            rgba(15,23,42,.035);
        }

        .v3PrioritySignal {
          width: 4px;
          height: 57px;
        }

        .v3PriorityItem::after {
          top: -88px;
          right: -72px;
          width: 175px;
          height: 175px;
          opacity: .22;
        }

        .v3PriorityItem.red {
          background: linear-gradient(
              135deg,
              #ffffff 0%,
              #fffdfd 68%,
              #fff6f6 100%
            );
          border-color: rgba(239,68,68,.18);
        }

        .v3PriorityItem.orange {
          background: linear-gradient(
              135deg,
              #ffffff 0%,
              #fffefa 68%,
              #fff9eb 100%
            );
          border-color: rgba(245,158,11,.19);
        }

        .v3PriorityItem.blue {
          background: linear-gradient(
              135deg,
              #ffffff 0%,
              #fbfdff 68%,
              #f2f8ff 100%
            );
          border-color: rgba(59,130,246,.17);
        }

        .v3PriorityItem:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 27px
            rgba(15,23,42,.075);
        }

        .v3PriorityBody small {
          margin-bottom: 4px;
          font-size: 8px;
          letter-spacing: .075em;
        }

        .v3PriorityBody > strong {
          color: #0b1830;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -.025em;
        }

        .v3PriorityBody > p {
          margin-top: 4px;
          color: #728096;
          font-size: 9px;
          line-height: 1.4;
        }

        .v3PriorityResolution {
          margin-top: 7px;
          padding: 6px 9px;
          border-radius: 8px;
          background: rgba(248,250,252,.83);
          color: #526174;
          font-size: 8px;
          box-shadow: none;
        }

        .v3PriorityResolution::before {
          content: "↳";
          margin-right: 5px;
          color: #94a3b8;
          font-weight: 900;
        }

        .v3PriorityResolution b {
          color: #26364b;
        }

        .v3PriorityCta {
          min-height: 32px;
          padding: 0 12px;
          border-radius: 9px;
          background: #0b1f3a;
          border-color: #0b1f3a;
          color: #ffffff;
          box-shadow: 0 6px 14px
            rgba(11,31,58,.13);
        }

        .v3PriorityItem.red
        .v3PriorityCta {
          border-color: rgba(185,28,28,.92);
          background: #b91c1c;
          color: #ffffff;
        }

        .v3PriorityItem.orange
        .v3PriorityCta {
          border-color: rgba(180,83,9,.94);
          background: #b45309;
          color: #ffffff;
        }

        .v3PriorityItem.blue
        .v3PriorityCta {
          border-color: rgba(29,78,216,.94);
          background: #1d4ed8;
          color: #ffffff;
        }

        .v3PriorityItem:hover
        .v3PriorityCta {
          transform: translateX(2px);
          filter: brightness(.97);
          box-shadow: 0 8px 18px
            rgba(15,23,42,.15);
        }

        .v3Activity {
          overflow: hidden;
          background: linear-gradient(
              180deg,
              #ffffff 0%,
              #fbfdff 62%,
              #f7faff 100%
            );
        }

        .v3Activity::after {
          content: "";
          position: absolute;
          right: 22px;
          bottom: 20px;
          width: 175px;
          height: 110px;
          pointer-events: none;
          opacity: .32;
          background-image: radial-gradient(
              rgba(59,130,246,.22)
              1px,
              transparent 1px
            );
          background-size: 12px 12px;
          mask-image: linear-gradient(
              135deg,
              transparent 5%,
              #000 100%
            );
        }

        .v3Activity > * {
          position: relative;
          z-index: 1;
        }

        .v3Activity h3 {
          margin-top: 18px;
          margin-bottom: 12px;
          color: #0b1830;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -.025em;
        }

        .v3ActivityList {
          gap: 7px;
        }

        .v3ActivityList::before {
          left: 18px;
          top: 18px;
          bottom: 18px;
          background: linear-gradient(
              180deg,
              rgba(59,130,246,.32),
              rgba(148,163,184,.12)
            );
        }

        .v3ActivityEvent {
          min-height: 49px !important;
          padding: 6px 8px 6px 4px !important;
          border: 1px solid
            rgba(226,232,240,.72) !important;
          border-radius: 13px !important;
          background: rgba(255,255,255,.72) !important;
          box-shadow: 0 4px 13px
            rgba(15,23,42,.025);
        }

        .v3ActivityEvent:hover {
          border-color: rgba(148,163,184,.26) !important;
          background: #ffffff !important;
          box-shadow: 0 8px 19px
            rgba(15,23,42,.055);
        }

        .v3ActivityEvent::before {
          background: linear-gradient(
              135deg,
              #60a5fa,
              #2563eb
            ) !important;
        }

        .v3ActivityEvent > strong {
          color: #2563eb !important;
          background: #f5f9ff !important;
          border-color: #dcecff !important;
        }

        .v3ActivityEvent.success::before {
          background: linear-gradient(
              135deg,
              #4ade80,
              #16a34a
            ) !important;
          box-shadow: 0 0 0 1px
              rgba(34,197,94,.14),
            0 4px 10px
              rgba(22,163,74,.18) !important;
        }

        .v3ActivityEvent.success
        > strong {
          color: #15803d !important;
          background: #f2fcf5 !important;
          border-color: #d7f4df !important;
        }

        .v3ActivityEvent.warning::before {
          background: linear-gradient(
              135deg,
              #fbbf24,
              #d97706
            ) !important;
          box-shadow: 0 0 0 1px
              rgba(245,158,11,.15),
            0 4px 10px
              rgba(217,119,6,.17) !important;
        }

        .v3ActivityEvent.warning
        > strong {
          color: #b45309 !important;
          background: #fffaf0 !important;
          border-color: #fde7b3 !important;
        }

        .v3ActivityEvent.error {
          border-color: rgba(248,113,113,.18) !important;
          background: linear-gradient(
              90deg,
              rgba(255,255,255,.88),
              rgba(254,242,242,.72)
            ) !important;
        }

        .v3ActivityEvent.error::before {
          background: linear-gradient(
              135deg,
              #fb7185,
              #dc2626
            ) !important;
          box-shadow: 0 0 0 1px
              rgba(239,68,68,.15),
            0 4px 10px
              rgba(220,38,38,.18) !important;
        }

        .v3ActivityEvent.error
        > strong {
          color: #b91c1c !important;
          background: #fff5f5 !important;
          border-color: #ffd8d8 !important;
        }

        .v3ActivityEvent > span {
          color: #17243a !important;
          font-size: 11px !important;
          font-weight: 800 !important;
        }

        .v3CardHeader {
          min-height: 42px;
        }

        .v3CardHeader strong {
          color: #42516a;
          letter-spacing: .12em;
        }

        @media (max-width: 900px) {
          .v3PriorityItem {
            min-height: auto;
            padding: 12px;
          }
          .v3PriorityCta {
            margin-top: 9px;
          }
          .v3Activity::after {
            display: none;
          }
        }

        .v3Activity::after {
          display: none !important;
        }

        .v3Activity h3 {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 20px 0 16px !important;
          color: #0b1830;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -.03em;
        }

        .v3Activity h3::after {
          content: "LIVE";
          display: inline-flex;
          align-items: center;
          height: 21px;
          padding: 0 8px;
          border: 1px solid
            #d7eadc;
          border-radius: 999px;
          background: #f3fbf5;
          color: #15803d;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .v3ActivityList {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow: hidden;
          margin: 0;
          padding: 4px 14px;
          border: 1px solid
            #e6edf5;
          border-radius: 16px;
          background: linear-gradient(
              180deg,
              #ffffff,
              #fbfdff
            );
          box-shadow: 0 7px 22px
            rgba(15,23,42,.035);
        }

        .v3ActivityList::before {
          display: none !important;
        }

        .v3ActivityList::after {
          content: "Inserat-AI überwacht Veröffentlichungen und Portalaktivitäten automatisch.";
          display: block;
          padding: 12px 6px 9px;
          border-top: 1px solid
            #edf2f7;
          color: #94a3b8;
          font-size: 8px;
          font-weight: 700;
          line-height: 1.4;
        }

        .v3ActivityEvent {
          position: relative;
          display: grid !important;
          grid-template-columns: 30px minmax(0,1fr) 30px !important;
          align-items: center;
          gap: 10px;
          min-height: 58px !important;
          margin: 0 !important;
          padding: 7px 4px !important;
          border: 0 !important;
          border-bottom: 1px solid
            #edf2f7 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
        }

        .v3ActivityEvent:last-of-type {
          border-bottom: 0 !important;
        }

        .v3ActivityEvent:hover {
          padding-left: 7px !important;
          background: linear-gradient(
              90deg,
              rgba(247,250,253,.9),
              transparent
            ) !important;
        }

        .v3ActivityEvent::before {
          content: "";
          display: block !important;
          width: 9px !important;
          height: 9px !important;
          margin: 0 auto !important;
          border: 3px solid
            #ffffff !important;
          border-radius: 999px !important;
          background: #3b82f6 !important;
          box-shadow: 0 0 0 1px
              #bfdbfe,
            0 3px 8px
              rgba(59,130,246,.18) !important;
        }

        .v3ActivityEvent.success::before {
          background: #22c55e !important;
          box-shadow: 0 0 0 1px
              #bbf7d0,
            0 3px 8px
              rgba(34,197,94,.17) !important;
        }

        .v3ActivityEvent.warning::before {
          background: #f59e0b !important;
          box-shadow: 0 0 0 1px
              #fde68a,
            0 3px 8px
              rgba(245,158,11,.17) !important;
        }

        .v3ActivityEvent.error {
          margin: 5px 0 !important;
          padding: 9px 8px 9px 4px !important;
          border: 1px solid
            #fee2e2 !important;
          border-radius: 11px !important;
          background: linear-gradient(
              90deg,
              #fffafa,
              #ffffff
            ) !important;
        }

        .v3ActivityEvent.error::before {
          background: #ef4444 !important;
          box-shadow: 0 0 0 1px
              #fecaca,
            0 3px 8px
              rgba(239,68,68,.18) !important;
        }

        .v3ActivityEvent > span {
          overflow: hidden;
          color: #18263a !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: -.01em;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v3ActivityEvent.error > span {
          color: #991b1b !important;
        }

        .v3ActivityEvent > strong {
          display: inline-flex !important;
          width: 27px !important;
          height: 27px !important;
          align-items: center;
          justify-content: center;
          border: 1px solid
            #e2e8f0 !important;
          border-radius: 9px !important;
          background: #ffffff !important;
          color: #64748b !important;
          font-size: 10px !important;
          font-weight: 900 !important;
          box-shadow: none !important;
        }

        .v3ActivityEvent.error > strong {
          border-color: #fecaca !important;
          background: #fff7f7 !important;
          color: #dc2626 !important;
        }

        .v3ActivityEvent.success > strong {
          color: #15803d !important;
        }

        .v3ActivityEvent.warning > strong {
          color: #b45309 !important;
        }

        :root {
          --ia-navy: #07182d;
          --ia-navy-2: #0b2342;
          --ia-navy-3: #13365d;
          --ia-blue-soft: #eef5fb;
          --ia-blue-soft-2: #f6faff;
          --ia-blue-border: #d8e4f0;
          --ia-amber: #f3b233;
          --ia-amber-2: #d98b11;
          --ia-amber-soft: #fff7e8;
          --ia-red-soft: #fff7f7;
          --ia-red-border: #f4d0d0;
        }

        .v3WorkCard,
        .v3Activity {
          border: 1px solid
            var(--ia-blue-border) !important;
          background: linear-gradient(
              180deg,
              #fbfdff 0%,
              #f4f8fc 100%
            ) !important;
          box-shadow: 0 14px 34px
              rgba(7,24,45,.045),
            0 2px 7px
              rgba(7,24,45,.025) !important;
        }

        .v3WorkCard::before {
          background: linear-gradient(
              90deg,
              transparent,
              rgba(243,178,51,.70),
              rgba(11,35,66,.40),
              transparent
            ) !important;
        }

        .v3Activity::before {
          background: linear-gradient(
              90deg,
              transparent,
              rgba(19,54,93,.75),
              rgba(243,178,51,.34),
              transparent
            ) !important;
        }

        .v3CardHeader strong,
        .v3ActivityHeader strong {
          color: #5f7390 !important;
        }

        .v3WorkCard h3,
        .v3Activity h3 {
          color: var(--ia-navy) !important;
        }

        .v3Activity h3::after {
          border-color: #d6eadb !important;
          background: #f2fbf5 !important;
          color: #15803d !important;
        }

        .v3PriorityList {
          padding: 2px 0;
        }

        .v3PriorityItem {
          border-width: 1px !important;
          box-shadow: 0 8px 22px
            rgba(7,24,45,.028) !important;
        }

        .v3PriorityItem.red {
          border-color: var(--ia-red-border) !important;
          background: linear-gradient(
              135deg,
              #fffdfd 0%,
              #fff8f8 100%
            ) !important;
        }

        .v3PriorityItem.orange {
          border-color: #edd5a6 !important;
          background: linear-gradient(
              135deg,
              #fffdfa 0%,
              var(--ia-amber-soft) 100%
            ) !important;
        }

        .v3PriorityItem.blue {
          border-color: #d4e1ec !important;
          background: linear-gradient(
              135deg,
              #fcfeff 0%,
              var(--ia-blue-soft) 100%
            ) !important;
        }

        .v3PriorityBody small {
          color: #7c8ea7 !important;
        }

        .v3PriorityItem.red
        .v3PriorityBody small {
          color: #b91c1c !important;
        }

        .v3PriorityItem.orange
        .v3PriorityBody small {
          color: #b26a00 !important;
        }

        .v3PriorityItem.blue
        .v3PriorityBody small {
          color: #24507f !important;
        }

        .v3PriorityBody > strong {
          color: var(--ia-navy) !important;
        }

        .v3PriorityBody > p {
          color: #71839a !important;
        }

        .v3PriorityResolution {
          border: 1px solid
            #dce7f1 !important;
          background: rgba(255,255,255,.72) !important;
          color: #5e6f86 !important;
        }

        .v3PriorityItem.orange
        .v3PriorityResolution {
          border-color: #ead9b4 !important;
          background: rgba(255,251,243,.76) !important;
        }

        .v3PriorityItem.red
        .v3PriorityResolution {
          border-color: #f1d6d6 !important;
          background: rgba(255,250,250,.76) !important;
        }

        .v3PriorityCta {
          background: linear-gradient(
              180deg,
              var(--ia-navy-3) 0%,
              var(--ia-navy) 100%
            ) !important;
          border: 1px solid
            rgba(7,24,45,.92) !important;
          color: #ffffff !important;
          box-shadow: 0 9px 18px
            rgba(7,24,45,.13) !important;
        }

        .v3PriorityItem.orange
        .v3PriorityCta {
          background: linear-gradient(
              180deg,
              #e6a126 0%,
              #c97a09 100%
            ) !important;
          border-color: #be7208 !important;
          box-shadow: 0 8px 17px
            rgba(201,122,9,.18) !important;
        }

        .v3PriorityItem.red
        .v3PriorityCta {
          background: linear-gradient(
              180deg,
              #d53030 0%,
              #b81f1f 100%
            ) !important;
          border-color: #a91b1b !important;
          box-shadow: 0 8px 18px
            rgba(184,31,31,.16) !important;
        }

        .v3Activity {
          background: linear-gradient(
              180deg,
              #f9fcff 0%,
              #eff5fb 100%
            ) !important;
        }

        .v3ActivityList {
          border: 1px solid
            #d8e5f0 !important;
          background: linear-gradient(
              180deg,
              #ffffff 0%,
              #f7fbff 100%
            ) !important;
          box-shadow: inset 0 1px 0
              rgba(255,255,255,.9),
            0 8px 18px
              rgba(7,24,45,.03) !important;
        }

        .v3ActivityList::after {
          color: #7e91aa !important;
        }

        .v3ActivityEvent {
          border-bottom: 1px solid
            #e4edf5 !important;
        }

        .v3ActivityEvent:hover {
          background: linear-gradient(
              90deg,
              rgba(236,244,251,.88),
              rgba(255,255,255,.28)
            ) !important;
        }

        .v3ActivityEvent > span {
          color: #15243b !important;
        }

        .v3ActivityEvent > strong {
          border: 1px solid
            #d8e2ed !important;
          background: #ffffff !important;
          color: #4f6480 !important;
        }

        .v3ActivityEvent.success > strong {
          color: #15803d !important;
        }

        .v3ActivityEvent.warning > strong {
          color: #b26a00 !important;
        }

        .v3ActivityEvent.error {
          border: 1px solid
            var(--ia-red-border) !important;
          background: linear-gradient(
              90deg,
              var(--ia-red-soft),
              #ffffff
            ) !important;
        }

        .v3ActivityEvent.error > span {
          color: #a11e1e !important;
        }

        .v3ActivityEvent.error > strong {
          border-color: #f3c6c6 !important;
          background: #fff9f9 !important;
          color: #cf2f2f !important;
        }

        .v3Warning {
          border: 1px solid
            #efcf94 !important;
          background: linear-gradient(
              180deg,
              #fff9ea 0%,
              #fff3d7 100%
            ) !important;
          color: #b26a00 !important;
        }

        .v3WorkCard,
        .v3Activity {
          border: 1px solid #c4d6e7 !important;
          background: linear-gradient(
              145deg,
              #e9f2fa 0%,
              #f4f8fc 48%,
              #e6eff7 100%
            ) !important;
          box-shadow: 0 16px 36px
            rgba(7,24,45,.09) !important;
        }

        .v3WorkCard .v3CardHeader,
        .v3Activity .v3CardHeader {
          min-height: 50px !important;
          margin: -1px -1px 16px !important;
          padding: 0 16px !important;
          border: 0 !important;
          border-radius: 20px 20px 12px 12px !important;
          background: linear-gradient(
              115deg,
              #061629 0%,
              #0a2748 56%,
              #16436f 100%
            ) !important;
          box-shadow: 0 10px 22px
            rgba(7,24,45,.18) !important;
        }

        .v3WorkCard .v3CardHeader::after,
        .v3Activity .v3CardHeader::after {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 0;
          height: 2px;
          background: linear-gradient(
              90deg,
              transparent,
              #f3b233,
              #ffd467,
              #f3b233,
              transparent
            );
        }

        .v3WorkCard .v3CardHeader strong,
        .v3Activity .v3CardHeader strong {
          color: #ffffff !important;
          font-weight: 900 !important;
          letter-spacing: .13em !important;
        }

        .v3Lightning,
        .v3Bars {
          color: #f3b233 !important;
        }

        .v3Warning {
          border: 1px solid #f6d170 !important;
          background: linear-gradient(
              180deg,
              #ffd66b,
              #efa91f
            ) !important;
          color: #07182d !important;
          box-shadow: 0 5px 13px
            rgba(239,169,31,.25) !important;
        }

        .v3PriorityItem.red {
          border-color: #eabbbb !important;
          background: linear-gradient(
              135deg,
              #fff9f9,
              #fdeaea
            ) !important;
        }

        .v3PriorityItem.orange {
          border-color: #e0bd69 !important;
          background: linear-gradient(
              135deg,
              #fff8e8,
              #fbe6ac
            ) !important;
        }

        .v3PriorityItem.blue {
          border-color: #b7cce0 !important;
          background: linear-gradient(
              135deg,
              #f3f9ff,
              #d7e7f4
            ) !important;
        }

        .v3PriorityBody > strong {
          color: #07182d !important;
        }

        .v3PriorityResolution {
          border: 1px solid
            rgba(77,105,134,.25) !important;
          background: rgba(255,255,255,.58) !important;
          color: #496078 !important;
        }

        .v3PriorityCta,
        .v3PriorityItem.orange .v3PriorityCta {
          border: 1px solid #07182d !important;
          background: linear-gradient(
              180deg,
              #173f69,
              #07182d
            ) !important;
          color: #ffffff !important;
          box-shadow: 0 8px 17px
            rgba(7,24,45,.20) !important;
        }

        .v3PriorityItem.red .v3PriorityCta {
          border-color: #9f1717 !important;
          background: linear-gradient(
              180deg,
              #d23636,
              #a41717
            ) !important;
          color: #ffffff !important;
        }

        .v3Activity h3 {
          color: #07182d !important;
        }

        .v3ActivityList {
          border: 1px solid #bfd3e5 !important;
          background: linear-gradient(
              180deg,
              #f7fbff 0%,
              #e6f0f8 100%
            ) !important;
          box-shadow: 0 9px 22px
            rgba(7,24,45,.06) !important;
        }

        .v3ActivityList::after {
          margin: 8px 0 3px !important;
          padding: 10px 11px !important;
          border: 1px solid
            #c8dae9 !important;
          border-radius: 9px;
          background: linear-gradient(
              90deg,
              #d8e8f4,
              #edf5fb
            );
          color: #3f5f7e !important;
          font-weight: 800 !important;
        }

        .v3ActivityEvent {
          border-bottom-color: #cbddea !important;
        }

        .v3ActivityEvent:hover {
          background: rgba(255,255,255,.48) !important;
        }

        .v3ActivityEvent > span {
          color: #0a2038 !important;
        }

        .v3ActivityEvent > strong {
          border-color: #bcd0e2 !important;
          background: linear-gradient(
              180deg,
              #ffffff,
              #e8f1f8
            ) !important;
          color: #163e66 !important;
        }

        .v3ActivityEvent.error {
          border: 1px solid
            #e9baba !important;
          background: linear-gradient(
              90deg,
              #fff2f2,
              #fff9f9
            ) !important;
        }

        .v3ActivityEvent.error > strong {
          border-color: #e9b6b6 !important;
          background: #fff3f3 !important;
          color: #c62828 !important;
        }

        .v3Today {
          border: 1px solid #c3d6e8 !important;
          background: linear-gradient(
              145deg,
              #eaf3fb 0%,
              #f7faff 52%,
              #e7f0f8 100%
            ) !important;
          box-shadow: 0 16px 36px
            rgba(7,24,45,.075) !important;
        }

        .v3TodayHeader {
          position: relative;
          margin: -1px -1px 16px !important;
          padding: 15px 17px !important;
          border: 0 !important;
          border-radius: 20px 20px 13px 13px !important;
          background: linear-gradient(
              115deg,
              #061629 0%,
              #0a2748 58%,
              #16436f 100%
            ) !important;
          box-shadow: 0 10px 23px
            rgba(7,24,45,.17) !important;
        }

        .v3TodayHeader::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;
          height: 2px;
          background: linear-gradient(
              90deg,
              transparent,
              #f3b233,
              #ffd66b,
              #f3b233,
              transparent
            );
        }

        .v3TodayTitle h2 {
          color: #ffffff !important;
        }

        .v3TodayTitle p {
          color: #a9bfd4 !important;
        }

        .v3SectionLabel {
          color: #f3b233 !important;
        }

        .v3Calendar {
          border-color: rgba(243,178,51,.23) !important;
          background: rgba(243,178,51,.12) !important;
          color: #f6c453 !important;
        }

        .v3Date strong {
          color: #ffffff !important;
        }

        .v3Date small {
          color: #9eb6cc !important;
        }

        .v3Sun {
          color: #f3b233 !important;
        }

        .v3Kpis {
          gap: 11px !important;
        }

        .v3Kpis article {
          position: relative;
          overflow: hidden;
          border: 1px solid #c6d8e7 !important;
          border-radius: 15px !important;
          background: linear-gradient(
              145deg,
              #f8fbfe,
              #edf4fa
            ) !important;
          box-shadow: 0 7px 18px
            rgba(7,24,45,.045) !important;
        }

        .v3Kpis article::after {
          content: "";
          position: absolute;
          top: -40px;
          right: -32px;
          width: 92px;
          height: 92px;
          border-radius: 999px;
          opacity: .18;
        }

        .v3Kpis .blue::after {
          background: #3b82f6;
        }

        .v3Kpis .green::after {
          background: #22c55e;
        }

        .v3Kpis .orange::after {
          background: #f3b233;
        }

        .v3Kpis .violet::after {
          background: #805ad5;
        }

        .v3Kpis article strong,
        .v3Kpis article b {
          color: #07182d !important;
        }

        .v3Kpis article small {
          color: #6f839b !important;
        }

        .v3Kpis article > i {
          color: #173f69 !important;
        }

        .v3KpiIcon {
          border: 1px solid
            rgba(7,24,45,.08) !important;
          box-shadow: inset 0 1px 0
            rgba(255,255,255,.8) !important;
        }

        .v3Portals {
          position: relative;
          overflow: hidden;
          border: 1px solid #c4d6e7 !important;
          background: linear-gradient(
              145deg,
              #e9f2fa 0%,
              #f5f9fc 54%,
              #e5eef7 100%
            ) !important;
          box-shadow: 0 16px 36px
            rgba(7,24,45,.075) !important;
        }

        .v3Portals::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 3px;
          background: linear-gradient(
              90deg,
              #07182d,
              #16436f,
              #f3b233,
              #16436f,
              #07182d
            );
        }

        .v3Portals header {
          padding: 15px 17px 13px !important;
        }

        .v3PortalIcon {
          border: 1px solid
            rgba(243,178,51,.28) !important;
          background: linear-gradient(
              145deg,
              #0c2c4e,
              #07182d
            ) !important;
          color: #f3b233 !important;
          box-shadow: 0 7px 16px
            rgba(7,24,45,.15) !important;
        }

        .v3PortalTitle h2 {
          color: #07182d !important;
        }

        .v3PortalTitle p {
          color: #6c8097 !important;
        }

        .v3Portals header > a {
          padding: 7px 10px;
          border: 1px solid #c0d2e3;
          border-radius: 9px;
          background: rgba(255,255,255,.56);
          color: #143d64 !important;
          font-weight: 850 !important;
        }

        .v3PortalLogos {
          gap: 9px !important;
          padding: 0 14px 14px !important;
        }

        .v3PortalLogos > div {
          min-height: 58px;
          border: 1px solid #bfd2e3 !important;
          border-radius: 13px !important;
          background: linear-gradient(
              145deg,
              rgba(255,255,255,.82),
              rgba(232,241,248,.90)
            ) !important;
          box-shadow: 0 6px 14px
            rgba(7,24,45,.035) !important;
          transition: transform .16s ease,
            border-color .16s ease,
            box-shadow .16s ease;
        }

        .v3PortalLogos > div:hover {
          transform: translateY(-2px);
          border-color: #94b4d0 !important;
          box-shadow: 0 10px 22px
            rgba(7,24,45,.075) !important;
        }

        .v3Publishing {
          position: relative;
          overflow: hidden;
          padding: 3px;
          border: 1px solid #c3d6e8 !important;
          border-radius: 21px !important;
          background: linear-gradient(
              135deg,
              #07182d 0%,
              #12395f 48%,
              #f3b233 100%
            ) !important;
          box-shadow: 0 17px 38px
            rgba(7,24,45,.10) !important;
        }

        .v3Publishing::before {
          content: "PUBLISHING CENTER";
          position: absolute;
          top: 9px;
          right: 18px;
          z-index: 1;
          color: rgba(255,255,255,.48);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .18em;
          pointer-events: none;
        }

        .v3Publishing > * {
          position: relative;
          z-index: 2;
        }

        @media (max-width: 900px) {
          .v3TodayHeader {
            border-radius: 17px 17px 11px 11px !important;
          }
          .v3PortalLogos {
            gap: 8px !important;
          }
          .v3Publishing::before {
            display: none;
          }
        }


        /*
         * COMMAND_CENTER_ACTION_EXECUTION_V1
         */

        .v3PriorityButton {
          width: 100%;
          box-sizing: border-box;
          appearance: none;
          font: inherit;
          text-align: left;
          color: inherit;
          cursor: pointer;
        }

        .v3PriorityButton:disabled {
          cursor: wait;
          opacity: 0.76;
        }

        .v3CommandActionError {
          margin: 12px 14px 0;
          border: 1px solid rgba(220, 38, 38, 0.24);
          border-radius: 12px;
          background: rgba(254, 226, 226, 0.72);
          padding: 10px 12px;
          color: #991b1b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

      `}</style>
    </main>
  );
}
