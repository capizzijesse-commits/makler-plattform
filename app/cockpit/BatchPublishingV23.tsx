"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";


type Listing = {
  id: string;
  projectName: string | null;
  location: string;
  postalCode: string | null;
  propertyType: string;
  updatedAt: string;
  generatedVariants: unknown;
  archivedAt: string | null;
  images: unknown[];
};


type Scope =
  | "today"
  | "week"
  | "month"
  | "all";


export default function BatchPublishingV23({
  listings,
}: {
  listings: Listing[];
}) {

  /*
   * BATCH_PUBLISHING_V23
   *
   * Foundation only.
   * No dispatch.
   * No DB write.
   */

  const [
    scope,
    setScope,
  ] =
    useState<Scope>(
      "today"
    );

  const [
    selected,
    setSelected,
  ] =
    useState<Set<string>>(
      () =>
        new Set()
    );

  const [
    preview,
    setPreview,
  ] =
    useState(false);


  function generated(
    listing: Listing
  ) {

    return (
      Array.isArray(
        listing.generatedVariants
      ) &&
      listing.generatedVariants.length >
        0
    );
  }


  function ready(
    listing: Listing
  ) {

    return (
      generated(listing) &&
      listing.images.length >
        0
    );
  }


  function startDate() {

    const now =
      new Date();

    now.setHours(
      0,
      0,
      0,
      0
    );


    if (
      scope ===
      "today"
    ) {
      return now;
    }


    if (
      scope ===
      "week"
    ) {

      const day =
        now.getDay();

      const offset =
        day === 0
          ? 6
          : day - 1;

      now.setDate(
        now.getDate() -
          offset
      );

      return now;
    }


    if (
      scope ===
      "month"
    ) {

      now.setDate(
        1
      );

      return now;
    }


    return null;
  }


  const visible =
    useMemo(
      () => {

        const start =
          startDate();


        return listings
          .filter(
            (listing) =>
              !listing.archivedAt
          )
          .filter(
            (listing) => {

              if (!start) {
                return true;
              }


              const date =
                new Date(
                  listing.updatedAt
                );


              return (
                !Number.isNaN(
                  date.getTime()
                ) &&
                date >= start
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.updatedAt
              ).getTime() -
              new Date(
                a.updatedAt
              ).getTime()
          );
      },
      [
        listings,
        scope,
      ]
    );


  const readyListings =
    visible.filter(
      ready
    );


  const selectedListings =
    readyListings.filter(
      (listing) =>
        selected.has(
          listing.id
        )
    );


  function toggle(
    id: string
  ) {

    setSelected(
      (current) => {

        const next =
          new Set(
            current
          );


        if (
          next.has(id)
        ) {
          next.delete(id);
        }
        else {
          next.add(id);
        }


        return next;
      }
    );
  }


  function selectAll() {

    setSelected(
      new Set(
        readyListings.map(
          (listing) =>
            listing.id
        )
      )
    );
  }


  function clear() {

    setSelected(
      new Set()
    );
  }


  const scopes:
    Array<{
      id: Scope;
      label: string;
    }> = [
      {
        id: "today",
        label: "Heute",
      },
      {
        id: "week",
        label: "Woche",
      },
      {
        id: "month",
        label: "Monat",
      },
      {
        id: "all",
        label: "Alle",
      },
    ];


  return (
    <>
      <section
        className="batch23"
        id="batch-publishing"
      >
        <header className="batch23Header">
          <div>
            <span className="batch23Eyebrow">
              PUBLISHING
            </span>

            <h2>
              Veröffentlichungs-Mappe
            </h2>

            <p>
              Fertige Objekte gesammelt prüfen und für die Veröffentlichung vorbereiten.
            </p>
          </div>

          <div className="batch23Ready">
            <strong>
              {readyListings.length}
            </strong>

            <span>
              bereit
            </span>
          </div>
        </header>


        <div className="batch23Toolbar">
          <div className="batch23Scopes">
            {scopes.map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    scope === item.id
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setScope(
                      item.id
                    );
                    clear();
                  }}
                >
                  {item.label}
                </button>
              )
            )}
          </div>


          <div className="batch23Tools">
            <button
              type="button"
              disabled={
                readyListings.length ===
                  0
              }
              onClick={
                selectAll
              }
            >
              Alle fertigen auswählen
            </button>

            {selected.size > 0 && (
              <button
                type="button"
                onClick={
                  clear
                }
              >
                Auswahl löschen
              </button>
            )}
          </div>
        </div>


        <div className="batch23Summary">
          <span>
            {visible.length} Objekte
          </span>

          <span>
            {readyListings.length} bereit
          </span>

          <span>
            {
              visible.length -
              readyListings.length
            } Aktion nötig
          </span>

          <strong>
            {selectedListings.length} ausgewählt
          </strong>
        </div>


        {visible.length === 0 ? (
          <div className="batch23Empty">
            Keine aktiven Objekte in diesem Zeitraum.
          </div>
        ) : (
          <div className="batch23Rows">
            {visible.map(
              (listing) => {

                const isReady =
                  ready(listing);

                const isSelected =
                  selected.has(
                    listing.id
                  );


                return (
                  <div
                    key={
                      listing.id
                    }
                    className={
                      isSelected
                        ? "batch23Row selected"
                        : "batch23Row"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        isSelected
                      }
                      disabled={
                        !isReady
                      }
                      onChange={() =>
                        toggle(
                          listing.id
                        )
                      }
                    />


                    <div className="batch23Object">
                      <strong>
                        {
                          listing
                            .projectName
                            ?.trim() ||
                          listing.propertyType +
                            " in " +
                            listing.location
                        }
                      </strong>

                      <small>
                        {
                          listing.postalCode
                            ? listing.postalCode +
                              " "
                            : ""
                        }
                        {
                          listing.location
                        }
                      </small>
                    </div>


                    <div className="batch23Checks">
                      <span
                        className={
                          generated(
                            listing
                          )
                            ? "ok"
                            : "open"
                        }
                      >
                        Inserat{" "}
                        {
                          generated(
                            listing
                          )
                            ? "✓"
                            : "–"
                        }
                      </span>

                      <span
                        className={
                          listing.images.length >
                            0
                            ? "ok"
                            : "open"
                        }
                      >
                        Bilder{" "}
                        {
                          listing.images.length >
                            0
                            ? "✓"
                            : "–"
                        }
                      </span>
                    </div>


                    <span
                      className={
                        isReady
                          ? "batch23Status ready"
                          : "batch23Status action"
                      }
                    >
                      {
                        isReady
                          ? "Bereit"
                          : "Aktion nötig"
                      }
                    </span>


                    <Link
                      href={
                        isReady
                          ? "/cockpit/" +
                            listing.id +
                            "#portal-publishing"
                          : "/cockpit/" +
                            listing.id +
                            "/edit"
                      }
                    >
                      {
                        isReady
                          ? "Publishing"
                          : "Öffnen"
                      }
                    </Link>
                  </div>
                );
              }
            )}
          </div>
        )}


        <footer className="batch23Footer">
          <div>
            <strong>
              {selectedListings.length} ausgewählt
            </strong>

            <span>
              Bereit für die Veröffentlichungs-Vorschau
            </span>
          </div>

          <button
            type="button"
            disabled={
              selectedListings.length ===
                0
            }
            onClick={() =>
              setPreview(true)
            }
          >
            Auswahl prüfen
          </button>
        </footer>
      </section>


      {preview && (
        <div
          className="batch23Backdrop"
          onMouseDown={() =>
            setPreview(false)
          }
        >
          <section
            className="batch23Modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span className="batch23Eyebrow">
                  VORSCHAU
                </span>

                <h3>
                  {selectedListings.length} Objekte prüfen
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreview(false)
                }
              >
                ×
              </button>
            </header>


            <div className="batch23Notice">
              Noch keine Veröffentlichung ausgelöst.
              Jeder Eintrag führt zuerst in das bestehende Publishing Center.
            </div>


            <div className="batch23PreviewRows">
              {selectedListings.map(
                (listing) => (
                  <div
                    key={
                      listing.id
                    }
                  >
                    <span>
                      <strong>
                        {
                          listing
                            .projectName
                            ?.trim() ||
                          listing.propertyType +
                            " in " +
                            listing.location
                        }
                      </strong>

                      <small>
                        {
                          listing.location
                        }
                      </small>
                    </span>

                    <Link
                      href={
                        "/cockpit/" +
                        listing.id +
                        "#portal-publishing"
                      }
                    >
                      Ziele prüfen
                    </Link>
                  </div>
                )
              )}
            </div>


            <footer>
              <span>
                Batch-Dispatch ist deaktiviert.
              </span>

              <button
                type="button"
                onClick={() =>
                  setPreview(false)
                }
              >
                Fertig
              </button>
            </footer>
          </section>
        </div>
      )}


      <style jsx>{`
        .batch23 {
          margin-top: 22px;
          padding: 22px;
          border: 1px solid #dce5ef;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 16px 36px rgba(15,23,42,.055);
        }

        .batch23Header,
        .batch23Toolbar,
        .batch23Footer,
        .batch23Modal header,
        .batch23Modal footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .batch23Header {
          align-items: flex-start;
        }

        .batch23Header h2,
        .batch23Modal h3 {
          margin: 0;
          color: #0f172a;
        }

        .batch23Header h2 {
          font-size: 23px;
        }

        .batch23Header p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .batch23Eyebrow {
          display: block;
          margin-bottom: 5px;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .batch23Ready {
          min-width: 72px;
          padding: 9px 12px;
          border-radius: 11px;
          background: #f8fafc;
          text-align: center;
        }

        .batch23Ready strong {
          display: block;
          color: #0f172a;
          font-size: 20px;
        }

        .batch23Ready span {
          color: #64748b;
          font-size: 9px;
        }

        .batch23Toolbar {
          margin-top: 18px;
        }

        .batch23Scopes,
        .batch23Tools {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .batch23Scopes button,
        .batch23Tools button,
        .batch23Footer button {
          min-height: 34px;
          padding: 0 11px;
          border: 1px solid #dce5ef;
          border-radius: 9px;
          background: #f8fafc;
          color: #475569;
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
        }

        .batch23Scopes button.active {
          background: #0b2748;
          border-color: #0b2748;
          color: white;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: .4;
        }

        .batch23Summary {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .batch23Summary span,
        .batch23Summary strong {
          padding: 5px 8px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 9px;
        }

        .batch23Summary strong {
          background: #fff7dc;
          color: #b45309;
        }

        .batch23Rows {
          margin-top: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .batch23Row {
          display: grid;
          grid-template-columns:
            24px
            minmax(180px, 1fr)
            minmax(150px, .7fr)
            90px
            80px;
          align-items: center;
          gap: 10px;
          min-height: 60px;
          padding: 8px 12px;
          border-bottom: 1px solid #edf2f7;
        }

        .batch23Row:last-child {
          border-bottom: 0;
        }

        .batch23Row.selected {
          background: #fffdf5;
        }

        .batch23Object {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .batch23Object strong {
          overflow: hidden;
          color: #0f172a;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .batch23Object small {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 8px;
        }

        .batch23Checks {
          display: flex;
          gap: 5px;
        }

        .batch23Checks span,
        .batch23Status {
          padding: 4px 6px;
          border-radius: 7px;
          font-size: 8px;
          font-weight: 850;
        }

        .batch23Checks .ok,
        .batch23Status.ready {
          background: #eaf9f0;
          color: #15803d;
        }

        .batch23Checks .open {
          background: #f1f5f9;
          color: #94a3b8;
        }

        .batch23Status.action {
          background: #fff7dc;
          color: #b45309;
        }

        .batch23Row a {
          color: #173c69;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
        }

        .batch23Empty {
          margin-top: 12px;
          padding: 22px;
          border-radius: 11px;
          background: #f8fafc;
          color: #64748b;
          font-size: 10px;
          text-align: center;
        }

        .batch23Footer {
          margin-top: 13px;
          padding-top: 13px;
          border-top: 1px solid #edf2f7;
        }

        .batch23Footer > div {
          display: flex;
          flex-direction: column;
        }

        .batch23Footer strong {
          color: #0f172a;
          font-size: 10px;
        }

        .batch23Footer span {
          margin-top: 2px;
          color: #94a3b8;
          font-size: 8px;
        }

        .batch23Footer button {
          border: 0;
          background: linear-gradient(135deg,#ffd84d,#f7b928);
          color: #172033;
        }

        .batch23Backdrop {
          position: fixed;
          z-index: 120;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2,10,23,.66);
          backdrop-filter: blur(7px);
        }

        .batch23Modal {
          width: min(620px,100%);
          max-height: 82vh;
          overflow: auto;
          padding: 20px;
          border-radius: 17px;
          background: #fff;
        }

        .batch23Modal header > button {
          width: 32px;
          height: 32px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
        }

        .batch23Notice {
          margin-top: 14px;
          padding: 10px;
          border-radius: 9px;
          background: #fffbeb;
          color: #92400e;
          font-size: 9px;
        }

        .batch23PreviewRows {
          margin-top: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .batch23PreviewRows > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
          border-bottom: 1px solid #edf2f7;
        }

        .batch23PreviewRows > div:last-child {
          border-bottom: 0;
        }

        .batch23PreviewRows span {
          display: flex;
          flex-direction: column;
        }

        .batch23PreviewRows strong {
          color: #0f172a;
          font-size: 9px;
        }

        .batch23PreviewRows small {
          margin-top: 2px;
          color: #94a3b8;
          font-size: 8px;
        }

        .batch23PreviewRows a {
          color: #173c69;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
        }

        .batch23Modal footer {
          margin-top: 14px;
        }

        .batch23Modal footer span {
          color: #94a3b8;
          font-size: 8px;
        }

        .batch23Modal footer button {
          min-height: 36px;
          padding: 0 12px;
          border: 0;
          border-radius: 8px;
          background: #0b2748;
          color: #fff;
        }

        @media (max-width: 850px) {
          .batch23Row {
            grid-template-columns:
              24px
              minmax(0,1fr)
              80px;
          }

          .batch23Checks,
          .batch23Status {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .batch23 {
            padding: 15px;
          }

          .batch23Header,
          .batch23Toolbar,
          .batch23Footer {
            align-items: stretch;
            flex-direction: column;
          }

          .batch23Row {
            grid-template-columns:
              22px
              minmax(0,1fr);
          }

          .batch23Row a {
            grid-column: 2;
          }

          .batch23Footer button {
            width: 100%;
          }
        }

        /*
         * PREMIUM_BATCH_V26
         */

        .batch23 {
          margin-top: 14px !important;
          padding: 20px !important;
          border:
            1px solid
            #e2eaf3 !important;
          border-radius:
            22px !important;
          background:
            linear-gradient(
              180deg,
              #fff,
              #fbfdff
            ) !important;
          box-shadow:
            0 14px 36px
            rgba(31,62,91,.06) !important;
        }


        .batch23Eyebrow {
          color: #1677e8 !important;
        }


        .batch23Header h2 {
          color: #10233e !important;
          font-size: 21px !important;
          font-weight: 800 !important;
        }


        .batch23Header p {
          color: #7b8b9f !important;
        }


        .batch23Ready {
          border: 0 !important;
          background:
            linear-gradient(
              135deg,
              #e9f4ff,
              #dbeeff
            ) !important;
        }


        .batch23Ready strong {
          color: #1677e8 !important;
        }


        .batch23Scopes button.active {
          border-color:
            #116fd4 !important;
          background:
            linear-gradient(
              135deg,
              #1677e8,
              #075fbd
            ) !important;
          color: #fff !important;
          box-shadow:
            0 5px 14px
            rgba(22,119,232,.18);
        }


        .batch23Tools button {
          color: #1677e8 !important;
          background: #fff !important;
        }


        .batch23Rows {
          border-color:
            #e5ecf4 !important;
          border-radius:
            14px !important;
        }


        .batch23Row:hover {
          background:
            #f9fcff !important;
        }


        .batch23Row.selected {
          background:
            #f1f8ff !important;
        }


        .batch23Status.action {
          background:
            #fff1dc !important;
          color:
            #d97000 !important;
        }


        .batch23Status.ready {
          background:
            #def6e8 !important;
          color:
            #168a49 !important;
        }


        .batch23Row a {
          color:
            #1677e8 !important;
        }


        .batch23Footer button {
          min-height:
            39px !important;
          border-radius:
            10px !important;
          background:
            linear-gradient(
              135deg,
              #1677e8,
              #075fbd
            ) !important;
          color:
            #fff !important;
          box-shadow:
            0 8px 18px
            rgba(22,119,232,.19);
        }


        /*
         * MOCKUP_BATCH_V27
         */

        .batch23 {
          margin-top:
            13px !important;

          padding:
            18px 20px !important;

          border-radius:
            20px !important;
        }


        .batch23Header {
          position:
            relative;

          min-height:
            55px;

          padding-left:
            58px;
        }


        .batch23Header::before {
          content:
            "➤";

          position:
            absolute;

          top:
            1px;

          left:
            0;

          display:
            grid;

          width:
            44px;

          height:
            44px;

          place-items:
            center;

          border-radius:
            12px;

          background:
            #eef6ff;

          color:
            #0874df;

          font-size:
            25px;

          transform:
            rotate(-22deg);
        }


        .batch23Header h2 {
          font-size:
            20px !important;
        }


        .batch23Header p {
          margin-top:
            3px !important;
        }


        .batch23Toolbar {
          margin-top:
            12px !important;
        }


        .batch23Scopes button,
        .batch23Tools button {
          border-radius:
            9px !important;
        }


        .batch23Rows {
          margin-top:
            10px !important;
        }


        .batch23Row {
          min-height:
            57px !important;
        }


        .batch23Footer {
          margin-top:
            10px !important;

          padding-top:
            10px !important;
        }

      `}</style>
    </>
  );
}
