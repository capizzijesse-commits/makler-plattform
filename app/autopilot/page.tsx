"use client";

import {
  upload,
} from "@vercel/blob/client";

import { prepareAutopilotImageForUpload } from "@/lib/autopilot-image-compression";

import Link from "next/link";

import {
  type ChangeEvent,
  type DragEvent,
  useRef,
  useState,
} from "react";


const MAX_IMAGE_COUNT = 10;
const MAX_DOCUMENT_COUNT = 1;
const MAX_FILES =
  MAX_IMAGE_COUNT +
  MAX_DOCUMENT_COUNT;

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  15 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


type DraftResponse = {
  success?: boolean;
  listingId?: string;
  error?: string;
};


function safeFileName(
  value: string
) {
  return (
    value
      .normalize("NFKD")
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      ) ||
    "objektbild"
  );
}


export default function AutopilotPage() {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    running,
    setRunning,
  ] =
    useState(false);

  const [
    progress,
    setProgress,
  ] =
    useState(0);

  const [
    stage,
    setStage,
  ] =
    useState(
      "Bilder rein. Inserat-AI macht den Rest."
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    listingId,
    setListingId,
  ] =
    useState<string | null>(
      null
    );


  async function runAutopilot(
    selectedFiles: File[]
  ) {
    if (
      running ||
      selectedFiles.length === 0
    ) {
      return;
    }

    setError("");
    setListingId(null);
    setProgress(0);

    if (
      selectedFiles.length >
      MAX_FILES
    ) {
      setError(
        "Maximal 1 ExposÃƒÂ©-PDF und 10 Bilder pro Objekt."
      );

      return;
    }

    const pdfFiles =
      selectedFiles.filter(
        (file) =>
          file.type ===
          "application/pdf"
      );

    const imageFiles =
      selectedFiles.filter(
        (file) =>
          [
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(file.type)
      );

    if (
      pdfFiles.length >
      MAX_DOCUMENT_COUNT
    ) {
      setError(
        "Bitte maximal ein ExposÃƒÂ©-PDF hochladen."
      );

      return;
    }

    if (
      imageFiles.length === 0 ||
      imageFiles.length >
      MAX_IMAGE_COUNT
    ) {
      setError(
        "Bitte 1 bis 10 Bilder hochladen."
      );

      return;
    }

    const invalidFile =
      selectedFiles.find(
        (file) => {
          if (
            !ALLOWED_TYPES.has(
              file.type
            ) ||
            file.size <= 0
          ) {
            return true;
          }

          const maximumSize =
            file.type ===
            "application/pdf"
              ? MAX_DOCUMENT_SIZE
              : MAX_IMAGE_SIZE;

          return (
            file.size >
            maximumSize
          );
        }
      );
if (invalidFile) {
      setError(
        "Erlaubt sind JPEG, PNG und WebP mit maximal 10 MB pro Bild."
      );

      return;
    }

    try {
      setRunning(true);

      setStage(
        "Objekt wird automatisch vorbereitet ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
      );

      const draftResponse =
        await fetch(
          "/api/autopilot/draft",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({}),
          }
        );

      const draft =
        (
          await draftResponse
            .json()
            .catch(() => ({}))
        ) as {
          success?: boolean;
          listingId?: string;
          error?: string;
        };

      if (
        draftResponse.status === 401
      ) {
        window.location.href =
          "/login";

        return;
      }

      if (
        !draftResponse.ok ||
        !draft.success ||
        !draft.listingId
      ) {
        throw new Error(
          draft.error ||
            "Der Autopilot konnte das Objekt nicht vorbereiten."
        );
      }

      const nextListingId =
        draft.listingId;

      setListingId(
        nextListingId
      );

      setStage(
        `${selectedFiles.length} Dateien werden parallel hochgeladen ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦`
      );

      const uploadedRefs =
        await Promise.all(
          selectedFiles.map(
            async (
              file,
              index
            ) => {
              const uploadFile =
                file.type === "application/pdf"
                  ? file
                  : await prepareAutopilotImageForUpload(
                      file
                    );
              const pathname =
                `autopilot/${nextListingId}/` +
                `${crypto.randomUUID()}-` +
                `${index + 1}-` +
                safeFileName(
                  uploadFile.name
                );

              const blob =
                await upload(
                  pathname,
                  uploadFile,
                  {
                    access:
                      "public",

                    handleUploadUrl:
                      "/api/autopilot/upload",

                    clientPayload:
                      JSON.stringify({
                        listingId:
                          nextListingId,

                        fileName: uploadFile.name,
                      }),
                  }
                );

              setProgress(
                (current) =>
                  current + 1
              );

              return {
                pathname:
                  blob.pathname,

                fileName: uploadFile.name,
              };
            }
          )
        );

      setStage(
        "Inserat-AI analysiert jetzt alle Bilder und erstellt das Inserat ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
      );

      const runResponse =
        await fetch(
          "/api/autopilot/run",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                listingId:
                  nextListingId,

                uploads:
                  uploadedRefs,
              }),
          }
        );

      const runData =
        (
          await runResponse
            .json()
            .catch(() => ({}))
        ) as {
          success?: boolean;
          listingId?: string;
          error?: string;

          autopilot?: {
            stage?:
              | "needs_confirmation"
              | "ready";

            analyzedImages?:
              number;

            missingFields?:
              string[];
          };
        };

      if (
        runResponse.status === 401
      ) {
        window.location.href =
          "/login";

        return;
      }

      if (
        !runResponse.ok ||
        !runData.success
      ) {
        throw new Error(
          runData.error ||
            "Die automatische Inseraterstellung konnte nicht abgeschlossen werden."
        );
      }

      const missingFields =
        Array.isArray(
          runData.autopilot
            ?.missingFields
        )
          ? runData.autopilot
              ?.missingFields ?? []
          : [];

      if (
        runData.autopilot
          ?.stage === "ready"
      ) {
        setStage(
          "Fertig. Inserat-AI hat das Objekt analysiert und das Inserat erstellt."
        );
      } else {
        setStage(
          `Inserat erstellt. Nur noch ${missingFields.length} fehlende ${
            missingFields.length === 1
              ? "Angabe"
              : "Angaben"
          } bestÃƒÆ’Ã‚Â¤tigen.`
        );
      }
    } catch (
      autopilotError
    ) {
      console.error(
        "[autopilot]",
        autopilotError
      );

      setError(
        autopilotError instanceof
          Error
          ? autopilotError.message
          : "Der Autopilot konnte nicht abgeschlossen werden."
      );

      setStage(
        "Autopilot gestoppt."
      );
    } finally {
      setRunning(false);
    }
  }

  function handleFiles(
    files:
      FileList | null
  ) {
    if (!files) {
      return;
    }

    void runAutopilot(
      Array.from(files)
    );
  }


  function handleChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(
        event.target.files ?? []
      );

    event.target.value =
      "";

    if (files.length === 0) {
      return;
    }

    void runAutopilot(
      files
    );
  }


  function handleDrop(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (running) {
      return;
    }

    handleFiles(
      event.dataTransfer.files
    );
  }


  return (
    <main
      className="
        min-h-screen
        bg-neutral-950
        px-4
        py-8
        text-white
        sm:px-6
        sm:py-12
      "
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-3xl
          flex-col
          gap-6
        "
      >
        <header
          className="
            space-y-2
            text-center
          "
        >
          <div
            className="
              text-xs
              font-bold
              uppercase
              tracking-[0.22em]
              text-amber-400
            "
          >
            Inserat-AI Autopilot
          </div>

          <h1
            className="
              text-3xl
              font-black
              tracking-tight
              sm:text-5xl
            "
          >
            Objekt hochladen.
            <br />
            Fertig.
          </h1>

          <p
            className="
              mx-auto
              max-w-xl
              text-sm
              leading-6
              text-neutral-400
              sm:text-base
            "
          >
            Keine Formulare.
            Keine einzelnen Schritte.
            Inserat-AI ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¼bernimmt.
          </p>
        </header>


        <div
          onDragOver={(
            event
          ) =>
            event.preventDefault()
          }
          onDrop={
            handleDrop
          }
          onClick={() => {
            if (!running) {
              inputRef.current
                ?.click();
            }
          }}
          className={`
            relative
            flex
            min-h-[300px]
            cursor-pointer
            flex-col
            items-center
            justify-center
            rounded-[32px]
            border
            border-dashed
            p-8
            text-center
            transition
            ${
              running
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-neutral-700 bg-neutral-900 hover:border-amber-500/70 hover:bg-neutral-900/80"
            }
          `}
        >
          <input
            ref={
              inputRef
            }
            type="file"
            accept="
              application/pdf,
              image/jpeg,
              image/png,
              image/webp
            "
            multiple
            disabled={
              running
            }
            onChange={
              handleChange
            }
            className="hidden"
          />

          <div
            className="
              mb-5
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-amber-400
              text-3xl
              text-black
              shadow-lg
              shadow-amber-500/20
            "
          >
            ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“
          </div>

          <div
            className="
              text-xl
              font-extrabold
            "
          >
            {running
              ? stage
              : "ExposÃƒÂ© + Bilder hier hineinziehen"}
          </div>

          {!running && (
            <>
              <p
                className="
                  mt-2
                  text-sm
                  text-neutral-400
                "
              >
                oder klicken
              </p>

              <p
                className="
                  mt-5
                  text-xs
                  text-neutral-500
                "
              >
                ExposÃƒÂ© + bis zu 10 Bilder ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·
                PDF, JPEG, PNG oder WebP ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·
                maximal 10 MB je Bild
              </p>
            </>
          )}


          {running && (
            <div
              className="
                mt-8
                w-full
                max-w-md
              "
            >
              <div
                className="
                  mb-2
                  flex
                  justify-between
                  text-xs
                  font-semibold
                  text-neutral-400
                "
              >
                <span>
                  Autopilot lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¤uft
                </span>

                <span>
                  {progress} /{" "}
                  {progress === 0
                    ? "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦"
                    : progress}
                </span>
              </div>

              <div
                className="
                  h-2
                  overflow-hidden
                  rounded-full
                  bg-neutral-800
                "
              >
                <div
                  className="
                    h-full
                    rounded-full
                    bg-amber-400
                    transition-all
                    duration-300
                  "
                  style={{
                    width:
                      progress === 0
                        ? "8%"
                        : `${Math.min(
                            100,
                            progress *
                              10
                          )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>


        {error && (
          <div
            className="
              rounded-2xl
              border
              border-red-500/30
              bg-red-500/10
              px-5
              py-4
              text-sm
              text-red-200
            "
          >
            {error}
          </div>
        )}


        {!running &&
          listingId &&
          !error && (
            <div
              className="
                rounded-3xl
                border
                border-emerald-500/25
                bg-emerald-500/10
                p-6
                text-center
              "
            >
              <div
                className="
                  text-lg
                  font-black
                  text-emerald-300
                "
              >
                Upload abgeschlossen
              </div>

              <p
                className="
                  mt-2
                  text-sm
                  text-neutral-300
                "
              >
                {stage}
              </p>

              <Link
                href={`/cockpit/${listingId}#portal-publishing`}
                className="
                  mt-5
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-white
                  px-5
                  font-bold
                  text-black
                "
              >
                Objekt ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¶ffnen
              </Link>
            </div>
          )}
      </div>
    </main>
  );
}
