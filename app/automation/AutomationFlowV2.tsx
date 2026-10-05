"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import WorkspaceFrame from "../components/WorkspaceFrame";
import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

import {
  buildSalesExposeDocument,
} from "@/lib/sales-expose/sales-expose-document";

import {
  downloadSalesExposePdf,
} from "@/lib/sales-expose/sales-expose-pdf";

type Extracted = {
  projectName: string;
  countryCode: "CH" | "DE" | "AT";
  street: string;
  postalCode: string;
  location: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  highlights: string;
  styleText: string;
  sourceSummary: string;
  missingFields: string[];
};

type Variant = {
  title: string;
  text: string;
  highlights?: string[];
};

type ImageAnalysis = {
  fileName: string;
  analysis: string;
};

type Stage = "receive" | "working" | "edit" | "publish";

const MAX_EXPOSE_BYTES = 25 * 1024 * 1024;
const CONTINUE_TO_PUBLISH_KEY = "inserat-ai:dashboard-save-start";

const EMPTY: Extracted = {
  projectName: "",
  countryCode: "CH",
  street: "",
  postalCode: "",
  location: "",
  propertyType: "",
  rooms: "",
  livingArea: "",
  price: "",
  highlights: "",
  styleText: "",
  sourceSummary: "",
  missingFields: [],
};

function friendlyError(raw: unknown) {
  const text = typeof raw === "string" ? raw : "";

  if (/credits|quota|billing|429|KI-Auswertung ist derzeit nicht verfügbar/i.test(text)) {
    return "Die KI-Auswertung ist momentan nicht verfügbar. Bitte den API-Zugang prüfen und danach denselben Upload erneut starten.";
  }

  if (/413|too large|zu gross|zu groß|payload/i.test(text)) {
    return "Eine Datei ist zu gross. Bitte das Exposé komprimieren oder ein kleineres Bild verwenden.";
  }

  return text || "Inserat-AI konnte diesen Schritt gerade nicht abschliessen.";
}

function safeFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "expose.pdf"
  );
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function isExposeFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(pdf|docx|txt)$/i.test(file.name)
  );
}

export default function AutomationFlowV2() {
  const router = useRouter();
  // AUTOMATION_PLAN_GUARD_V1
  const [automationAccessReady, setAutomationAccessReady] =
    useState(false);
  const [market, setMarket] = useState<InseratAiMarket>("CH");
  const [stage, setStage] = useState<Stage>("receive");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageAnalyses, setImageAnalyses] = useState<ImageAnalysis[]>([]);
  // AUTOMATION_NEARBY_FACTS_CLIENT_V1
  type NearbyFact = {
    category:
      | "transport"
      | "education"
      | "shopping";
    label: string;
    name: string;
    distanceMetres: number;
    durationSeconds: number;
  };

  type NearbyFacts = {
    transport: NearbyFact | null;
    education: NearbyFact | null;
    shopping: NearbyFact | null;
  };

  const [data, setData] = useState<Extracted>(EMPTY);

  const [nearbyFacts, setNearbyFacts] =
    useState<NearbyFacts | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);

  // TEXT_VARIANTS_KEEP_IMAGE_V1
  // Text variants never change the selected title image.
  const [manualHero, setManualHero] =
    useState<string | null>(null);

  // LISTING_IMAGE_VIEWER_V1
  const [imageViewerOpen, setImageViewerOpen] =
    useState(false);
  const [imageViewerIndex, setImageViewerIndex] =
    useState(0);

  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  // LISTING_EXPORT_ACTIONS_V1
  const [copiedListing, setCopiedListing] =
    useState(false);

  async function copyCurrentListing() {
    const variant =
      variants[activeVariant];

    if (!variant) {
      return;
    }

    const content = [
      variant.title?.trim(),
      variant.text?.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!content) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        content
      );

      setCopiedListing(true);

      window.setTimeout(() => {
        setCopiedListing(false);
      }, 1800);
    } catch {
      setCopiedListing(false);
    }
  }

  function printCurrentListing() {
    window.print();
  }
  // SALES_EXPOSE_DOWNLOAD_V1
  async function downloadCurrentSalesExpose() {
    const salesExposeDocument =
      buildSalesExposeDocument({
        facts: data,
        images: imageAnalyses,
        variants,
      });

    await downloadSalesExposePdf(
      salesExposeDocument,
      images
    );
  }

  // AUTOMATION_ABORT_V1
  const automationAbortRef = useRef<AbortController | null>(null);
  // MOBILE_AUTOMATION_FACTS_TOGGLE_V1
  const [showMobileFacts, setShowMobileFacts] = useState(false);

  useEffect(() => {
    const detected = getInseratAiMarketFromHostname(window.location.hostname);
    const saved = localStorage.getItem("inseratAiMarket");
    const next = detected || (saved === "DE" ? "DE" : "CH");
    setMarket(next);
    setData((current) => ({ ...current, countryCode: next }));
  }, []);

  // AUTOMATION_PLAN_GUARD_V1
  useEffect(() => {
    let active = true;

    async function verifyAutomationAccess() {
      try {
        const response = await fetch("/api/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (active) {
            router.replace("/dashboard");
          }
          return;
        }

        const session = await response.json();

        const normalizedPlan = String(
          session?.user?.plan ?? ""
        )
          .trim()
          .toLowerCase();

        const allowed =
          normalizedPlan === "pro" ||
          normalizedPlan === "agency" ||
          normalizedPlan === "admin";

        if (!allowed) {
          if (active) {
            router.replace("/dashboard");
          }
          return;
        }

        if (active) {
          setAutomationAccessReady(true);
        }
      } catch {
        if (active) {
          router.replace("/dashboard");
        }
      }
    }

    void verifyAutomationAccess();

    return () => {
      active = false;
    };
  }, [router]);

  // AUTOMATION_ABORT_CLEANUP_FIX_V1
  useEffect(() => {
    return () => {
      automationAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const imageAnalysisText = useMemo(
    () =>
      imageAnalyses
        .map(
          (item, index) =>
            `Bild ${index + 1} (${item.fileName}):\n${item.analysis}`
        )
        .join("\n\n"),
    [imageAnalyses]
  );

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!data.location.trim()) missing.push("Ort");
    if (!data.propertyType.trim()) missing.push("Objektart");
    return missing;
  }, [data.location, data.propertyType]);

  const readyToPublish =
    requiredMissing.length === 0 && variants.length > 0;



  // AUTOMATION_VARIANT_IMAGE_ORDER_V1
  const variantImagePreviews = useMemo(() => {
    if (!imagePreviews.length) {
      return [];
    }

    const scored = imagePreviews.map((src, index) => {
      const analysis =
        imageAnalyses[index]?.analysis
          ?.toLowerCase() ?? "";

      let score = 0;

      const add = (
        terms: string[],
        value: number
      ) => {
        if (
          terms.some((term) =>
            analysis.includes(term)
          )
        ) {
          score += value;
        }
      };

      add(
        [
          "wohnzimmer",
          "wohnbereich",
          "wohnraum",
          "living",
        ],
        100
      );

      add(
        [
          "fassade",
          "aussenansicht",
          "außenansicht",
          "garten",
          "terrasse",
          "balkon",
          "aussenbereich",
          "außenbereich",
        ],
        90
      );

      add(
        [
          "küche",
          "kueche",
          "küchenbereich",
        ],
        75
      );

      add(
        [
          "esszimmer",
          "essbereich",
        ],
        70
      );

      add(
        [
          "schlafzimmer",
          "schlafbereich",
        ],
        55
      );

      add(
        [
          "bad",
          "badezimmer",
          "dusche",
          "wc",
        ],
        35
      );

      add(
        [
          "grundriss",
          "grundrissplan",
        ],
        -80
      );

      const fallbackScore =
        imagePreviews.length - index;

      return {
        src,
        index,
        score:
          score === 0
            ? fallbackScore
            : score,
      };
    });

    const ranked =
      [...scored].sort(
        (a, b) =>
          b.score - a.score ||
          a.index - b.index
      );

    if (ranked.length <= 1) {
      return ranked.map(
        (item) => item.src
      );
    }

    const hero =
      ranked[0];

    const automaticOrder = [
      hero,
      ...ranked.filter(
        (item) =>
          item.index !== hero.index
      ),
    ].map(
      (item) => item.src
    );

    if (
      !manualHero ||
      !automaticOrder.includes(manualHero)
    ) {
      return automaticOrder;
    }

    return [
      manualHero,
      ...automaticOrder.filter(
        (src) => src !== manualHero
      ),
    ];
  }, [
    imagePreviews,
    imageAnalyses,
    manualHero,
  ]);

  function setPreviewFiles(nextImages: File[]) {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews(nextImages.map((file) => URL.createObjectURL(file)));
  }

  async function prepareImage(file: File): Promise<File> {
    if (
      file.size <= 2_500_000 ||
      typeof createImageBitmap !== "function"
    ) {
      return file;
    }

    const bitmap = await createImageBitmap(file, {
      resizeWidth: 1600,
      resizeQuality: "high",
    });

    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext("2d");
      if (!context) return file;

      context.drawImage(bitmap, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82)
      );

      if (!blob) return file;

      return new File(
        [blob],
        file.name.replace(/\.[^.]+$/, "") + ".jpg",
        {
          type: "image/jpeg",
          lastModified: file.lastModified,
        }
      );
    } finally {
      bitmap.close();
    }
  }

  // PDF_EXTRACTED_PHOTOS_CLIENT_V1
  type ExtractedPdfPhotoPayload = {
    fileName: string;
    mimeType: string;
    width: number;
    height: number;
    pageNumber: number;
    imageIndex: number;
    confidence: number;
    reason: string;
    base64: string;
  };

  type ExtractExposeResult = {
    facts: Extracted;
    pdfImages: File[];
  };

  function pdfPhotoPayloadToFile(
    photo: ExtractedPdfPhotoPayload
  ): File {
    const binary = atob(photo.base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new File(
      [bytes],
      photo.fileName || "expose-photo.jpg",
      {
        type: photo.mimeType || "image/jpeg",
      }
    );
  }

  async function extractDocuments(
    files: File[],
    signal: AbortSignal
  ): Promise<ExtractExposeResult> {
    if (files.length === 0) {
      return {
        facts: { ...data },
        pdfImages: [],
      };
    }

    const validFiles =
      files.filter(
        (file) =>
          file.size <= MAX_EXPOSE_BYTES
      );

    const oversizedFiles =
      files.filter(
        (file) =>
          file.size > MAX_EXPOSE_BYTES
      );

    if (validFiles.length === 0) {
      throw new Error(
        files.length === 1
          ? `Die Unterlage "${files[0].name}" ist gr?sser als 25 MB.`
          : "Alle ausgew?hlten Unterlagen sind gr?sser als 25 MB."
      );
    }

    if (oversizedFiles.length > 0) {
      console.warn(
        "[AUTOMATION DOCUMENTS] oversized-skipped",
        oversizedFiles.map(
          (file) => file.name
        )
      );
    }

    setStatusText(
      oversizedFiles.length > 0
        ? `${validFiles.length} Unterlage${validFiles.length === 1 ? "" : "n"} wird verarbeitet ? ${oversizedFiles.length} ?ber 25 MB ?bersprungen`
        : validFiles.length === 1
          ? "Unterlage wird gelesen ?"
          : `${validFiles.length} Unterlagen werden gelesen ?`
    );

    const startedAt =
      performance.now();

    const uploadedFiles =
      await Promise.all(
        validFiles.map(async (file) => {
          const blob =
            await upload(
              `automation-exposes/${crypto.randomUUID()}-${safeFileName(file.name)}`,
              file,
              {
                access: "public",
                handleUploadUrl:
                  "/api/automation/expose-upload",
                multipart:
                  file.size >
                  8 * 1024 * 1024,
                contentType:
                  file.type ||
                  "application/pdf",
                abortSignal:
                  signal,
              }
            );

          return {
            fileUrl: blob.url,
            fileName: file.name,
            fileType:
              file.type ||
              "application/pdf",
          };
        })
      );

    console.log(
      "[AUTOMATION CLIENT] documents-upload-done",
      {
        documents:
          uploadedFiles.length,
        durationMs:
          Math.round(
            performance.now() -
              startedAt
          ),
      }
    );

    const response =
      await fetch(
        "/api/automation/extract-expose",
        {
          method: "POST",
          credentials: "include",
          signal,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            files: uploadedFiles,
          }),
        }
      );

    const payload =
      await response
        .json()
        .catch(() => ({}));

    if (
      !response.ok ||
      payload?.success !== true
    ) {
      throw new Error(
        friendlyError(
          payload?.error
        )
      );
    }

    const extracted = {
      ...EMPTY,
      ...(payload.extracted || {}),
    } as Extracted;

    const fallbackName = [
      extracted.rooms
        ? `${extracted.rooms}-Zimmer`
        : "",
      extracted.propertyType,
      extracted.location
        ? `in ${extracted.location}`
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (
      !extracted.projectName &&
      fallbackName
    ) {
      extracted.projectName =
        fallbackName;
    }

    const extractedPhotoPayloads =
      Array.isArray(
        payload?.extractedPhotos
      )
        ? (payload.extractedPhotos as ExtractedPdfPhotoPayload[])
        : [];

    const pdfImages =
      extractedPhotoPayloads
        .slice(0, 10)
        .map(
          pdfPhotoPayloadToFile
        );

    console.log(
      "[AUTOMATION DOCUMENT PHOTOS CLIENT]",
      {
        received:
          extractedPhotoPayloads.length,
        usable:
          pdfImages.length,
      }
    );

    return {
      facts: extracted,
      pdfImages,
    };
  }

  async function analyzeImages(files: File[], signal: AbortSignal): Promise<ImageAnalysis[]> {
    if (!files.length) return [];

    setStatusText(`${files.length} Bilder werden gleichzeitig analysiert …`);

    return Promise.all(
      files.map(async (original) => {
        // AUTOMATION_CLIENT_STEP_PROFILE_V1
        const imageClientStartedAt = performance.now();

        console.log("[AUTOMATION CLIENT] image-prepare-start", {
          name: original.name,
          bytes: original.size,
          type: original.type,
        });

        const file = await prepareImage(original);

        console.log("[AUTOMATION CLIENT] image-prepare-done", {
          durationMs: Math.round(
            performance.now() - imageClientStartedAt
          ),
          bytes: file.size,
          type: file.type,
        });
        const form = new FormData();
        form.append("image", file, file.name);

        console.log("[AUTOMATION CLIENT] image-fetch-start");

        const response = await fetch("/api/analyze-image", {
          method: "POST",
          credentials: "include",
          signal,
          body: form,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload?.analysis !== "string") {
          throw new Error(friendlyError(payload?.error));
        }

        return {
          fileName: original.name,
          analysis: payload.analysis.trim(),
        };
      })
    );
  }

  async function generateListing(
    facts: Extracted,
    analyses: ImageAnalysis[],
    signal: AbortSignal
  ): Promise<Variant[]> {
    if (!facts.location.trim() || !facts.propertyType.trim()) {
      return [];
    }

    setStatusText("Inserat wird automatisch fertiggestellt …");

    const response = await fetch("/api/generate", {
      method: "POST",
      credentials: "include",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "de",
        market: facts.countryCode === "DE" ? "DE" : "CH",
        countryCode: facts.countryCode,
        location: facts.location,
        rooms: facts.rooms,
        livingArea: facts.livingArea,
        price: facts.price,
        propertyType: facts.propertyType,
        highlights: facts.highlights,
        styleText: facts.styleText,
        imageAnalysis: analyses
          .map(
            (item, index) =>
              `Bild ${index + 1} (${item.fileName}):\n${item.analysis}`
          )
          .join("\n\n"),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(friendlyError(payload?.error));
    }

    const nextVariants = Array.isArray(payload?.variants)
      ? (payload.variants as Variant[])
      : [];

    if (!nextVariants.length) {
      throw new Error("Es wurde kein Inserattext erzeugt.");
    }

    return nextVariants;
  }

  async function loadNearbyFacts(
    facts: Extracted
  ) {
    const countryCode =
      String(
        facts.countryCode || market || ""
      )
        .trim()
        .toUpperCase();

    const street =
      String(facts.street || "").trim();

    const postalCode =
      String(facts.postalCode || "").trim();

    const city =
      String(facts.location || "").trim();

    if (
      !countryCode ||
      !street ||
      !postalCode ||
      !city
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/automation/nearby-facts",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              countryCode,
              street,
              postalCode,
              city,
            }),
          }
        );

      if (!response.ok) {
        return;
      }

      const payload =
        await response.json();

      if (payload?.facts) {
        setNearbyFacts(
          payload.facts as NearbyFacts
        );
      }
    } catch (error) {
      console.warn(
        "[AUTOMATION NEARBY FACTS CLIENT]",
        error
      );
    }
  }

  async function processFiles(nextDocuments: File[], nextImages: File[]) {
    if (nextDocuments.length === 0 && nextImages.length === 0) return;

    // AUTOMATION_ABORT_SIGNAL_V1
    automationAbortRef.current?.abort();

    const controller = new AbortController();
    automationAbortRef.current = controller;

    setError("");
    setVariants([]);
    setActiveVariant(0);
    setNearbyFacts(null);
    setStage("working");
    setStatusText("Inserat-AI übernimmt. Du musst nichts tun …");

    try {
      // AUTOMATION_PARTIAL_RESULTS_V1
      // AUTOMATION_BRANCH_PROFILE_V1
      const automationBranchStartedAt = performance.now();

      console.log("[AUTOMATION SPEED] branches-start", {
        documents: nextDocuments.length,
        images: nextImages.length,
      });

      // PDF_IMAGES_PROCESS_FLOW_V1
      //
      // Separate uploaded originals always win.
      // If there are no uploaded images, the complete PDF
      // supplies its own extracted property photographs.
      const exposePromise = extractDocuments(
        nextDocuments,
        controller.signal
      );

      const uploadedAnalysesPromise =
        nextImages.length > 0
          ? analyzeImages(
              nextImages,
              controller.signal
            )
          : null;

      const exposeResult =
        await exposePromise;

      if (
        controller.signal.aborted ||
        automationAbortRef.current !== controller
      ) {
        return;
      }

      const facts =
        exposeResult.facts;

      // AUTOMATION_FACTS_DIAGNOSTIC_V1
      console.log(
        "[AUTOMATION EXTRACTED FACTS]",
        {
          street: facts.street,
          postalCode: facts.postalCode,
          location: facts.location,
          rooms: facts.rooms,
          livingArea: facts.livingArea,
          price: facts.price,
          missingFields:
            facts.missingFields,
        }
      );

      setData(facts);

      // Fire-and-forget:
      // location enrichment must not delay
      // listing generation.
      void loadNearbyFacts(facts);

      console.log("[AUTOMATION SPEED] expose-done", {
        durationMs: Math.round(
          performance.now() - automationBranchStartedAt
        ),
        pdfImages:
          exposeResult.pdfImages.length,
      });

      const effectiveImages =
        nextImages.length > 0
          ? nextImages
          : exposeResult.pdfImages;

      if (
        nextImages.length === 0 &&
        effectiveImages.length > 0
      ) {
        setImages(effectiveImages);
        setPreviewFiles(effectiveImages);
      }

      const analyses =
        uploadedAnalysesPromise
          ? await uploadedAnalysesPromise
          : await analyzeImages(
              effectiveImages,
              controller.signal
            );

      if (
        controller.signal.aborted ||
        automationAbortRef.current !== controller
      ) {
        return;
      }

      setImageAnalyses(analyses);

      console.log("[AUTOMATION SPEED] images-done", {
        durationMs: Math.round(
          performance.now() - automationBranchStartedAt
        ),
        images: analyses.length,
        source:
          nextImages.length > 0
            ? "uploaded"
            : "pdf",
      });

      if (
        controller.signal.aborted ||
        automationAbortRef.current !== controller
      ) {
        return;
      }

      if (!facts.location.trim() || !facts.propertyType.trim()) {
        setStage("edit");
        setStatusText("Fast fertig. Es fehlen nur einzelne Pflichtangaben.");
        return;
      }

      const nextVariants = await generateListing(facts, analyses, controller.signal);
      setVariants(nextVariants);
      setStage("publish");
      setStatusText("Bereit zur Veröffentlichung.");
    } catch (runError) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("AUTOMATION V2 ERROR:", runError);
      setStage("edit");
      setError(
        runError instanceof Error
          ? friendlyError(runError.message)
          : "Die Automation konnte gerade nicht abgeschlossen werden."
      );
    }
  }

  // MOBILE_AUTOMATION_STOP_V1
  function stopAutomation() {
    automationAbortRef.current?.abort();
    automationAbortRef.current = null;

    setError("");
    setStage("receive");
    setStatusText("Verarbeitung gestoppt. Deine Dateien bleiben ausgewählt.");
  }

  function improveManually() {
    automationAbortRef.current?.abort();
    automationAbortRef.current = null;

    setError("");
    setStage("edit");
    setStatusText("Du kannst die erkannten Angaben jetzt selbst verbessern.");
  }

  // AUTOMATION_RESTART_V1
  async function restartAutomation() {
    if (documentFiles.length === 0 && images.length === 0) return;

    await processFiles(documentFiles, images);
  }

  async function handleIncomingFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    if (!incoming.length) return;

    const incomingDocuments =
      incoming.filter(isExposeFile);

    const nextDocuments =
      incomingDocuments.length > 0
        ? incomingDocuments
        : documentFiles;

    const newImages =
      incoming.filter(isImageFile);

    const nextImages =
      (
        newImages.length > 0
          ? newImages
          : incomingDocuments.length > 0
            ? []
            : images
      ).slice(0, 10);

    setDocumentFiles(nextDocuments);
    setImages(nextImages);
    setPreviewFiles(nextImages);

    await processFiles(
      nextDocuments,
      nextImages
    );
  }

  async function finishAfterManualEdit() {
    if (requiredMissing.length > 0) return;

    setError("");
    setStage("working");

    try {
      automationAbortRef.current?.abort();

      const controller = new AbortController();
      automationAbortRef.current = controller;

      const nextVariants = await generateListing(
        data,
        imageAnalyses,
        controller.signal
      );
      setVariants(nextVariants);
      setStage("publish");
      setStatusText("Bereit zur Veröffentlichung.");
    } catch (generationError) {
      // MANUAL_AUTOMATION_ABORT_V1
      if (automationAbortRef.current?.signal.aborted) {
        return;
      }

      setStage("edit");
      setError(
        generationError instanceof Error
          ? friendlyError(generationError.message)
          : "Das Inserat konnte nicht fertiggestellt werden."
      );
    }
  }

  async function uploadImagesForListing(listingId: string) {
    await Promise.all(
      images.map(async (original, index) => {
        const file = await prepareImage(original);
        const form = new FormData();
        form.append("listingId", listingId);
        form.append("file", file, file.name);

        const uploadResponse = await fetch("/api/listing-images/server-upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });

        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || uploadData?.success !== true) {
          throw new Error(`Bild ${index + 1} konnte nicht gespeichert werden.`);
        }

        const registerResponse = await fetch("/api/listing-images", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId,
            url: uploadData.blob.url,
            storageKey: uploadData.blob.pathname,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            position: index,
            analysis: imageAnalyses[index]?.analysis
              ? JSON.stringify({
                  version: "listing-image-analysis-cache-v1",
                  listingText: imageAnalyses[index].analysis,
                  homeStaging: null,
                })
              : null,
          }),
        });

        if (!registerResponse.ok) {
          throw new Error(`Bild ${index + 1} konnte nicht registriert werden.`);
        }
      })
    );
  }

  async function publish() {
    if (!readyToPublish || publishing) return;

    setPublishing(true);
    setError("");
    setStatusText("Objekt wird gespeichert. Danach kommt nur noch Veröffentlichen …");

    try {
      const projectName =
        data.projectName.trim() ||
        [data.propertyType, data.location].filter(Boolean).join(" ") ||
        "Neues Objekt";

      const response = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          market: data.countryCode === "DE" ? "DE" : "CH",
          countryCode: data.countryCode,
          street: data.street,
          location: data.location,
          postalCode: data.postalCode,
          propertyType: data.propertyType,
          rooms: data.rooms,
          livingArea: data.livingArea,
          price: data.price,
          highlights: data.highlights,
          style: data.styleText,
          generatedVariants: variants,
          imageAnalysis: imageAnalysisText,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const listingId =
        typeof payload?.listing?.id === "string" ? payload.listing.id : "";

      if (!response.ok || !listingId) {
        throw new Error(payload?.error || "Das Objekt konnte nicht gespeichert werden.");
      }

      if (images.length) {
        await uploadImagesForListing(listingId);
      }

      window.sessionStorage.setItem(CONTINUE_TO_PUBLISH_KEY, "1");
      router.push(`/cockpit/${encodeURIComponent(listingId)}`);
    } catch (publishError) {
      console.error("AUTOMATION V2 SAVE ERROR:", publishError);
      setError(
        publishError instanceof Error
          ? friendlyError(publishError.message)
          : "Das Objekt konnte nicht zur Veröffentlichung übergeben werden."
      );
    } finally {
      setPublishing(false);
    }
  }

  function updateVariant(field: "title" | "text", value: string) {
    setVariants((current) =>
      current.map((variant, index) =>
        index === activeVariant ? { ...variant, [field]: value } : variant
      )
    );
  }

  const step = stage === "receive" || stage === "working" ? 1 : stage === "edit" ? 2 : 3;

  if (!automationAccessReady) {
    return null;
  }

  return (
    <WorkspaceFrame market={market} active="new" title="Automation">
      <main className="page">
        <div className="shell">
          <header className="hero">
            <div className="eyebrow">INSERAT-AI AUTOPILOT</div>
            <h1>Exposé rein. Veröffentlichen. Fertig.</h1>
            <p>
              Inserat-AI liest Exposé und Bilder, übernimmt die Objektdaten und erstellt das komplette Inserat automatisch. Du greifst nur ein, wenn du etwas ändern willst.
            </p>

            <div className="steps">
              {["Empfangen", "Bearbeiten", "Veröffentlichen"].map((label, index) => {
                const number = index + 1;
                return (
                  <div key={label} className={`step ${step === number ? "active" : step > number ? "done" : ""}`}>
                    <span>{step > number ? "✓" : number}</span>
                    <strong>{label}</strong>
                  </div>
                );
              })}
            </div>
          </header>

          <section className="card">
            {(stage === "receive" || stage === "working") && (
              <>
                <label className="drop">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    disabled={stage === "working"}
                    onChange={handleIncomingFiles}
                  />
                  <div className="dropIcon">＋</div>
                  <div>
                    <h2>{stage === "working" ? "Inserat-AI arbeitet …" : "Objektunterlagen & Bilder hochladen"}</h2>
                    <p>
                      {stage === "working"
                        ? "Adresse, Daten, Masse, Bilder und Inserattext werden automatisch verarbeitet."
                        : "Lade alles hoch, was du zum Objekt hast. Inserat-AI erkennt die vorhandenen Angaben und fragt nur nach wirklich fehlenden Daten."}
                    </p>
                  </div>
                </label>

                {stage === "working" && (
                  <div className="workingActions">
                    <button
                      type="button"
                      className="workingStop"
                      onClick={stopAutomation}
                    >
                      Verarbeitung stoppen
                    </button>

                    <button
                      type="button"
                      className="workingImprove"
                      onClick={improveManually}
                    >
                      Angaben selbst verbessern
                    </button>
                  </div>
                )}

                {(documentFiles.length > 0 || images.length > 0) && (
                  <div className="received">
                    <span>{documentFiles.length > 0 ? `${documentFiles.length} Unterlage${documentFiles.length === 1 ? "" : "n"}` : "Keine Unterlagen"}</span>
                    <span>✓ {images.length} Bilder</span>
                  </div>
                )}

                {stage === "receive" &&
                  statusText.startsWith("Verarbeitung gestoppt") &&
                  (documentFiles.length > 0 || images.length > 0) && (
                    <button
                      type="button"
                      className="restartAutomation"
                      onClick={restartAutomation}
                    >
                      Mit diesen Dateien erneut starten
                    </button>
                  )}
              </>
            )}

            {stage === "receive" && (
              <div className="mobileAutomationNext">
                {/* MOBILE_AUTOMATION_NEXT_V1 */}
                <div className="mobileAutomationNextTitle">
                  <span className="mobileAutomationSpark" />
                  <div>
                    <strong>Danach &uuml;bernimmt Inserat-AI</strong>
                    <small>Alles l&auml;uft automatisch im Hintergrund.</small>
                  </div>
                </div>

                <div className="mobileAutomationTasks">
                  <span>Expos&eacute; lesen</span>
                  <span>Objektdaten erkennen</span>
                  <span>Bilder analysieren &amp; sortieren</span>
                  <span>Inserat erstellen</span>
                  <span>F&uuml;r Portale vorbereiten</span>
                </div>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div className="previews">
                {imagePreviews.slice(0, 8).map((src, index) => (
                  <img key={src} src={src} alt={`Objektbild ${index + 1}`} />
                ))}
              </div>
            )}

            {(statusText || error) && (
              <div className={`status ${error ? "error" : ""}`}>
                {stage === "working" && !error ? <span className="pulse" /> : null}
                {error || statusText}
              </div>
            )}

            {/* RESULT_BEFORE_FACTS_V1 */}
            {/* INSERAT_AI_OUTPUT_DESIGN_V1 */}
            {stage === "publish" && variants.length > 0 && (
              <div className="result">
                <div className="outputGlow" />

                <div className="resultTop">
                  <div className="outputHeading">
                    <div className="eyebrow">
                      INSERAT-AI OUTPUT
                    </div>

                    <div className="outputTitleRow">
                      <h2>Dein Inserat ist bereit</h2>

                      <span className="readyBadge">
                        <span className="readyDot" />
                        READY
                      </span>
                    </div>

                    <p>
                      Vollst?ndig von Inserat-AI erstellt.
                      Du kannst direkt ver?ffentlichen oder
                      den Text noch anpassen.
                    </p>
                  </div>
                </div>

                <div className="outputFacts">
                  {data.propertyType && (
                    <span>{data.propertyType}</span>
                  )}

                  {data.rooms && (
                    <span>{data.rooms} Zimmer</span>
                  )}

                  {data.livingArea && (
                    <span>{data.livingArea}</span>
                  )}

                  {data.price && (
                    <span>{data.price}</span>
                  )}

                  {data.location && (
                    <span>{data.location}</span>
                  )}
                </div>

                <div className="variantBar">
                  <div className="variantIntro">
                    <span className="variantLabel">
                      TEXTVARIANTEN
                    </span>

                    <strong>
                      Wähle deinen Favoriten
                    </strong>
                  </div>

                  <div className="tabs">
                    {variants.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={
                          activeVariant === index
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setActiveVariant(index)
                        }
                      >
                        <small>VARIANTE</small>
                        <span>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="listingPreview">
                  <div className="previewChrome">
                    <span className="previewMark">
                      AI
                    </span>

                    <span>
                      INSERAT-VORSCHAU
                    </span>

                    <span className="previewLive">
                      LIVE EDITIERBAR
                    </span>
                  </div>

                  {/* INSERAT_AI_LISTING_GALLERY_V1 */}
                  {variantImagePreviews.length > 0 && (
                    <div className="listingGallery">
                      <div className="listingHeroImage">
                        <img
                          src={variantImagePreviews[0]}
                          alt="Titelbild der Immobilie"
                        />

                        <div className="heroImageBadge">
                          TITELBILD
                        </div>

                        <div className="heroImageCount">
                          {variantImagePreviews.length} BILDER
                        </div>
                      </div>

                      {variantImagePreviews.length > 1 && (
                        <div className="listingGallerySide">
                          {variantImagePreviews
                            .slice(1, 5)
                            .map((src, index) => {
                              const remaining =
                                variantImagePreviews.length - 5;

                              const mobileRemaining =
                                variantImagePreviews.length - 3;

                              const showRemaining =
                                index === 3 &&
                                remaining > 0;

                              return (
                                <button
                                  type="button"
                                  className="listingGalleryThumb"
                                  key={src}
                                  aria-label={
                                    "Bild " +
                                    (index + 2) +
                                    " als Titelbild verwenden"
                                  }
                                  title="Als Titelbild verwenden"
                                  onClick={() => {
                                    // MANUAL_HERO_CLICK_V1
                                    setManualHero(src);
                                  }}
                                >
                                  <img
                                    src={src}
                                    alt={
                                      "Objektbild " +
                                      (index + 2)
                                    }
                                  />

                                  {index === 1 &&
                                    mobileRemaining > 0 && (
                                      <div
                                        className="mobileMoreImages"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setImageViewerIndex(0);
                                          setImageViewerOpen(true);
                                        }}
                                      >
                                        +{mobileRemaining} weitere
                                      </div>
                                    )}

                                  {showRemaining && (
                                    <div className="moreImages">
                                      +{remaining}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {imageViewerOpen &&
                    variantImagePreviews.length > 0 && (
                      <div
                        className="imageViewerBackdrop"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Alle Objektbilder"
                        onClick={() =>
                          setImageViewerOpen(false)
                        }
                      >
                        <div
                          className="imageViewer"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <div className="imageViewerTop">
                            <strong>Alle Bilder</strong>

                            <span>
                              {imageViewerIndex + 1} /{" "}
                              {variantImagePreviews.length}
                            </span>

                            <button
                              type="button"
                              className="imageViewerClose"
                              aria-label="Bilder schlie?en"
                              onClick={() =>
                                setImageViewerOpen(false)
                              }
                            >
                              X
                            </button>
                          </div>

                          <div className="imageViewerStage">
                            <img
                              src={
                                variantImagePreviews[
                                  imageViewerIndex
                                ]
                              }
                              alt={
                                "Objektbild " +
                                (imageViewerIndex + 1)
                              }
                            />

                            {variantImagePreviews.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  className="imageViewerPrev"
                                  aria-label="Vorheriges Bild"
                                  onClick={() =>
                                    setImageViewerIndex(
                                      (current) =>
                                        (current -
                                          1 +
                                          variantImagePreviews.length) %
                                        variantImagePreviews.length
                                    )
                                  }
                                >
                                  {"<"}
                                </button>

                                <button
                                  type="button"
                                  className="imageViewerNext"
                                  aria-label="N?chstes Bild"
                                  onClick={() =>
                                    setImageViewerIndex(
                                      (current) =>
                                        (current + 1) %
                                        variantImagePreviews.length
                                    )
                                  }
                                >
                                  {">"}
                                </button>
                              </>
                            )}
                          </div>

                          <div className="imageViewerThumbs">
                            {variantImagePreviews.map(
                              (viewerSrc, viewerIndex) => (
                                <button
                                  type="button"
                                  key={
                                    viewerSrc +
                                    "-" +
                                    viewerIndex
                                  }
                                  className={
                                    "imageViewerThumb " +
                                    (viewerIndex ===
                                    imageViewerIndex
                                      ? "active"
                                      : "")
                                  }
                                  aria-label={
                                    "Bild " +
                                    (viewerIndex + 1) +
                                    " anzeigen"
                                  }
                                  onClick={() =>
                                    setImageViewerIndex(
                                      viewerIndex
                                    )
                                  }
                                >
                                  <img
                                    src={viewerSrc}
                                    alt=""
                                  />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  <textarea
                    className="titleEdit"
                    rows={2}
                    aria-label="Inserattitel"
                    value={
                      variants[activeVariant]?.title || ""
                    }
                    onChange={(event) =>
                      updateVariant(
                        "title",
                        event.target.value
                      )
                    }
                  />

                  {/* LISTING_NEARBY_FACT_STRIP_V1 */}
                  {nearbyFacts &&
                    [
                      nearbyFacts.transport,
                      nearbyFacts.education,
                      nearbyFacts.shopping,
                    ].some(Boolean) && (
                      <div className="listingFactStrip">
                        {[
                          nearbyFacts.transport,
                          nearbyFacts.education,
                          nearbyFacts.shopping,
                        ]
                          .filter(
                            (
                              fact
                            ): fact is NearbyFact =>
                              Boolean(fact)
                          )
                          .map((fact) => {
                            const distance =
                              fact.distanceMetres >= 1000
                                ? `${(
                                    fact.distanceMetres /
                                    1000
                                  )
                                    .toFixed(1)
                                    .replace(
                                      ".",
                                      ","
                                    )} km`
                                : `${fact.distanceMetres} m`;

                            const title =
                              fact.category ===
                              "shopping"
                                ? `Einkauf ${fact.name}`
                                : fact.category ===
                                  "education"
                                ? fact.name.replace(
                                    /Oberlunkhofen/gi,
                                    ""
                                  ).trim() ||
                                  fact.label
                                : fact.name;

                            return (
                              <span
                                className="listingFact"
                                key={
                                  fact.category
                                }
                              >
                                {title} -{" "}
                                {distance}
                              </span>
                            );
                          })}
                      </div>
                    )}

                  <div className="previewDivider" />

                  <textarea
                    className="textEdit"
                    aria-label="Inserattext"
                    value={
                      variants[activeVariant]?.text || ""
                    }
                    onChange={(event) =>
                      updateVariant(
                        "text",
                        event.target.value
                      )
                    }
                  />
                </div>

                {/* LISTING_EXPORT_ACTIONS_V1 */}
                <div className="salesExposeReady">
                  <div className="salesExposeReadyStatus">
                    <span>{"\u2713"} Inserat erstellt</span>
                    <span>{"\u2713"} Verkaufsexpos{"\u00e9"} erstellt</span>
                  </div>

                  <button
                    type="button"
                    className="salesExposeAction"
                    onClick={() => {
                      void downloadCurrentSalesExpose();
                    }}
                  >
                    <span aria-hidden="true">{"\u2193"}</span>
                    {"Verkaufsexpos\u00e9 herunterladen"}
                  </button>
                </div>

                <div className="listingActions">
                  <button
                    type="button"
                    className="listingAction"
                    onClick={() => {
                      void copyCurrentListing();
                    }}
                  >
                    <span aria-hidden="true">
                      {copiedListing ? (
                        "✓"
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          width="17"
                          height="17"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="8"
                            y="8"
                            width="12"
                            height="12"
                            rx="2"
                          />
                          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                        </svg>
                      )}
                    </span>

                    {copiedListing
                      ? "Kopiert"
                      : "Inserat kopieren"}
                  </button>

                  <button
                    type="button"
                    className="listingAction"
                    onClick={printCurrentListing}
                  >
                    <span aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9V3h12v6" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect
                          x="6"
                          y="14"
                          width="12"
                          height="7"
                        />
                        <path d="M18 12h.01" />
                      </svg>
                    </span>

                    Inserat drucken
                  </button>


                </div>

                <div className="publishZone">
                  <div className="publishCopy">
                    <span className="publishReady">
                      BEREIT FÜR DEINE PORTALE
                    </span>

                    <strong>
                      Ein Klick bis zur Veröffentlichung
                    </strong>

                    <small>
                      Objektdaten, Bilder und der gewählte
                      Text werden automatisch übernommen.
                    </small>
                  </div>

                  <button
                    className="publish"
                    disabled
                    aria-disabled="true"
                    title="Portal-Anbindungen werden derzeit freigeschaltet."
                  >
                    {"PORTAL-VER\u00d6FFENTLICHUNG \u2013 IN VERARBEITUNG"}
                  </button>
                </div>

                <p className="publishHint">
                  Keine erneute Dateneingabe. Du wählst
                  danach nur noch deine verbundenen Portale.
                </p>
              </div>
            )}
                      {(stage === "edit" || stage === "publish") && (
              <div className="review">
                <div className="reviewTop">
                  <div>
                    <div className="eyebrow">AUTOMATISCH ERKANNT</div>
                    <h2>{stage === "publish" ? "Alles ist bereit" : "Nur fehlende Angaben ergänzen"}</h2>
                  </div>
                  <span className="badge">{requiredMissing.length ? `${requiredMissing.length} offen` : "✓ vollständig"}</span>
                </div>

                {stage === "publish" && (
                  <div className="mobileFactsSummary">
                    <div>
                      <strong>{data.propertyType || "Immobilie"}</strong>
                      <span>
                        {[data.rooms ? `${data.rooms} Zimmer` : "", data.livingArea, data.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMobileFacts((current) => !current)}
                    >
                      {showMobileFacts ? "Angaben schliessen" : "Angaben bearbeiten"}
                    </button>
                  </div>
                )}

                <div
                  className={`facts ${
                    stage === "publish" && !showMobileFacts
                      ? "mobileFactsCollapsed"
                      : ""
                  }`}
                >
                  <Field label="Objektname" value={data.projectName} onChange={(value) => setData({ ...data, projectName: value })} />
                  <Field label="Objektart" value={data.propertyType} required onChange={(value) => setData({ ...data, propertyType: value })} />
                  <Field label="Strasse" value={data.street} onChange={(value) => setData({ ...data, street: value })} />
                  <Field label="PLZ" value={data.postalCode} onChange={(value) => setData({ ...data, postalCode: value })} />
                  <Field label="Ort" value={data.location} required onChange={(value) => setData({ ...data, location: value })} />
                  <Field label="Zimmer" value={data.rooms} onChange={(value) => setData({ ...data, rooms: value })} />
                  <Field label="Wohnfläche" value={data.livingArea} onChange={(value) => setData({ ...data, livingArea: value })} />
                  <Field label="Preis" value={data.price} onChange={(value) => setData({ ...data, price: value })} />
                  <Field label="Highlights" value={data.highlights} wide onChange={(value) => setData({ ...data, highlights: value })} />
                </div>

                {stage === "edit" && (
                  <button className="primary" disabled={requiredMissing.length > 0} onClick={finishAfterManualEdit}>
                    Fehlende Angaben übernehmen →
                  </button>
                )}
              </div>
            )}

</section>
        </div>

        <style jsx>{`
          /* LISTING_FACT_STRIP_STYLE_V1 */
          .listingFactStrip {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0;
            padding: 4px 28px 22px;
            color: #334155;
          }

          .listingFact {
            display: inline-flex;
            align-items: center;
            font-size: 14px;
            line-height: 1.4;
            font-weight: 850;
            white-space: nowrap;
          }

          .listingFact:not(:last-child)::after {
            content: "-";
            margin: 0 11px;
            color: #f59e0b;
            font-weight: 950;
          }

          @media (max-width: 760px) {
            .listingFactStrip {
              padding:
                2px 18px 18px;
            }

            .listingFact {
              font-size: 12px;
            }

            .listingFact:not(:last-child)::after {
              margin: 0 7px;
            }
          }

          /* LISTING_EXPORT_ACTIONS_STYLE_V1 */
          .listingActions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            margin: 14px 0 16px;
          }

          .listingAction {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 42px;
            padding: 0 15px;
            border: 1px solid rgba(148,163,184,.22);
            border-radius: 11px;
            background: rgba(255,255,255,.06);
            color: #e2e8f0;
            font: inherit;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: .02em;
            cursor: pointer;
            transition:
              transform .16s ease,
              background .16s ease,
              border-color .16s ease;
          }

          .salesExposeReady {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 18px;
            margin: 18px 0 10px;
            padding: 16px 18px;
            border: 1px solid rgba(251,191,36,.22);
            border-radius: 15px;
            background: rgba(245,158,11,.055);
          }

          .salesExposeReadyStatus {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 18px;
            color: #e2e8f0;
            font-size: 12px;
            font-weight: 800;
          }

          .salesExposeReadyStatus span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          @media (max-width: 700px) {
            .salesExposeReady {
              grid-template-columns: minmax(0, 1fr);
              gap: 12px;
              padding: 14px;
            }

            .salesExposeAction {
              width: 100%;
            }
          }

          .salesExposeAction {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 52px;
            padding: 0 22px;
            border: 1px solid rgba(251,191,36,.72);
            border-radius: 12px;
            background: linear-gradient(
              135deg,
              #fbbf24 0%,
              #f59e0b 100%
            );
            color: #111827;
            font: inherit;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 10px 28px rgba(245,158,11,.18);
            transition:
              transform .18s ease,
              box-shadow .18s ease;
          }

          .salesExposeAction:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 34px rgba(245,158,11,.28);
          }

          .salesExposeAction span {
            font-size: 18px;
            font-weight: 950;
          }

          .listingAction:hover {
            transform: translateY(-1px);
            border-color: rgba(251,191,36,.42);
            background: rgba(245,158,11,.1);
            color: #fff;
          }

          .listingAction span {
            display: inline-grid;
            place-items: center;
            min-width: 16px;
            color: #fbbf24;
            font-size: 15px;
            font-weight: 950;
          }

          @media print {
            @page {
              margin: 12mm;
            }

            body * {
              visibility: hidden !important;
            }

            .listingPreview,
            .listingPreview * {
              visibility: visible !important;
            }

            .listingPreview {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: #fff !important;
              color: #111827 !important;
              overflow: visible !important;
            }

            .previewChrome {
              display: none !important;
            }

            .listingGallery {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .listingGalleryThumb {
              border: 0 !important;
            }

            .titleEdit,
            .textEdit {
              display: block !important;
              width: 100% !important;
              overflow: visible !important;
              resize: none !important;
              border: 0 !important;
              outline: 0 !important;
              box-shadow: none !important;
              background: #fff !important;
              color: #111827 !important;
            }

            .titleEdit {
              font-size: 22pt !important;
              line-height: 1.15 !important;
            }

            .textEdit {
              font-size: 11pt !important;
              line-height: 1.6 !important;
              min-height: 0 !important;
            }

            .heroImageBadge,
            .heroImageCount,
            .moreImages {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }

          .page { min-height: calc(100vh - 80px); padding: 22px; background: radial-gradient(circle at 88% 12%, rgba(245,158,11,.14), transparent 28%), radial-gradient(circle at 10% 82%, rgba(37,99,235,.18), transparent 32%), linear-gradient(135deg,#06172c 0%,#0a2342 58%,#102744 100%); color:#fff; }
          .shell { max-width: 1120px; margin: 0 auto; }
          .hero,.card { border:1px solid rgba(148,163,184,.18); border-radius:24px; background:rgba(5,22,43,.84); box-shadow:0 22px 60px rgba(2,6,23,.24); }
          .hero { padding:32px; }
          .card { margin-top:16px; padding:24px; }
          .eyebrow { color:#fbbf24; font-size:11px; letter-spacing:.14em; font-weight:950; }
          h1 { margin:8px 0 10px; font-size:clamp(34px,5vw,58px); line-height:1.02; letter-spacing:-.045em; }
          .hero > p { max-width:820px; margin:0; color:#cbd5e1; line-height:1.65; }
          .steps { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:24px; }
          .step { display:flex; align-items:center; gap:9px; padding:11px 12px; border-radius:13px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.035); color:#94a3b8; }
          .step span { display:grid; place-items:center; width:27px; height:27px; border-radius:999px; background:rgba(255,255,255,.08); font-size:11px; font-weight:950; }
          .step strong { font-size:12px; }
          .step.active { color:#fff; border-color:rgba(251,191,36,.42); background:rgba(245,158,11,.12); }
          .step.active span { background:#f59e0b; color:#fff; }
          .step.done { color:#86efac; border-color:rgba(52,211,153,.22); }
          .drop { min-height:220px; padding:30px; display:flex; align-items:center; justify-content:center; gap:20px; text-align:left; border:2px dashed rgba(251,191,36,.36); border-radius:22px; background:rgba(255,255,255,.035); cursor:pointer; }
          .drop input { display:none; }
          .dropIcon { display:grid; place-items:center; width:62px; height:62px; flex:0 0 62px; border-radius:18px; background:linear-gradient(135deg,#f59e0b,#f97316); font-size:34px; font-weight:300; }
          .drop h2 { margin:0; font-size:24px; }
          .drop p { margin:8px 0 0; color:#aebbd0; line-height:1.55; }
          .received { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
          .mobileAutomationNext { display:none; }

        .restartAutomation {
          width: 100%;
          min-height: 44px;
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(251,191,36,.32);
          border-radius: 11px;
          background: rgba(245,158,11,.1);
          color: #fbbf24;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .workingActions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .workingActions button {
          min-height: 42px;
          padding: 9px 12px;
          border-radius: 11px;
          font: inherit;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }

        .workingStop {
          border: 1px solid rgba(248,113,113,.28);
          background: rgba(239,68,68,.08);
          color: #fca5a5;
        }

        .workingImprove {
          border: 1px solid rgba(251,191,36,.28);
          background: rgba(245,158,11,.08);
          color: #fbbf24;
        }
          .mobileFactsSummary { display:none; }
          .received span,.badge { padding:7px 10px; border-radius:999px; border:1px solid rgba(52,211,153,.24); background:rgba(16,185,129,.08); color:#86efac; font-size:11px; font-weight:900; }
          .previews { display:flex; gap:8px; margin-top:14px; overflow-x:auto; }
          .previews img { width:92px; height:68px; flex:0 0 auto; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.12); }
          .status { margin-top:15px; padding:13px 15px; display:flex; align-items:center; gap:10px; border-radius:13px; border:1px solid rgba(96,165,250,.22); background:rgba(37,99,235,.08); color:#bfdbfe; font-size:13px; font-weight:750; }
          .status.error { border-color:rgba(248,113,113,.34); background:rgba(127,29,29,.18); color:#fecaca; }
          .pulse { width:9px; height:9px; border-radius:50%; background:#fbbf24; animation:pulse 1.2s infinite; }
          @keyframes pulse { 50% { opacity:.3; transform:scale(.75); } }
          .review,.result { margin-top:18px; padding:22px; border-radius:20px; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.045); }
          .reviewTop,.resultTop { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
          .review h2,.result h2 { margin:5px 0 0; font-size:23px; }
          .facts { display:grid; grid-template-columns:repeat(2,1fr); gap:11px; margin-top:18px; }
          .primary,.publish { width:100%; min-height:56px; margin-top:18px; border:0; border-radius:15px; background:linear-gradient(135deg,#f59e0b,#f97316); color:#fff; font-weight:950; font-size:15px; cursor:pointer; }
          .primary:disabled,.publish:disabled { opacity:.42; cursor:not-allowed; }
          /* INSERAT_AI_OUTPUT_STYLE_V1 */

          .result {
            position: relative;
            overflow: hidden;
            margin-top: 18px;
            padding: 26px;
            border: 1px solid rgba(251,191,36,.18);
            border-radius: 24px;
            background:
              radial-gradient(
                circle at 92% 0%,
                rgba(245,158,11,.13),
                transparent 30%
              ),
              linear-gradient(
                145deg,
                rgba(8,25,48,.98),
                rgba(5,18,37,.98)
              );
            box-shadow:
              0 28px 70px rgba(2,6,23,.34),
              inset 0 1px 0 rgba(255,255,255,.035);
          }

          .outputGlow {
            position: absolute;
            width: 260px;
            height: 260px;
            top: -170px;
            right: -90px;
            border-radius: 999px;
            background: rgba(245,158,11,.16);
            filter: blur(65px);
            pointer-events: none;
          }

          .resultTop {
            position: relative;
            z-index: 1;
          }

          .outputHeading {
            max-width: 760px;
          }

          .outputTitleRow {
            display: flex;
            align-items: center;
            gap: 13px;
            flex-wrap: wrap;
            margin-top: 6px;
          }

          .result .outputTitleRow h2 {
            margin: 0;
            font-size: clamp(26px,3vw,38px);
            line-height: 1.08;
            letter-spacing: -.035em;
          }

          .outputHeading > p {
            max-width: 700px;
            margin: 10px 0 0;
            color: #9fb0c8;
            line-height: 1.6;
            font-size: 13px;
          }

          .readyBadge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 7px 10px;
            border: 1px solid rgba(52,211,153,.25);
            border-radius: 999px;
            background: rgba(16,185,129,.09);
            color: #86efac;
            font-size: 10px;
            font-weight: 950;
            letter-spacing: .12em;
          }

          .readyDot {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: #34d399;
            box-shadow: 0 0 14px rgba(52,211,153,.8);
          }

          .outputFacts {
            position: relative;
            z-index: 1;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 20px;
          }

          .outputFacts span {
            padding: 8px 11px;
            border: 1px solid rgba(148,163,184,.16);
            border-radius: 999px;
            background: rgba(255,255,255,.045);
            color: #dbe7f5;
            font-size: 11px;
            font-weight: 800;
          }

          .variantBar {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 18px;
            margin-top: 26px;
            padding-top: 22px;
            border-top: 1px solid rgba(148,163,184,.12);
          }

          .variantIntro {
            display: grid;
            gap: 4px;
          }

          .variantLabel {
            color: #70839f;
            font-size: 9px;
            font-weight: 950;
            letter-spacing: .16em;
          }

          .variantIntro strong {
            color: #e8eef7;
            font-size: 13px;
          }

          .tabs {
            display: flex;
            gap: 8px;
          }

          .tabs button {
            display: grid;
            grid-template-columns: auto auto;
            align-items: center;
            gap: 8px;
            min-width: 94px;
            min-height: 48px;
            padding: 8px 11px;
            border: 1px solid rgba(148,163,184,.16);
            border-radius: 13px;
            background: rgba(255,255,255,.035);
            color: #8fa1ba;
            cursor: pointer;
            transition:
              transform .16s ease,
              border-color .16s ease,
              background .16s ease;
          }

          .tabs button:hover {
            transform: translateY(-1px);
            border-color: rgba(251,191,36,.3);
          }

          .tabs button small {
            font-size: 8px;
            font-weight: 900;
            letter-spacing: .1em;
          }

          .tabs button span {
            font-size: 17px;
            font-weight: 950;
            color: #cbd5e1;
          }

          .tabs button.active {
            border-color: rgba(251,191,36,.52);
            background:
              linear-gradient(
                135deg,
                rgba(245,158,11,.18),
                rgba(249,115,22,.09)
              );
            box-shadow:
              inset 0 0 0 1px rgba(251,191,36,.06),
              0 10px 26px rgba(245,158,11,.08);
            color: #fbbf24;
          }

          .tabs button.active span {
            color: #fbbf24;
          }

          .listingPreview {
            position: relative;
            z-index: 1;
            overflow: hidden;
            margin-top: 14px;
            border: 1px solid rgba(148,163,184,.15);
            border-radius: 19px;
            background:
              linear-gradient(
                180deg,
                rgba(255,255,255,.98),
                rgba(247,250,252,.98)
              );
            box-shadow: 0 20px 48px rgba(2,6,23,.24);
          }

          .mobileMoreImages {
            display: none;
          }

          /* LISTING_IMAGE_VIEWER_STYLE_V1 */
          .imageViewerBackdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: grid;
            place-items: center;
            padding: 18px;
            background: rgba(2,8,18,.88);
            backdrop-filter: blur(8px);
          }

          .imageViewer {
            width: min(920px, 100%);
            max-height: calc(100vh - 36px);
            overflow: auto;
            padding: 14px;
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 18px;
            background: #07111f;
            box-shadow: 0 24px 80px rgba(0,0,0,.5);
          }

          .imageViewerTop {
            display: grid;
            grid-template-columns: 1fr auto auto;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            color: #fff;
          }

          .imageViewerTop span {
            color: #94a3b8;
            font-size: 12px;
            font-weight: 800;
          }

          .imageViewerClose {
            width: 34px;
            height: 34px;
            border: 0;
            border-radius: 10px;
            background: rgba(255,255,255,.1);
            color: #fff;
            font-size: 24px;
            cursor: pointer;
          }

          .imageViewerStage {
            position: relative;
            overflow: hidden;
            height: min(62vh, 600px);
            aspect-ratio: 4 / 3;
            border-radius: 14px;
            background: #020617;
          }

          .imageViewerStage img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .imageViewerPrev,
          .imageViewerNext {
            position: absolute;
            top: 50%;
            width: 42px;
            height: 42px;
            transform: translateY(-50%);
            border: 0;
            border-radius: 50%;
            background: rgba(2,6,23,.72);
            color: #fff;
            font-size: 28px;
            cursor: pointer;
          }

          .imageViewerPrev {
            left: 10px;
          }

          .imageViewerNext {
            right: 10px;
          }

          .imageViewerThumbs {
            display: flex;
            gap: 7px;
            overflow-x: auto;
            padding-top: 10px;
          }

          .imageViewerThumb {
            flex: 0 0 76px;
            height: 56px;
            padding: 0;
            overflow: hidden;
            border: 2px solid transparent;
            border-radius: 9px;
            background: #0f172a;
            cursor: pointer;
          }

          .imageViewerThumb.active {
            border-color: #f59e0b;
          }

          .imageViewerThumb img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          /* INSERAT_AI_LISTING_GALLERY_STYLE_V1 */

          .listingGallery {
            display: grid;
            grid-template-columns: minmax(0, 1.65fr) minmax(250px, .75fr);
            gap: 5px;
            height: 430px;
            padding: 5px;
            background: #e8edf3;
          }

          .listingHeroImage,
          .listingGalleryThumb {
            position: relative;
            overflow: hidden;
            background: #dbe3ec;
          }

          .listingHeroImage {
            border-radius: 14px 5px 5px 14px;
          }

          .listingHeroImage img,
          .listingGalleryThumb img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform .35s ease;
          }

          .listingHeroImage:hover img,
          .listingGalleryThumb:hover img {
            transform: scale(1.015);
          }

          .listingGallerySide {
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            grid-template-rows: repeat(2, minmax(0,1fr));
            gap: 5px;
            min-width: 0;
          }

          .listingGalleryThumb {
            min-width: 0;
          }

          .listingGalleryThumb:nth-child(2) {
            border-radius: 0 14px 0 0;
          }

          .listingGalleryThumb:nth-child(4) {
            border-radius: 0 0 14px 0;
          }

          .heroImageBadge,
          .heroImageCount {
            position: absolute;
            bottom: 14px;
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 0 10px;
            border: 1px solid rgba(255,255,255,.22);
            border-radius: 9px;
            background: rgba(3,12,25,.72);
            backdrop-filter: blur(10px);
            color: #fff;
            font-size: 9px;
            font-weight: 950;
            letter-spacing: .08em;
            box-shadow: 0 8px 24px rgba(2,6,23,.18);
          }

          .heroImageBadge {
            left: 14px;
          }

          .heroImageCount {
            right: 14px;
          }

          .moreImages {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            background: rgba(3,12,25,.58);
            backdrop-filter: blur(2px);
            color: #fff;
            font-size: 30px;
            font-weight: 950;
            letter-spacing: -.03em;
          }

          .previewChrome {
            display: flex;
            align-items: center;
            gap: 9px;
            min-height: 42px;
            padding: 0 15px;
            border-bottom: 1px solid #e7edf4;
            background: #f8fafc;
            color: #64748b;
            font-size: 9px;
            font-weight: 950;
            letter-spacing: .1em;
          }

          .previewMark {
            display: grid;
            place-items: center;
            width: 25px;
            height: 25px;
            border-radius: 8px;
            background: linear-gradient(
              135deg,
              #f59e0b,
              #f97316
            );
            color: #fff;
            font-size: 9px;
            box-shadow: 0 5px 12px rgba(249,115,22,.22);
          }

          .previewLive {
            margin-left: auto;
            color: #16a34a;
          }

          .titleEdit,
          .textEdit {
            display: block;
            width: 100%;
            box-sizing: border-box;
            border: 0;
            background: transparent;
            color: #172033;
            outline: none;
          }

          .titleEdit {
            min-height: 100px;
            margin: 0;
            padding: 24px 26px 18px;
            border-radius: 0;
            resize: none;
            font-family: inherit;
            font-size: clamp(20px,2.3vw,29px);
            font-weight: 900;
            line-height: 1.22;
            letter-spacing: -.025em;
          }

          .previewDivider {
            height: 1px;
            margin: 0 26px;
            background: #e8edf3;
          }

          .textEdit {
            min-height: 300px;
            margin: 0;
            padding: 20px 26px 28px;
            border-radius: 0;
            resize: vertical;
            font: inherit;
            font-size: 14px;
            line-height: 1.78;
            color: #40506a;
          }

          .titleEdit:focus,
          .textEdit:focus {
            background: rgba(245,158,11,.025);
          }

          .publishZone {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: 1fr minmax(310px,420px);
            align-items: center;
            gap: 22px;
            margin-top: 18px;
            padding: 18px;
            border: 1px solid rgba(251,191,36,.16);
            border-radius: 17px;
            background:
              linear-gradient(
                135deg,
                rgba(245,158,11,.07),
                rgba(255,255,255,.025)
              );
          }

          .publishCopy {
            display: grid;
            gap: 4px;
          }

          .publishReady {
            color: #fbbf24;
            font-size: 9px;
            font-weight: 950;
            letter-spacing: .14em;
          }

          .publishCopy strong {
            color: #f8fafc;
            font-size: 16px;
          }

          .publishCopy small {
            max-width: 520px;
            color: #8294ad;
            font-size: 11px;
            line-height: 1.5;
          }

          .publish {
            width: 100%;
            min-height: 58px;
            margin: 0;
            padding: 0 20px;
            border: 0;
            border-radius: 14px;
            background:
              linear-gradient(
                135deg,
                #f59e0b,
                #f97316
              );
            color: #fff;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: .025em;
            cursor: pointer;
            box-shadow:
              0 15px 34px rgba(249,115,22,.22),
              inset 0 1px 0 rgba(255,255,255,.18);
            transition:
              transform .16s ease,
              box-shadow .16s ease;
          }

          .publish:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow:
              0 19px 40px rgba(249,115,22,.28),
              inset 0 1px 0 rgba(255,255,255,.18);
          }

          .publish:disabled {
            background: #475569;
            color: #cbd5e1;
            opacity: 1;
            cursor: not-allowed;
            box-shadow: none;
          }

          .publish span {
            margin-left: 9px;
            font-size: 20px;
          }

          .publishHint {
            position: relative;
            z-index: 1;
            margin: 10px 0 0;
            text-align: center;
            color: #667a97;
            font-size: 10px;
          }
          @media (max-width:760px) {
            .page {
              padding: 8px;
            }

            .hero,
            .card {
              border-radius: 16px;
            }

            .hero {
              padding: 16px;
            }

            .card {
              margin-top: 10px;
              padding: 14px;
            }

            h1 {
              margin: 6px 0 8px;
              font-size: 30px;
              line-height: 1.02;
            }

            .hero > p {
              font-size: 13px;
              line-height: 1.5;
            }

            .steps {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 5px;
              margin-top: 14px;
            }

            .step {
              min-width: 0;
              gap: 5px;
              padding: 8px 5px;
              justify-content: center;
            }

            .step span {
              width: 22px;
              height: 22px;
              flex: 0 0 22px;
              font-size: 10px;
            }

            .step strong {
              min-width: 0;
              font-size: 9px;
              white-space: nowrap;
            }

            .drop {
              min-height: 164px;
              padding: 16px;
              gap: 14px;
              align-items: center;
            }

            .dropIcon {
              width: 50px;
              height: 50px;
              flex-basis: 50px;
              border-radius: 14px;
              font-size: 28px;
            }

            .drop h2 {
              font-size: 19px;
              line-height: 1.25;
            }

            .drop p {
              margin-top: 5px;
              font-size: 12px;
              line-height: 1.45;
            }

            .mobileAutomationNext {
              display: block;
              margin-top: 10px;
              padding: 15px;
              border: 1px solid rgba(96,165,250,.18);
              border-radius: 16px;
              background: rgba(37,99,235,.07);
            }

            .mobileAutomationNextTitle {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .mobileAutomationNextTitle > span {
              display: grid;
              width: 34px;
              height: 34px;
              place-items: center;
              flex: 0 0 34px;
              border-radius: 10px;
              background: rgba(251,191,36,.12);
              color: #fbbf24;
              font-size: 17px;
            }

            .mobileAutomationNextTitle strong,
            .mobileAutomationNextTitle small {
              display: block;
            }

            .mobileAutomationNextTitle strong {
              color: #fff;
              font-size: 13px;
            }

            .mobileAutomationNextTitle small {
              margin-top: 2px;
              color: #94a3b8;
              font-size: 10px;
            }

            .mobileAutomationTasks {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 7px;
              margin-top: 12px;
            }

            .mobileAutomationSpark::before {
              content: "*";
              color: #fbbf24;
              font-weight: 900;
            }

            .mobileAutomationTasks span {
              min-width: 0;
              padding: 8px 9px;
              border-radius: 10px;
              background: rgba(255,255,255,.035);
              color: #cbd5e1;
              font-size: 10px;
              font-weight: 750;
              line-height: 1.3;
            }

            .mobileAutomationTasks span::before {
              content: "";
              display: inline-block;
              width: 6px;
              height: 3px;
              margin-right: 6px;
              border-left: 2px solid #86efac;
              border-bottom: 2px solid #86efac;
              transform: translateY(-1px) rotate(-45deg);
            }

            /* INSERAT_AI_MOBILE_IMAGE_VIEWER_V1 */
            .imageViewerBackdrop {
              padding: 10px;
            }

            .imageViewer {
              width: 100%;
              max-height: calc(100dvh - 20px);
              padding: 10px;
              border-radius: 15px;
            }

            .imageViewerTop {
              margin-bottom: 8px;
            }

            .imageViewerStage {
              width: 100%;
              height: auto;
              aspect-ratio: 4 / 3;
              border-radius: 11px;
            }

            .imageViewerStage img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .imageViewerPrev,
            .imageViewerNext {
              width: 36px;
              height: 36px;
              font-size: 20px;
            }

            .imageViewerThumbs {
              gap: 6px;
              padding-top: 8px;
            }

            .imageViewerThumb {
              flex-basis: 62px;
              height: 46px;
            }

            /* INSERAT_AI_MOBILE_LISTING_GALLERY_V1 */
            .mobileMoreImages {
              display: block;
            }

            .listingGallery {
              grid-template-columns: 1fr;
              grid-template-rows: 230px 112px;
              gap: 5px;
              height: auto;
              padding: 5px;
            }

            .listingHeroImage {
              min-width: 0;
              min-height: 0;
              border-radius: 12px 12px 5px 5px;
            }

            .listingGallerySide {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              grid-template-rows: 112px;
              gap: 5px;
              min-width: 0;
            }

            .listingGalleryThumb {
              min-width: 0;
              min-height: 0;
              border-radius: 5px;
            }

            .listingGalleryThumb:nth-child(n + 3) {
              display: none;
            }

            .listingGalleryThumb:first-child {
              border-radius: 5px 5px 5px 12px;
            }

            .listingGalleryThumb:nth-child(2) {
              border-radius: 5px 5px 12px 5px;
            }

            .mobileMoreImages {
              position: absolute;
              right: 8px;
              bottom: 8px;
              z-index: 2;
              padding: 5px 8px;
              border: 0;
              cursor: pointer;
              border-radius: 8px;
              background: rgba(3,12,25,.72);
              color: #fff;
              font-size: 10px;
              font-weight: 900;
              line-height: 1;
              backdrop-filter: blur(6px);
            }

            .heroImageBadge,
            .heroImageCount {
              bottom: 10px;
              min-height: 24px;
              padding: 0 8px;
              font-size: 9px;
            }

            .heroImageBadge {
              left: 10px;
            }

            .heroImageCount {
              right: 10px;
            }


            .facts {
              grid-template-columns: 1fr;
            }

            .mobileFactsSummary {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              margin-top: 12px;
              padding: 11px 12px;
              border: 1px solid rgba(52,211,153,.18);
              border-radius: 12px;
              background: rgba(16,185,129,.06);
            }

            .mobileFactsSummary > div {
              min-width: 0;
            }

            .mobileFactsSummary strong,
            .mobileFactsSummary span {
              display: block;
            }

            .mobileFactsSummary strong {
              color: #fff;
              font-size: 12px;
            }

            .mobileFactsSummary span {
              margin-top: 3px;
              color: #94a3b8;
              font-size: 10px;
              line-height: 1.35;
            }

            .mobileFactsSummary button {
              flex: 0 0 auto;
              padding: 7px 9px;
              border: 1px solid rgba(251,191,36,.3);
              border-radius: 9px;
              background: rgba(245,158,11,.1);
              color: #fbbf24;
              font-size: 9px;
              font-weight: 900;
              cursor: pointer;
            }

            .facts.mobileFactsCollapsed {
              display: none;
            }

            .reviewTop,
            .resultTop {
              flex-direction: column;
            }

            /* MOBILE_AUTOMATION_PUBLISH_V1 */
            .review,
            .result {
              margin-top: 10px;
              padding: 14px;
              border-radius: 16px;
            }

            .review h2,
            .result h2 {
              margin-top: 3px;
              font-size: 19px;
              line-height: 1.2;
            }

            .reviewTop,
            .resultTop {
              gap: 9px;
            }

            .facts {
              gap: 8px;
              margin-top: 12px;
            }

            /* INSERAT_AI_MOBILE_VARIANTS_V1 */
            .result .tabs {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 6px;
              width: 100%;
              min-width: 0;
            }

            .result .tabs button {
              width: 100%;
              min-width: 0;
              min-height: 34px;
              height: 34px;
              padding: 3px 3px;
              gap: 2px;
              border-radius: 9px;
            }

            .result .tabs button small {
              font-size: 6px;
              letter-spacing: 0;
            }

            .result .tabs button span {
              font-size: 12px;
              line-height: 1;
            }

            .titleEdit {
              margin-top: 12px;
              min-height: 82px;
              padding: 9px 11px;
              font-size: 14px;
              line-height: 1.35;
              resize: none;
              overflow: auto;
              font-family: inherit;
            }

            .textEdit {
              min-height: 180px;
              max-height: 260px;
              padding: 13px;
              font-size: 13px;
              line-height: 1.55;
            }

            /* INSERAT_AI_MOBILE_PUBLISH_ZONE_V1 */
            .publishZone {
              grid-template-columns: minmax(0, 1fr);
              gap: 14px;
              padding: 14px;
            }

            .publishCopy {
              min-width: 0;
            }

            .publishCopy strong {
              font-size: 15px;
              line-height: 1.3;
            }

            .publishCopy small {
              font-size: 10px;
              line-height: 1.5;
            }

            .publish {
              width: 100%;
              min-width: 0;
              max-width: 100%;
              min-height: 50px;
              margin: 0;
              padding: 0 12px;
              box-sizing: border-box;
              font-size: 12px;
              line-height: 1.2;
              white-space: normal;
            }

            .publishHint {
              margin-top: 8px;
              font-size: 10px;
              line-height: 1.4;
            }
          }
        `}</style>
      </main>
    </WorkspaceFrame>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  wide?: boolean;
}) {
  const missing = required && !value.trim();

  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}{missing ? " · fehlt" : ""}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
      <style jsx>{`
        .field { display:grid; gap:7px; }
        .wide { grid-column:1 / -1; }
        span { color:${missing ? "#fbbf24" : "#94a3b8"}; font-size:11px; font-weight:850; }
        input { width:100%; box-sizing:border-box; min-height:46px; padding:0 13px; border-radius:11px; border:1px solid rgba(148,163,184,.18); background:rgba(15,23,42,.5); color:#fff; outline:none; }
        input:focus { border-color:rgba(251,191,36,.55); box-shadow:0 0 0 3px rgba(251,191,36,.08); }
      `}</style>
    </label>
  );
}
