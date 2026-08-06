"use client";

import { upload } from "@vercel/blob/client";
import FloorPlanAnalyzer from "./FloorPlanAnalyzer";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

type ListingImage = {
  id: string;
  url: string;
  storageKey: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  position: number;
  isPrimary: boolean;
};

type Listing = {
  id: string;
  location: string;
  postalCode: string | null;
  propertyType: string;
  rooms: number | null;
  archivedAt: string | null;
  images: ListingImage[];
};

type RoomType =
  | "livingRoom"
  | "bedroom"
  | "office"
  | "diningRoom"
  | "kidsRoom"
  | "storageRoom";

type StagingStyle =
  | "modern"
  | "scandinavian"
  | "luxurious"
  | "minimalist";

type OutputSize =
  | "720x928"
  | "928x720"
  | "816x816"
  | "1024x1536"
  | "1536x1024"
  | "1024x1024";

type GenerationMode = "preview" | "final";

type HomeStagingPreview = {
  imageBase64: string;
  mimeType: string;
  listingId: string;
  sourceImageId: string;
  roomType: RoomType;
  style: StagingStyle;
  aiModel: string;
  promptVersion: string;
};

type GenerateResponse = {
  success?: boolean;
  error?: string;
  details?: string;
  preview?: HomeStagingPreview;
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  image?: {
    id: string;
    url: string;
  };
};

type SessionResponse = {
  success?: boolean;
  authenticated?: boolean;
  user?: {
    capabilities?: {
      canUseHomeStaging?: boolean;
    };
  };
  error?: string;
};

type AnalysisRoomType =
  | RoomType
  | "kitchen"
  | "bathroom"
  | "hallway"
  | "balcony"
  | "terrace"
  | "garden"
  | "exterior"
  | "other"
  | "unclear";

type RoomCondition =
  | "empty"
  | "sparselyFurnished"
  | "furnished"
  | "renovationNeeded"
  | "unclear";

type TransformationType =
  | "furnishEmpty"
  | "redesignFurnished"
  | "renovateKitchen"
  | "renovateBathroom"
  | "designOutdoor"
  | "notRecommended"
  | "needsConfirmation";

type RoomAnalysis = {
  analysisVersion: string;
  roomType: AnalysisRoomType;
  roomTypeLabel: string;
  roomCondition: RoomCondition;
  transformation: TransformationType;
  style: StagingStyle;
  confidence: number;
  summary: string;
  visibleFacts: string[];
  lockedArchitecture: string[];
  layoutGoal: string;
  furnitureScale: string;
  forbiddenElements: string[];
  warnings: string[];
};

type TransformationBrief = {
  canGenerate: boolean;
  objective: string;
  visibleFacts: string[];
  protectedArchitecture: string[];
  layoutRules: string[];
  allowedChanges: string[];
  forbiddenChanges: string[];
  warnings: string[];
};

type AnalyzeResponse = {
  success?: boolean;
  error?: string;
  details?: string;
  analysis?: RoomAnalysis;
  transformationBrief?: TransformationBrief;
};

type ImageWorkflowState = {
  roomAnalysis: RoomAnalysis | null;
  transformationBrief: TransformationBrief | null;
  analysisConfirmed: boolean;
  analysisError: string;
  preview: HomeStagingPreview | null;
  savedImageUrl: string;
  statusMessage: string;
  roomType: RoomType;
  style: StagingStyle;
  generationMode: GenerationMode;
  variationIndex: number;
  customInstructions: string;
};

type BatchAnalysisProgress = {
  current: number;
  total: number;
  currentImageId: string;
};

function getImageWorkflowStatus(
  workflow: ImageWorkflowState | undefined
): {
  label: string;
  tone: string;
} {
  if (!workflow) {
    return {
      label: "Wartet",
      tone: "waiting",
    };
  }

  if (workflow.analysisError) {
    return {
      label: "Fehler",
      tone: "error",
    };
  }

  if (workflow.savedImageUrl) {
    return {
      label: "Gespeichert",
      tone: "saved",
    };
  }

  if (workflow.preview) {
    return {
      label: "Visualisiert",
      tone: "generated",
    };
  }

  if (workflow.analysisConfirmed) {
    return {
      label: "Bestätigt",
      tone: "confirmed",
    };
  }

  if (workflow.roomAnalysis) {
    return {
      label: "Analysiert",
      tone: "analyzed",
    };
  }

  return {
    label: "Wartet",
    tone: "waiting",
  };
}
const ROOM_TYPES: Array<{
  value: RoomType;
  label: string;
  description: string;
}> = [
  {
    value: "livingRoom",
    label: "Wohnzimmer",
    description: "Sofa, Sessel, Tisch und wohnliche Akzente",
  },
  {
    value: "bedroom",
    label: "Schlafzimmer",
    description: "Bett, Nachttische und ruhige Atmosphäre",
  },
  {
    value: "office",
    label: "Büro",
    description: "Arbeitsplatz mit funktionaler Einrichtung",
  },
  {
    value: "diningRoom",
    label: "Esszimmer",
    description: "Esstisch, Stühle und dezente Beleuchtung",
  },
  {
    value: "kidsRoom",
    label: "Kinderzimmer",
    description: "Freundliche und altersneutrale Einrichtung",
  },
  {
    value: "storageRoom",
    label: "Abstellraum / Lager",
    description: "Aufgeräumter, funktionaler Stauraum mit klaren Laufwegen",
  },
];

const STYLES: Array<{
  value: StagingStyle;
  label: string;
  description: string;
}> = [
  {
    value: "modern",
    label: "Modern",
    description: "Warm, elegant und hochwertig",
  },
  {
    value: "scandinavian",
    label: "Skandinavisch",
    description: "Hell, natürlich und einladend",
  },
  {
    value: "luxurious",
    label: "Luxuriös",
    description: "Edle Materialien und zurückhaltender Luxus",
  },
  {
    value: "minimalist",
    label: "Minimalistisch",
    description: "Ruhig, funktional und grosszügig",
  },
];

const ROOM_CONDITION_LABELS: Record<
  RoomCondition,
  string
> = {
  empty: "Leer",
  sparselyFurnished: "Wenig möbliert",
  furnished: "Möbliert",
  renovationNeeded: "Renovationsbedarf erkannt",
  unclear: "Nicht eindeutig",
};

const TRANSFORMATION_LABELS: Record<
  TransformationType,
  string
> = {
  furnishEmpty: "Leeren Raum einrichten",
  redesignFurnished: "Möblierten Raum neu gestalten",
  renovateKitchen: "Küche renovieren",
  renovateBathroom: "Bad renovieren",
  designOutdoor: "Aussenbereich gestalten",
  notRecommended: "Foto nicht geeignet",
  needsConfirmation: "Bestätigung erforderlich",
};

function isSelectableRoomType(
  value: string
): value is RoomType {
  return ROOM_TYPES.some(
    (option) =>
      option.value === value
  );
}

function resolveGeneratableRoomType(
  analysis: RoomAnalysis
): RoomType | null {
  if (
    isSelectableRoomType(
      analysis.roomType
    )
  ) {
    return analysis.roomType;
  }

  const roomLabel =
    analysis.roomTypeLabel
      .trim()
      .toLowerCase();

  const isStorageRoom =
    analysis.roomType === "other" &&
    [
      "abstell",
      "lager",
      "storage",
      "utility",
      "nebenraum",
      "vorrat",
      "réduit",
      "ripostiglio",
    ].some((keyword) =>
      roomLabel.includes(keyword)
    );

  return isStorageRoom
    ? "storageRoom"
    : null;
}

function isSelectableStyle(
  value: string
): value is StagingStyle {
  return STYLES.some(
    (option) =>
      option.value === value
  );
}
function base64ToFile(
  base64: string,
  fileName: string,
  mimeType: string
): File {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, {
    type: mimeType,
  });
}

function detectOutputSize(
  imageUrl: string,
  mode: GenerationMode
): Promise<OutputSize> {
  return new Promise((resolve) => {
    const image = new window.Image();

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;

      const ratio =
        width && height
          ? width / height
          : 1.34;

      if (mode === "final") {
        if (ratio > 1.12) {
          resolve("1536x1024");
          return;
        }

        if (ratio < 0.88) {
          resolve("1024x1536");
          return;
        }

        resolve("1024x1024");
        return;
      }

      if (ratio > 1.12) {
        resolve("928x720");
        return;
      }

      if (ratio < 0.88) {
        resolve("720x928");
        return;
      }

      resolve("816x816");
    };

    image.onerror = () => {
      resolve(
        mode === "final"
          ? "1536x1024"
          : "928x720"
      );
    };

    image.src = imageUrl;
  });
}

export default function HomeStagingPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = params.id;
  const listingId = Array.isArray(rawId)
    ? rawId[0]
    : rawId;

  const [listing, setListing] =
    useState<Listing | null>(null);
  const [selectedImageId, setSelectedImageId] =
    useState("");
  const [roomType, setRoomType] =
    useState<RoomType>("livingRoom");
  const [style, setStyle] =
    useState<StagingStyle>("modern");
  const [
    generationMode,
    setGenerationMode,
  ] = useState<GenerationMode>("preview");
  const [
    variationIndex,
    setVariationIndex,
  ] = useState(0);
  const [
    customInstructions,
    setCustomInstructions,
  ] = useState("");
  const [preview, setPreview] =
    useState<HomeStagingPreview | null>(null);

  const [roomAnalysis, setRoomAnalysis] =
    useState<RoomAnalysis | null>(null);

  const [
    transformationBrief,
    setTransformationBrief,
  ] = useState<TransformationBrief | null>(
    null
  );

  const [
    analyzingRoom,
    setAnalyzingRoom,
  ] = useState(false);

  const [
    analysisConfirmed,
    setAnalysisConfirmed,
  ] = useState(false);

  const [
    analysisError,
    setAnalysisError,
  ] = useState("");

  const [
    analysisRefreshKey,
    setAnalysisRefreshKey,
  ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [
    uploadingImages,
    setUploadingImages,
  ] = useState(false);
  const [uploadMessage, setUploadMessage] =
    useState("");
  const [
    pendingDeleteImage,
    setPendingDeleteImage,
  ] = useState<ListingImage | null>(null);
  const [
    deletingImageId,
    setDeletingImageId,
  ] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] =
    useState("");
  const [savedImageUrl, setSavedImageUrl] =
    useState("");

  const [
    imageWorkflowById,
    setImageWorkflowById,
  ] = useState<Record<string, ImageWorkflowState>>(
    {}
  );

  const [
    batchAnalyzing,
    setBatchAnalyzing,
  ] = useState(false);

  const [
    batchAnalysisProgress,
    setBatchAnalysisProgress,
  ] = useState<BatchAnalysisProgress>({
    current: 0,
    total: 0,
    currentImageId: "",
  });

  const [
    batchAnalysisMessage,
    setBatchAnalysisMessage,
  ] = useState("");

  const [
    accessChecked,
    setAccessChecked,
  ] = useState(false);

  const [
    hasHomeStagingAccess,
    setHasHomeStagingAccess,
  ] = useState(false);

  const [
    accessError,
    setAccessError,
  ] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    let proAccessGranted = false;
    let redirectingToLogin = false;

    async function loadHomeStaging() {
      try {
        setLoading(true);
        setError("");
        setAccessError("");
        setAccessChecked(false);

        const sessionResponse = await fetch(
          "/api/session",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (sessionResponse.status === 401) {
          redirectingToLogin = true;
          router.replace("/login");
          return;
        }

        const sessionData =
          (await sessionResponse.json()) as SessionResponse;

        if (
          !sessionResponse.ok ||
          !sessionData.success ||
          !sessionData.authenticated
        ) {
          throw new Error(
            sessionData.error ||
              "Die Zugriffsberechtigung konnte nicht geprüft werden."
          );
        }

        const canUseHomeStaging =
          sessionData.user?.capabilities
            ?.canUseHomeStaging === true;

        setHasHomeStagingAccess(
          canUseHomeStaging
        );

        if (!canUseHomeStaging) {
          return;
        }

        proAccessGranted = true;

        if (!listingId) {
          setError("Keine Objekt-ID gefunden.");
          return;
        }

        const response = await fetch(
          `/api/listings/${encodeURIComponent(
            listingId
          )}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          redirectingToLogin = true;
          router.replace("/login");
          return;
        }

        const data = (await response.json()) as {
          success?: boolean;
          error?: string;
          listing?: Listing;
        };

        if (
          !response.ok ||
          !data.success ||
          !data.listing
        ) {
          throw new Error(
            data.error ||
              "Das Objekt konnte nicht geladen werden."
          );
        }

        const sortedImages = [
          ...(data.listing.images || []),
        ].sort(
          (first, second) =>
            first.position - second.position
        );

        const loadedListing = {
          ...data.listing,
          images: sortedImages,
        };

        setListing(loadedListing);

        const primaryImage =
          sortedImages.find(
            (image) => image.isPrimary
          ) || sortedImages[0];

        setSelectedImageId(
          primaryImage?.id || ""
        );
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Home-Staging-Zugriff konnte nicht geladen werden:",
          loadError
        );

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Home Staging konnte nicht geladen werden.";

        if (proAccessGranted) {
          setError(message);
        } else {
          setAccessError(message);
          setHasHomeStagingAccess(false);
        }
      } finally {
        if (
          !controller.signal.aborted &&
          !redirectingToLogin
        ) {
          setAccessChecked(true);
          setLoading(false);
        }
      }
    }

    void loadHomeStaging();

    return () => {
      controller.abort();
    };
  }, [listingId, router]);

  const stagingImages = useMemo(
    () =>
      listing?.images.slice(0, 5) || [],
    [listing]
  );

  const selectedImage = useMemo(
    () =>
      listing?.images.find(
        (image) => image.id === selectedImageId
      ) || null,
    [listing, selectedImageId]
  );

  const analyzedImageCount = useMemo(
    () =>
      stagingImages.filter((image) => {
        const workflow =
          imageWorkflowById[image.id];

        return Boolean(
          workflow?.roomAnalysis &&
          workflow.transformationBrief &&
          !workflow.analysisError
        );
      }).length,
    [stagingImages, imageWorkflowById]
  );

  function updateSelectedImageWorkflow(
    patch: Partial<ImageWorkflowState>
  ) {
    if (!selectedImageId) {
      return;
    }

    setImageWorkflowById((current) => {
      const existing =
        current[selectedImageId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [selectedImageId]: {
          ...existing,
          ...patch,
        },
      };
    });
  }

  function restoreImageWorkflow(
    workflow: ImageWorkflowState
  ) {
    setRoomAnalysis(workflow.roomAnalysis);
    setTransformationBrief(
      workflow.transformationBrief
    );
    setAnalysisConfirmed(
      workflow.analysisConfirmed
    );
    setAnalysisError(workflow.analysisError);
    setPreview(workflow.preview);
    setSavedImageUrl(workflow.savedImageUrl);
    setStatusMessage(workflow.statusMessage);
    setRoomType(workflow.roomType);
    setStyle(workflow.style);
    setGenerationMode(workflow.generationMode);
    setVariationIndex(workflow.variationIndex);
    setCustomInstructions(
      workflow.customInstructions
    );
    setError("");
  }

  function clearImageWorkflowEditor() {
    setRoomAnalysis(null);
    setTransformationBrief(null);
    setAnalysisConfirmed(false);
    setAnalysisError("");
    setPreview(null);
    setSavedImageUrl("");
    setStatusMessage("");
    setRoomType("livingRoom");
    setStyle("modern");
    setGenerationMode("preview");
    setVariationIndex(0);
    setCustomInstructions("");
    setError("");
  }

  useEffect(() => {
    const controller =
      new AbortController();

    async function analyzeRoom() {
      if (
        !listing ||
        !selectedImage ||
        !hasHomeStagingAccess ||
        listing.archivedAt ||
        batchAnalyzing
      ) {
        return;
      }

      const cachedWorkflow =
        imageWorkflowById[selectedImage.id];

      if (cachedWorkflow) {
        restoreImageWorkflow(cachedWorkflow);
        return;
      }

      let analysisSpinnerTimer:
        number | null = null;

      try {
        analysisSpinnerTimer =
          window.setTimeout(() => {
            setAnalyzingRoom(true);
          }, 800);

        setAnalysisError("");
        setAnalysisConfirmed(false);
        setRoomAnalysis(null);
        setTransformationBrief(null);
        setPreview(null);
        setSavedImageUrl("");
        setStatusMessage("");

        const response = await fetch(
          "/api/home-staging/analyze",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              listingId: listing.id,
              sourceImageId:
                selectedImage.id,
            }),
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data =
          (await response
            .json()
            .catch(() => ({}))) as
            AnalyzeResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.analysis ||
          !data.transformationBrief
        ) {
          throw new Error(
            data.details ||
              data.error ||
              "Das Raumfoto konnte nicht analysiert werden."
          );
        }

        const analyzedRoomType =
          isSelectableRoomType(
            data.analysis.roomType
          )
            ? data.analysis.roomType
            : "livingRoom";

        const analyzedStyle =
          isSelectableStyle(
            data.analysis.style
          )
            ? data.analysis.style
            : "modern";

        setRoomAnalysis(data.analysis);
        setTransformationBrief(
          data.transformationBrief
        );
        setRoomType(analyzedRoomType);
        setStyle(analyzedStyle);

        const nextWorkflow: ImageWorkflowState = {
          roomAnalysis: data.analysis,
          transformationBrief:
            data.transformationBrief,
          analysisConfirmed: false,
          analysisError: "",
          preview: null,
          savedImageUrl: "",
          statusMessage: "",
          roomType: analyzedRoomType,
          style: analyzedStyle,
          generationMode: "preview",
          variationIndex: 0,
          customInstructions: "",
        };

        setImageWorkflowById((current) => ({
          ...current,
          [selectedImage.id]: nextWorkflow,
        }));
      } catch (analysisRequestError) {
        if (
          analysisRequestError instanceof
            DOMException &&
          analysisRequestError.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Automatische Raumanalyse fehlgeschlagen:",
          analysisRequestError
        );

        const analysisMessage =
          analysisRequestError instanceof Error
            ? analysisRequestError.message
            : "Das Raumfoto konnte nicht analysiert werden.";

        setAnalysisError(analysisMessage);

        setImageWorkflowById((current) => ({
          ...current,
          [selectedImage.id]: {
            roomAnalysis: null,
            transformationBrief: null,
            analysisConfirmed: false,
            analysisError: analysisMessage,
            preview: null,
            savedImageUrl: "",
            statusMessage: "",
            roomType: "livingRoom",
            style: "modern",
            generationMode: "preview",
            variationIndex: 0,
            customInstructions: "",
          },
        }));
      } finally {
        if (analysisSpinnerTimer !== null) {
          window.clearTimeout(
            analysisSpinnerTimer
          );
        }

        if (!controller.signal.aborted) {
          setAnalyzingRoom(false);
        }
      }
    }

    void analyzeRoom();

    return () => {
      controller.abort();
    };
  }, [
    listing,
    selectedImage,
    hasHomeStagingAccess,
    analysisRefreshKey,
    router,
    imageWorkflowById,
    batchAnalyzing,
  ]);
  const previewUrl = preview
    ? `data:${preview.mimeType};base64,${preview.imageBase64}`
    : "";

  const batchPreviewItems =
    stagingImages.flatMap(
      (image) => {
        const workflow =
          imageWorkflowById[
            image.id
          ];

        if (
          !workflow?.preview
        ) {
          return [];
        }

        return [
          {
            image,
            workflow,
            previewUrl:
              "data:" +
              workflow.preview
                .mimeType +
              ";base64," +
              workflow.preview
                .imageBase64,
          },
        ];
      }
    );

  async function analyzeSingleImage(
    image: ListingImage
  ): Promise<ImageWorkflowState | null> {
    if (!listing) {
      return null;
    }

    try {
      const response = await fetch(
        "/api/home-staging/analyze",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            listingId: listing.id,
            sourceImageId: image.id,
          }),
        }
      );

      if (response.status === 401) {
        router.replace("/login");

        throw new Error(
          "Die Sitzung ist abgelaufen."
        );
      }

      const data =
        (await response
          .json()
          .catch(() => ({}))) as
          AnalyzeResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.analysis ||
        !data.transformationBrief
      ) {
        throw new Error(
          data.details ||
            data.error ||
            "Das Raumfoto konnte nicht analysiert werden."
        );
      }

      const analyzedRoomType =
        resolveGeneratableRoomType(
          data.analysis
        );

      const analyzedStyle =
        isSelectableStyle(
          data.analysis.style
        )
          ? data.analysis.style
          : "modern";

      const canGenerate =
        Boolean(
          data.transformationBrief
            .canGenerate
        ) &&
        analyzedRoomType !== null;

      const nextWorkflow:
        ImageWorkflowState = {
          roomAnalysis:
            data.analysis,
          transformationBrief:
            data.transformationBrief,
          analysisConfirmed:
            canGenerate,
          analysisError: "",
          preview: null,
          savedImageUrl: "",
          statusMessage:
            canGenerate
              ? "Die Analyse wurde für die Batch-Transformation bestätigt."
              : "Dieses Raumfoto muss vor der Transformation geprüft werden.",
          roomType:
            analyzedRoomType ??
            "livingRoom",
          style:
            analyzedStyle,
          generationMode:
            "preview",
          variationIndex: 0,
          customInstructions: "",
        };

      setImageWorkflowById(
        (current) => ({
          ...current,
          [image.id]:
            nextWorkflow,
        })
      );

      return nextWorkflow;
    } catch (imageAnalysisError) {
      const message =
        imageAnalysisError instanceof
        Error
          ? imageAnalysisError.message
          : "Das Raumfoto konnte nicht analysiert werden.";

      setImageWorkflowById(
        (current) => ({
          ...current,
          [image.id]: {
            roomAnalysis: null,
            transformationBrief:
              null,
            analysisConfirmed:
              false,
            analysisError:
              message,
            preview: null,
            savedImageUrl: "",
            statusMessage: "",
            roomType:
              "livingRoom",
            style: "modern",
            generationMode:
              "preview",
            variationIndex: 0,
            customInstructions: "",
          },
        })
      );

      return null;
    }
  }

  async function analyzeAllImages() {
    if (
      !listing ||
      stagingImages.length === 0 ||
      batchAnalyzing ||
      analyzingRoom ||
      generating ||
      saving ||
      uploadingImages ||
      listing.archivedAt
    ) {
      return;
    }

    const total =
      stagingImages.length;

    const queue = [
      ...stagingImages,
    ];

    const workerCount =
      Math.min(
        4,
        queue.length
      );

    let completed = 0;
    let generated = 0;
    let skipped = 0;
    let failed = 0;

    try {
      setBatchAnalyzing(true);
      setGenerating(true);
      setError("");

      setBatchAnalysisMessage(
        "Bis zu vier Raumfotos werden gleichzeitig analysiert und direkt transformiert."
      );

      setBatchAnalysisProgress({
        current: 0,
        total,
        currentImageId: "",
      });

      await Promise.all(
        Array.from(
          {
            length:
              workerCount,
          },
          async (
            _,
            workerIndex
          ) => {
            while (
              queue.length > 0
            ) {
              const image =
                queue.shift();

              if (!image) {
                return;
              }

              try {
                setBatchAnalysisMessage(
                  "Pipeline " +
                    (workerIndex + 1) +
                    ": Fotoanalyse wird geprüft."
                );

                let workflow:
                  | ImageWorkflowState
                  | null
                  | undefined =
                    imageWorkflowById[
                      image.id
                    ];

                if (
                  !workflow
                    ?.roomAnalysis ||
                  !workflow
                    .transformationBrief ||
                  workflow
                    .analysisError
                ) {
                  workflow =
                    await analyzeSingleImage(
                      image
                    );
                } else if (
                  workflow
                    .transformationBrief
                    .canGenerate &&
                  resolveGeneratableRoomType(
                    workflow
                      .roomAnalysis
                  ) !== null &&
                  !workflow
                    .analysisConfirmed
                ) {
                  const confirmedRoomType =
                    resolveGeneratableRoomType(
                      workflow
                        .roomAnalysis
                    );

                  const confirmedWorkflow:
                    ImageWorkflowState = {
                      ...workflow,
                      roomType:
                        confirmedRoomType ??
                        workflow.roomType,
                      analysisConfirmed:
                        true,
                    };

                  workflow =
                    confirmedWorkflow;

                  setImageWorkflowById(
                    (current) => ({
                      ...current,
                      [image.id]:
                        confirmedWorkflow,
                    })
                  );
                }

                if (
                  !workflow ||
                  !workflow
                    .analysisConfirmed
                ) {
                  skipped += 1;

                  continue;
                }

                if (
                  workflow.preview ||
                  workflow
                    .savedImageUrl
                ) {
                  skipped += 1;

                  continue;
                }

                setBatchAnalysisMessage(
                  "Pipeline " +
                    (workerIndex + 1) +
                    ": Bild wird jetzt von der AI transformiert."
                );

                await runGenerationForImage(
                  image,
                  workflow,
                  workflow
                    .variationIndex
                );

                generated += 1;
              } catch (
                pipelineError
              ) {
                failed += 1;

                const message =
                  pipelineError instanceof
                  Error
                    ? pipelineError
                        .message
                    : "Dieses Raumfoto konnte nicht vollständig verarbeitet werden.";

                console.error(
                  "HOME-STAGING PIPELINE ERROR:",
                  {
                    sourceImageId:
                      image.id,
                    message,
                  }
                );

                setImageWorkflowById(
                  (current) => {
                    const currentWorkflow =
                      current[
                        image.id
                      ];

                    if (
                      !currentWorkflow
                    ) {
                      return current;
                    }

                    return {
                      ...current,
                      [image.id]: {
                        ...currentWorkflow,
                        statusMessage:
                          "Verarbeitung fehlgeschlagen: " +
                          message,
                      },
                    };
                  }
                );
              } finally {
                completed += 1;

                setBatchAnalysisProgress({
                  current:
                    completed,
                  total,
                  currentImageId:
                    image.id,
                });

                setBatchAnalysisMessage(
                  completed +
                    " von " +
                    total +
                    " Raumfotos verarbeitet. " +
                    generated +
                    " Transformation(en) fertig."
                );
              }
            }
          }
        )
      );

      if (
        generated === 0 &&
        failed === 0 &&
        skipped > 0
      ) {
        setBatchAnalysisMessage(
          "Alle geeigneten Raumfotos waren bereits verarbeitet oder benötigen eine manuelle Prüfung."
        );

        return;
      }

      if (failed > 0) {
        setBatchAnalysisMessage(
          generated +
            " Bild(er) erfolgreich transformiert, " +
            failed +
            " fehlgeschlagen und " +
            skipped +
            " übersprungen."
        );

        return;
      }

      setBatchAnalysisMessage(
        generated +
          " Bild(er) wurden erfolgreich transformiert. " +
          skipped +
          " Bild(er) wurden übersprungen."
      );
    } catch (batchError) {
      console.error(
        "Mehrbild-Pipeline fehlgeschlagen:",
        batchError
      );

      setError(
        batchError instanceof
        Error
          ? batchError.message
          : "Die Mehrbildverarbeitung konnte nicht abgeschlossen werden."
      );
    } finally {
      setGenerating(false);
      setBatchAnalyzing(false);

      setBatchAnalysisProgress({
        current:
          completed,
        total,
        currentImageId: "",
      });
    }
  }

  function confirmRoomAnalysis() {
    if (
      !roomAnalysis ||
      !transformationBrief?.canGenerate
    ) {
      setError(
        "Die Raumanalyse ist noch nicht ausreichend sicher."
      );
      return;
    }

    if (
      !isSelectableRoomType(
        roomAnalysis.roomType
      )
    ) {
      setError(
        "Die erkannte Spezialtransformation wird im nächsten Schritt mit der Generierung verbunden."
      );
      return;
    }

    const confirmationMessage =
      "Die Raumanalyse wurde bestätigt.";

    setAnalysisConfirmed(true);
    setError("");
    setStatusMessage(
      confirmationMessage
    );

    updateSelectedImageWorkflow({
      analysisConfirmed: true,
      statusMessage: confirmationMessage,
    });
  }

  function retryRoomAnalysis() {
    if (selectedImageId) {
      setImageWorkflowById((current) => {
        if (!current[selectedImageId]) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[selectedImageId];

        return next;
      });
    }

    clearImageWorkflowEditor();

    setAnalysisRefreshKey(
      (currentValue) =>
        currentValue + 1
    );
  }
  function resetResult() {
    setPreview(null);
    setSavedImageUrl("");
    setStatusMessage("");
    setError("");
    setVariationIndex(0);

    updateSelectedImageWorkflow({
      preview: null,
      savedImageUrl: "",
      statusMessage: "",
      variationIndex: 0,
    });
  }

  function chooseImage(imageId: string) {
    const storedWorkflow =
      imageWorkflowById[imageId];

    setSelectedImageId(imageId);

    if (storedWorkflow) {
      restoreImageWorkflow(storedWorkflow);
      return;
    }

    clearImageWorkflowEditor();
  }

  function chooseRoomType(value: RoomType) {
    setRoomType(value);
    setAnalysisConfirmed(false);
    resetResult();

    updateSelectedImageWorkflow({
      roomType: value,
      analysisConfirmed: false,
    });
  }

  function chooseStyle(value: StagingStyle) {
    setStyle(value);
    setAnalysisConfirmed(false);
    resetResult();

    updateSelectedImageWorkflow({
      style: value,
      analysisConfirmed: false,
    });
  }

  function chooseGenerationMode(
    mode: GenerationMode
  ) {
    setGenerationMode(mode);
    resetResult();

    updateSelectedImageWorkflow({
      generationMode: mode,
    });
  }

  function changeCustomInstructions(
    value: string
  ) {
    const nextValue =
      value.slice(0, 500);

    setCustomInstructions(nextValue);
    resetResult();

    updateSelectedImageWorkflow({
      customInstructions: nextValue,
    });
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (
      !listing ||
      selectedFiles.length === 0 ||
      uploadingImages ||
      batchAnalyzing ||
      generating ||
      saving
    ) {
      return;
    }

    const availableSlots = Math.max(
      0,
      5 - listing.images.length
    );

    if (availableSlots === 0) {
      setError(
        "Für dieses Objekt sind bereits 10 Bilder gespeichert."
      );
      return;
    }

    const filesToUpload = selectedFiles.slice(
      0,
      availableSlots
    );

    const invalidFile = filesToUpload.find(
      (file) =>
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type) ||
        file.size > 10 * 1024 * 1024
    );

    if (invalidFile) {
      setError(
        "Erlaubt sind JPEG, PNG und WebP mit maximal 10 MB pro Bild."
      );
      return;
    }

    try {
      setUploadingImages(true);
      setUploadMessage("");
      setError("");
      setStatusMessage("");

      const uploadedImages: ListingImage[] = [];

      for (
        let index = 0;
        index < filesToUpload.length;
        index += 1
      ) {
        const file = filesToUpload[index];

        setUploadMessage(
          `Bild ${index + 1} von ${
            filesToUpload.length
          } wird hochgeladen …`
        );

        const safeFileName = file.name
          .normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const blob = await upload(
          `listing-images/${listing.id}/${Date.now()}-${index}-${
            safeFileName || "objektbild"
          }`,
          file,
          {
            access: "public",
            handleUploadUrl:
              "/api/listing-images/upload",
            clientPayload: JSON.stringify({
              listingId: listing.id,
            }),
          }
        );

        const imageResponse = await fetch(
          "/api/listing-images",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              listingId: listing.id,
              url: blob.url,
              storageKey: blob.pathname,
              fileName: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
            }),
          }
        );

        if (imageResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const imageData = (await imageResponse
          .json()
          .catch(() => ({}))) as {
          image?: ListingImage;
          error?: string;
        };

        if (
          !imageResponse.ok ||
          !imageData.image
        ) {
          throw new Error(
            imageData.error ||
              `Das Bild „${file.name}“ konnte nicht gespeichert werden.`
          );
        }

        uploadedImages.push(imageData.image);
      }

      setListing((currentListing) => {
        if (!currentListing) {
          return currentListing;
        }

        return {
          ...currentListing,
          images: [
            ...currentListing.images,
            ...uploadedImages,
          ].sort(
            (firstImage, secondImage) =>
              firstImage.position -
              secondImage.position
          ),
        };
      });

      if (uploadedImages[0]) {
        chooseImage(
          uploadedImages[0].id
        );
      }

      setPreview(null);
      setSavedImageUrl("");

      setUploadMessage(
        uploadedImages.length === 1
          ? "Das neue Raumfoto wurde gespeichert und ausgewählt."
          : `${uploadedImages.length} neue Raumfotos wurden gespeichert. Das erste neue Bild wurde ausgewählt.`
      );
    } catch (uploadError) {
      console.error(
        "Raumfotos konnten nicht hochgeladen werden:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Die Raumfotos konnten nicht hochgeladen werden."
      );
    } finally {
      setUploadingImages(false);
    }
  }

  function requestImageDeletion(
    image: ListingImage
  ) {
    if (
      generating ||
      saving ||
      uploadingImages ||
      batchAnalyzing ||
      deletingImageId
    ) {
      return;
    }

    setPendingDeleteImage(image);
    setError("");
    setUploadMessage("");
  }

  function cancelImageDeletion() {
    if (deletingImageId) {
      return;
    }

    setPendingDeleteImage(null);
  }

  async function deleteSelectedImage() {
    const image = pendingDeleteImage;

    if (
      !listing ||
      !image ||
      deletingImageId ||
      generating ||
      saving ||
      uploadingImages ||
      batchAnalyzing
    ) {
      return;
    }

    try {
      setDeletingImageId(image.id);
      setError("");
      setUploadMessage("");

      const response = await fetch(
        `/api/listing-images/${encodeURIComponent(
          image.id
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = (await response
        .json()
        .catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        nextPrimaryImage?: ListingImage | null;
      };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Das Bild konnte nicht gelöscht werden."
        );
      }

      const remainingImages =
        listing.images.filter(
          (currentImage) =>
            currentImage.id !== image.id
        );

      const nextPrimaryId =
        data.nextPrimaryImage?.id ?? null;

      const updatedImages = remainingImages
        .map((currentImage) => ({
          ...currentImage,
          isPrimary: nextPrimaryId
            ? currentImage.id === nextPrimaryId
            : currentImage.isPrimary,
        }))
        .sort(
          (firstImage, secondImage) =>
            Number(secondImage.isPrimary) -
              Number(firstImage.isPrimary) ||
            firstImage.position -
              secondImage.position
        );

      setListing({
        ...listing,
        images: updatedImages,
      });

      setImageWorkflowById((current) => {
        if (!current[image.id]) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[image.id];

        return next;
      });

      setSelectedImageId((currentId) =>
        currentId === image.id
          ? nextPrimaryId ||
            updatedImages[0]?.id ||
            ""
          : currentId
      );

      resetResult();
      setPendingDeleteImage(null);
      setUploadMessage(
        "Das Raumfoto wurde dauerhaft gelöscht."
      );
    } catch (deleteError) {
      console.error(
        "Raumfoto konnte nicht gelöscht werden:",
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Das Raumfoto konnte nicht gelöscht werden."
      );
    } finally {
      setDeletingImageId(null);
    }
  }

  function renderImageUpload() {
    const imageCount =
      listing?.images.length ?? 0;

    const uploadDisabled =
      uploadingImages ||
      batchAnalyzing ||
      generating ||
      saving ||
      imageCount >= 5;

    return (
      <div className="directImageUpload">
        <label
          className={
            uploadDisabled
              ? "directImageUploadButton directImageUploadButtonDisabled"
              : "directImageUploadButton"
          }
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploadDisabled}
            onChange={handleImageUpload}
          />

          <span
            className="directImageUploadIcon"
            aria-hidden="true"
          >
            ＋
          </span>

          <div>
            <strong>
              {uploadingImages
                ? "Raumfotos werden hochgeladen …"
                : imageCount >= 10
                  ? "Maximal 10 Objektbilder erreicht"
                  : "Neue Raumfotos hochladen"}
            </strong>

            <small>
              JPEG, PNG oder WebP · maximal
              10 MB pro Bild
            </small>
          </div>
        </label>

        {uploadMessage && (
          <p className="directImageUploadMessage">
            {uploadMessage}
          </p>
        )}
      </div>
    );
  }

  async function runGenerationForImage(
    image: ListingImage,
    workflow: ImageWorkflowState,
    variationIndexForRequest: number
  ): Promise<HomeStagingPreview> {
    if (!listing) {
      throw new Error(
        "Das Objekt wurde nicht geladen."
      );
    }

    const processingMessage =
      "Das Raumfoto wird von der AI transformiert.";

    setImageWorkflowById(
      (current) => ({
        ...current,
        [image.id]: {
          ...(current[image.id] ??
            workflow),
          analysisConfirmed:
            true,
          analysisError: "",
          preview: null,
          savedImageUrl: "",
          statusMessage:
            processingMessage,
          variationIndex:
            variationIndexForRequest,
        },
      })
    );

    const outputSize =
      await detectOutputSize(
        image.url,
        workflow.generationMode
      );

    const response = await fetch(
      "/api/home-staging/generate",
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          listingId: listing.id,
          sourceImageId:
            image.id,
          roomType:
            workflow.roomType,
          style:
            workflow.style,
          customInstructions:
            workflow
              .customInstructions,
          outputSize,
          mode:
            workflow
              .generationMode,
          variationIndex:
            variationIndexForRequest,
        }),
      }
    );

    if (response.status === 401) {
      router.replace("/login");

      throw new Error(
        "Die Sitzung ist abgelaufen."
      );
    }

    const data =
      (await response
        .json()
        .catch(() => ({}))) as
        GenerateResponse;

    if (
      !response.ok ||
      !data.success ||
      !data.preview
    ) {
      throw new Error(
        data.details ||
          data.error ||
          "Die AI-Visualisierung konnte nicht erstellt werden."
      );
    }

    const generatedPreview =
      data.preview as HomeStagingPreview;

    const previewMessage =
      "Die Vorschau wurde erstellt. Sie ist noch nicht gespeichert.";

    setImageWorkflowById(
      (current) => ({
        ...current,
        [image.id]: {
          ...(current[image.id] ??
            workflow),
          analysisConfirmed:
            true,
          analysisError: "",
          preview:
            generatedPreview,
          savedImageUrl: "",
          statusMessage:
            previewMessage,
          variationIndex:
            variationIndexForRequest,
        },
      })
    );

    if (
      selectedImage?.id ===
      image.id
    ) {
      setPreview(
        generatedPreview
      );

      setSavedImageUrl("");

      setStatusMessage(
        previewMessage
      );
    }

    return generatedPreview;
  }


  async function runGeneration(
    variationIndexForRequest: number
  ) {
    if (
      !listing ||
      !selectedImage ||
      !analysisConfirmed ||
      analyzingRoom ||
      generating ||
      saving
    ) {
      return;
    }

    const selectedWorkflow:
      ImageWorkflowState = {
        roomAnalysis,
        transformationBrief,
        analysisConfirmed,
        analysisError: "",
        preview,
        savedImageUrl,
        statusMessage,
        roomType,
        style,
        generationMode,
        variationIndex:
          variationIndexForRequest,
        customInstructions,
      };

    try {
      setGenerating(true);
      setPreview(null);
      setSavedImageUrl("");
      setStatusMessage("");
      setError("");

      updateSelectedImageWorkflow({
        preview: null,
        savedImageUrl: "",
        statusMessage: "",
        variationIndex:
          variationIndexForRequest,
      });

      await runGenerationForImage(
        selectedImage,
        selectedWorkflow,
        variationIndexForRequest
      );
    } catch (generateError) {
      console.error(
        "Home-Staging-Vorschau fehlgeschlagen:",
        generateError
      );

      setError(
        generateError instanceof
        Error
          ? generateError.message
          : "Die AI-Visualisierung konnte nicht erstellt werden."
      );
    } finally {
      setGenerating(false);
    }
  }

  function generatePreview() {
    void runGeneration(variationIndex);
  }

  function generateNewVariant() {
    const nextVariationIndex =
      variationIndex + 1;

    setVariationIndex(nextVariationIndex);

    updateSelectedImageWorkflow({
      variationIndex: nextVariationIndex,
    });

    void runGeneration(
      nextVariationIndex
    );
  }

  async function saveResult() {
    if (
      !listing ||
      !preview ||
      saving ||
      generating ||
      savedImageUrl
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setStatusMessage("");

      const fileName = `home-staging-${Date.now()}.webp`;

      const resultFile = base64ToFile(
        preview.imageBase64,
        fileName,
        preview.mimeType
      );

      const pathname =
        `home-staging/${listing.id}/` +
        `${preview.sourceImageId}/${fileName}`;

      const uploadedBlob = await upload(
        pathname,
        resultFile,
        {
          access: "public",
          handleUploadUrl:
            "/api/home-staging/upload",
          clientPayload: JSON.stringify({
            listingId: listing.id,
            sourceImageId:
              preview.sourceImageId,
            roomType: preview.roomType,
            style: preview.style,
            aiModel: preview.aiModel,
            promptVersion:
              preview.promptVersion,
          }),
        }
      );

      const saveResponse = await fetch(
        "/api/home-staging",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listingId: listing.id,
            sourceImageId:
              preview.sourceImageId,
            url: uploadedBlob.url,
            storageKey:
              uploadedBlob.pathname,
            fileName,
            mimeType: preview.mimeType,
            sizeBytes: resultFile.size,
            roomType: preview.roomType,
            style: preview.style,
            aiModel: preview.aiModel,
            promptVersion:
              preview.promptVersion,
          }),
        }
      );

      if (saveResponse.status === 401) {
        router.replace("/login");
        return;
      }

      const saveData =
        (await saveResponse.json()) as SaveResponse;

      if (
        !saveResponse.ok ||
        !saveData.success
      ) {
        throw new Error(
          saveData.error ||
            "Die AI-Visualisierung konnte nicht gespeichert werden."
        );
      }

      const nextSavedImageUrl =
        saveData.image?.url ||
        uploadedBlob.url;

      const saveMessage =
        "Die AI-Visualisierung wurde dauerhaft mit dem Objekt gespeichert.";

      setSavedImageUrl(nextSavedImageUrl);
      setStatusMessage(saveMessage);

      updateSelectedImageWorkflow({
        savedImageUrl: nextSavedImageUrl,
        statusMessage: saveMessage,
      });
    } catch (saveError) {
      console.error(
        "Home-Staging-Ergebnis konnte nicht gespeichert werden:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Die AI-Visualisierung konnte nicht gespeichert werden."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="stagingPage">
        <div className="statusCard">
          <div className="spinner" />
          <strong>Home Staging wird vorbereitet …</strong>
          <span>
            Objektbilder und Angaben werden geladen.
          </span>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (accessError) {
    return (
      <main className="stagingPage">
        <div className="statusCard errorCard">
          <strong>
            Zugriff konnte nicht geprüft werden
          </strong>

          <span>{accessError}</span>

          <Link
            href="/cockpit"
            className="primaryLink"
          >
            Zurück zum Makler-Cockpit
          </Link>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (
    accessChecked &&
    !hasHomeStagingAccess
  ) {
    return (
      <main className="stagingPage">
        <div
          className="statusCard"
          style={{
            maxWidth: "720px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignSelf: "center",
              border:
                "1px solid rgba(34, 211, 238, 0.45)",
              borderRadius: "999px",
              padding: "8px 14px",
              color: "#a5f3fc",
              background:
                "rgba(34, 211, 238, 0.1)",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.16em",
            }}
          >
            PRO-FUNKTION
          </span>

          <strong>
            Virtuelles Home Staging
          </strong>

          <span>
            Fotorealistische AI-Visualisierungen und
            die integrierte Grundrissanalyse gehören
            zum Pro-Angebot für CHF 79.90 pro Monat.
          </span>

          <span>
            Diese Funktionen sind weder im
            Founder-Angebot für CHF 19.90 pro Monat
            noch im Einzelobjekt für CHF 9.90
            enthalten.
          </span>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <Link
              href="/cockpit"
              className="primaryLink"
            >
              Zurück zum Makler-Cockpit
            </Link>

            <Link
              href="/#preise"
              className="primaryLink"
            >
              Pro-Angebot ansehen
            </Link>
          </div>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (error && !listing) {
    return (
      <main className="stagingPage">
        <div className="statusCard errorCard">
          <strong>
            Home Staging konnte nicht geöffnet werden
          </strong>
          <span>{error}</span>

          <Link
            href="/cockpit"
            className="primaryLink"
          >
            Zurück zum Makler-Cockpit
          </Link>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (!listing) {
    return null;
  }

  const isArchived = Boolean(listing.archivedAt);
  const hasImages = listing.images.length > 0;

  return (
    <main className="stagingPage">
      <section className="stagingContainer">
        <nav className="topNavigation">
          <Link
            href={`/cockpit/${listing.id}`}
            className="backLink"
          >
            ← Zurück zum Objekt
          </Link>

          <span className="mvpBadge">
            HOME STAGING MVP
          </span>
        </nav>

        <header className="hero">
          <div>
            <span className="eyebrow">
              VIRTUELLES HOME STAGING
            </span>

            <h1>
              Räume fotorealistisch einrichten
            </h1>

            <p>
              Wähle ein bestehendes Objektbild,
              bestimme Raumart und Stil und erstelle
              eine AI-visualisierte Vorschau.
            </p>
          </div>

          <div className="objectSummary">
            <span>AKTUELLES OBJEKT</span>
            <strong>
              {listing.propertyType} in{" "}
              {listing.location}
            </strong>

            {listing.postalCode && (
              <small>
                {listing.postalCode}{" "}
                {listing.location}
              </small>
            )}
          </div>
        </header>

        <div className="notice">
          <strong>
            Originalbild bleibt unverändert
          </strong>

          <span>
            Das AI-Ergebnis wird erst nach dem
            ausdrücklichen Klick auf „Ergebnis
            speichern“ dauerhaft übernommen.
          </span>
        </div>

        {isArchived && (
          <div className="messageBox warningBox">
            Dieses Objekt ist archiviert. Aktiviere
            es zuerst wieder, um eine Visualisierung
            zu erstellen.
          </div>
        )}

        {!hasImages ? (
          <section className="emptyState">
            <span className="emptyIcon">▧</span>

            <h2>
              Noch keine Objektbilder vorhanden
            </h2>

            <p>
              Lade zuerst auf der Objektseite ein
              Foto eines leeren oder wenig
              eingerichteten Raumes hoch.
            </p>

            {renderImageUpload()}

            <Link
              href={`/cockpit/${listing.id}`}
              className="secondaryPageLink"
            >
              Zur Objektseite
            </Link>
          </section>
        ) : (
          <>
            <section className="setupGrid">
              <div className="panel">
                <div className="panelHeading">
                  <span>1</span>

                  <div>
                    <small>AUSGANGSBILD</small>
                    <h2>Objektbild auswählen</h2>
                  </div>
                </div>

                <div className="imageSelection">
                  {listing.images.map(
                    (image, index) => (
                      <article
                        key={image.id}
                        className="imageChoiceWrapper"
                      >
                        <button
                          type="button"
                          className={
                            image.id ===
                            selectedImageId
                              ? "imageChoice imageChoiceActive"
                              : "imageChoice"
                          }
                          onClick={() =>
                            chooseImage(image.id)
                          }
                          disabled={
                            generating ||
                            saving ||
                            uploadingImages ||
                            batchAnalyzing ||
                            deletingImageId !== null
                          }
                          aria-label={`Bild ${
                            index + 1
                          } auswählen`}
                        >
                          <img
                            src={image.url}
                            alt={
                              image.fileName ||
                              `Objektbild ${index + 1}`
                            }
                          />

                          <span>
                            Bild {index + 1}
                            {image.isPrimary
                              ? " · Hauptbild"
                              : ""}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="deleteImageButton"
                          onClick={() =>
                            requestImageDeletion(
                              image
                            )
                          }
                          disabled={
                            generating ||
                            saving ||
                            uploadingImages ||
                            batchAnalyzing ||
                            deletingImageId !== null
                          }
                          aria-label={`Bild ${
                            index + 1
                          } löschen`}
                          title="Bild löschen"
                        >
                          {deletingImageId ===
                          image.id ? (
                            <span
                              className="deleteImageSpinner"
                              aria-hidden="true"
                            />
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </article>
                    )
                  )}
                </div>

                {renderImageUpload()}

                <section className="multiImageBatchPanel">
                  <div className="multiImageBatchHeader">
                    <div>
                      <small>
                        MEHRBILD-VERARBEITUNG
                      </small>

                      <h3>
                        Alle Raumfotos analysieren und transformieren
                      </h3>

                      <p>
                        Bis zu fünf Bilder werden
                        einzeln erkannt und erhalten
                        einen eigenen kontrollierten
                        Transformationsplan.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="analyzeAllImagesButton"
                      onClick={analyzeAllImages}
                      disabled={
                        batchAnalyzing ||
                        analyzingRoom ||
                        generating ||
                        saving ||
                        uploadingImages ||
                        isArchived
                      }
                    >
                      {batchAnalyzing
                        ? `Bild ${
                            Math.min(
                              batchAnalysisProgress.current +
                                1,
                              batchAnalysisProgress.total
                            )
                          } von ${
                            batchAnalysisProgress.total
                          } wird analysiert …`
                        : analyzedImageCount ===
                          stagingImages.length
                        ? "Fehlende Bilder verarbeiten"
                        : "Alle Bilder verarbeiten"}
                    </button>
                  </div>

                  <div className="multiImageProgressTrack">
                    <span
                      style={{
                        width:
                          batchAnalysisProgress.total >
                          0
                            ? `${Math.round(
                                (batchAnalysisProgress.current /
                                  batchAnalysisProgress.total) *
                                  100
                              )}%`
                            : `${Math.round(
                                (analyzedImageCount /
                                  Math.max(
                                    stagingImages.length,
                                    1
                                  )) *
                                  100
                              )}%`,
                      }}
                    />
                  </div>

                  <div className="multiImageStatusSummary">
                    <strong>
                      {analyzedImageCount} von{" "}
                      {stagingImages.length} Bildern
                      analysiert
                    </strong>

                    {batchAnalysisMessage && (
                      <span>
                        {batchAnalysisMessage}
                      </span>
                    )}
                  </div>

                  <div className="multiImageStatusList">
                    {stagingImages.map(
                      (image, index) => {
                        const workflow =
                          imageWorkflowById[
                            image.id
                          ];

                        const normalStatus =
                          getImageWorkflowStatus(
                            workflow
                          );

                        const isCurrentBatchImage =
                          batchAnalyzing &&
                          batchAnalysisProgress
                            .currentImageId ===
                            image.id &&
                          batchAnalysisProgress
                            .current <
                            batchAnalysisProgress
                              .total;

                        const status =
                          isCurrentBatchImage
                            ? {
                                label:
                                  "Wird analysiert",
                                tone:
                                  "processing",
                              }
                            : normalStatus;

                        return (
                          <button
                            key={image.id}
                            type="button"
                            className={
                              image.id ===
                              selectedImageId
                                ? "multiImageStatusItem multiImageStatusItemActive"
                                : "multiImageStatusItem"
                            }
                            onClick={() =>
                              chooseImage(
                                image.id
                              )
                            }
                            disabled={
                              batchAnalyzing ||
                              generating ||
                              saving
                            }
                          >
                            <span className="multiImageStatusNumber">
                              {index + 1}
                            </span>

                            <span className="multiImageStatusName">
                              <strong>
                                Bild {index + 1}
                              </strong>

                              <small>
                                {workflow
                                  ?.roomAnalysis
                                  ?.roomTypeLabel ||
                                  image.fileName ||
                                  "Raumfoto"}
                              </small>
                            </span>

                            <span
                              className={`multiImageStatusBadge multiImageStatusBadge-${status.tone}`}
                            >
                              {status.label}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>

                {pendingDeleteImage ? (
                  <div
                    className="imageDeleteConfirmation"
                    role="alert"
                  >
                      <div>
                        <small>
                          BILD DAUERHAFT LÖSCHEN
                        </small>

                        <strong>
                          Raumfoto wirklich entfernen?
                        </strong>

                        <p>
                          Das ausgewählte Bild wird
                          aus dem Objekt und dem
                          Bildspeicher gelöscht.
                          Dieser Vorgang kann nicht
                          rückgängig gemacht werden.
                        </p>

                        {pendingDeleteImage.isPrimary ? (
                          <p className="primaryDeleteWarning">
                            Dieses Bild ist das
                            Hauptbild. Inserat-AI
                            bestimmt automatisch ein
                            neues Hauptbild.
                          </p>
                        ) : null}
                      </div>

                      <div className="imageDeleteButtons">
                        <button
                          type="button"
                          className="cancelImageDeleteButton"
                          onClick={
                            cancelImageDeletion
                          }
                          disabled={
                            deletingImageId !== null
                          }
                        >
                          Abbrechen
                        </button>

                        <button
                          type="button"
                          className="confirmImageDeleteButton"
                          onClick={
                            deleteSelectedImage
                          }
                          disabled={
                            deletingImageId !== null
                          }
                        >
                          {deletingImageId
                            ? "Wird gelöscht …"
                            : "Dauerhaft löschen"}
                        </button>
                      </div>
                  </div>
                ) : null}

              </div>

                          <section className="roomAnalysisPanel">
              <div className="roomAnalysisIntro">
                <div className="roomAnalysisIcon">AI</div>

                <div>
                  <small>AUTOMATISCHE RAUMANALYSE</small>

                  <h2>Inserat-AI versteht das Raumfoto</h2>

                  <p>
                    Raumart, Zustand, sichtbare Fakten und
                    geschützte Architektur werden vor der
                    Transformation objektbezogen geprüft.
                  </p>
                </div>
              </div>

              {analyzingRoom ? (
                <div className="roomAnalysisLoading">
                  <span className="roomAnalysisSpinner" />

                  <div>
                    <strong>Raumfoto wird analysiert …</strong>

                    <p>
                      Inserat-AI erstellt einen kontrollierten
                      Transformationsplan.
                    </p>
                  </div>
                </div>
              ) : analysisError ? (
                <div className="roomAnalysisError">
                  <div>
                    <strong>Analyse nicht abgeschlossen</strong>
                    <span>{analysisError}</span>
                  </div>

                  <button
                    type="button"
                    onClick={retryRoomAnalysis}
                    disabled={generating || saving}
                  >
                    Erneut analysieren
                  </button>
                </div>
              ) : roomAnalysis ? (
                <div className="roomAnalysisResult">
                  <div className="roomAnalysisHeader">
                    <div>
                      <small>ERKANNTES RAUMFOTO</small>
                      <h3>{roomAnalysis.roomTypeLabel}</h3>
                    </div>

                    <span className="roomConfidenceBadge">
                      {Math.round(roomAnalysis.confidence * 100)}%
                      Sicherheit
                    </span>
                  </div>

                  <p className="roomAnalysisSummary">
                    {roomAnalysis.summary}
                  </p>

                  <div className="roomAnalysisMetrics">
                    <article>
                      <small>ZUSTAND</small>
                      <strong>
                        {
                          ROOM_CONDITION_LABELS[
                            roomAnalysis.roomCondition
                          ]
                        }
                      </strong>
                    </article>

                    <article>
                      <small>TRANSFORMATION</small>
                      <strong>
                        {
                          TRANSFORMATION_LABELS[
                            roomAnalysis.transformation
                          ]
                        }
                      </strong>
                    </article>

                    <article>
                      <small>STILEMPFEHLUNG</small>
                      <strong>
                        {STYLES.find(
                          (option) =>
                            option.value === roomAnalysis.style
                        )?.label || roomAnalysis.style}
                      </strong>
                    </article>
                  </div>

                  {roomAnalysis.visibleFacts.length > 0 && (
                    <div className="roomAnalysisFacts">
                      <small>SICHTBARE FAKTEN</small>

                      <ul>
                        {roomAnalysis.visibleFacts
                          .slice(0, 8)
                          .map((fact, index) => (
                            <li key={`${fact}-${index}`}>
                              {fact}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {roomAnalysis.lockedArchitecture.length > 0 && (
                    <div className="roomArchitectureFacts">
                      <small>GESCHÜTZTE ARCHITEKTUR</small>

                      <ul>
                        {roomAnalysis.lockedArchitecture
                          .slice(0, 6)
                          .map((rule, index) => (
                            <li key={`${rule}-${index}`}>
                              {rule}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {roomAnalysis.warnings.length > 0 && (
                    <div className="roomAnalysisWarnings">
                      <strong>Hinweise der Analyse</strong>

                      {roomAnalysis.warnings.map(
                        (warning, index) => (
                          <span
                            key={`${warning}-${index}`}
                          >
                            {warning}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  <div className="roomAnalysisConfirmation">
                    <div>
                      <strong>Analyse prüfen und bestätigen</strong>

                      <p>
                        Raumart und Stil können im nächsten
                        Bereich korrigiert werden.
                      </p>
                    </div>

                    <button
                      type="button"
                      className={
                        analysisConfirmed
                          ? "confirmAnalysisButton confirmAnalysisButtonDone"
                          : "confirmAnalysisButton"
                      }
                      onClick={confirmRoomAnalysis}
                      disabled={
                        !transformationBrief?.canGenerate ||
                        !isSelectableRoomType(
                          roomAnalysis.roomType
                        ) ||
                        generating ||
                        saving
                      }
                    >
                      {analysisConfirmed
                        ? "✓ Analyse bestätigt"
                        : "Analyse bestätigen"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="roomDesignGroup">
              <div className="workflowGroupHeading">
                <span>2</span>

                <div>
                  <small>RAUM GESTALTEN</small>

                  <h2>
                    Raum, Stil und Wünsche festlegen
                  </h2>

                  <p>
                    Bestimme Nutzung, Einrichtung und
                    individuelle Vorgaben gemeinsam
                    in einem Arbeitsbereich.
                  </p>
                </div>
              </div>
<div className="panel">
                <div className="panelHeading">
                  <span>2</span>

                  <div>
                    <small>RAUMART</small>
                    <h2>Nutzung festlegen</h2>
                  </div>
                </div>

                <div className="optionGrid">
                  {ROOM_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        roomType === option.value
                          ? "optionCard optionCardActive"
                          : "optionCard"
                      }
                      onClick={() =>
                        chooseRoomType(
                          option.value
                        )
                      }
                      disabled={
                        generating || saving
                      }
                    >
                      <strong>
                        {option.label}
                      </strong>
                      <span>
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panelHeading">
                  <span>3</span>

                  <div>
                    <small>EINRICHTUNGSSTIL</small>
                    <h2>Wirkung bestimmen</h2>
                  </div>
                </div>

                <div className="optionGrid">
                  {STYLES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        style === option.value
                          ? "optionCard optionCardActive"
                          : "optionCard"
                      }
                      onClick={() =>
                        chooseStyle(option.value)
                      }
                      disabled={
                        generating || saving
                      }
                    >
                      <strong>
                        {option.label}
                      </strong>
                      <span>
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel customPromptPanel">
                <div className="panelHeading">
                  <span>4</span>

                  <div>
                    <small>EIGENE WÜNSCHE</small>
                    <h2>Einrichtung beschreiben</h2>
                  </div>
                </div>

                <label className="customPromptField">
                  <span>
                    Wie soll der Raum eingerichtet
                    werden?
                  </span>

                  <textarea
                    value={customInstructions}
                    onChange={(event) =>
                      changeCustomInstructions(
                        event.target.value
                      )
                    }
                    maxLength={500}
                    rows={5}
                    disabled={
                      generating || saving
                    }
                    placeholder="Zum Beispiel: Helles beigefarbenes Sofa, runder Holztisch, warme Beleuchtung, wenige Pflanzen und keine Teppiche."
                  />
                </label>

                <div className="customPromptFooter">
                  <span>
                    Die Wünsche gelten nur für Möbel,
                    Farben, Textilien, Licht und
                    Dekoration. Bauliche Merkmale
                    bleiben geschützt.
                  </span>

                  <strong>
                    {customInstructions.length} / 500
                  </strong>
                </div>

                <div className="promptExamples">
                  <span>Beispiele:</span>
                  <button
                    type="button"
                    onClick={() =>
                      changeCustomInstructions(
                        "Helles Sofa, runder Holztisch, warme Beleuchtung und wenige Pflanzen."
                      )
                    }
                    disabled={generating || saving}
                  >
                    Warm und wohnlich
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeCustomInstructions(
                        "Dunkles Ledersofa, schwarzer Metalltisch, dezente Kunst und keine Teppiche."
                      )
                    }
                    disabled={generating || saving}
                  >
                    Markant und modern
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeCustomInstructions(
                        "Naturholz, helle Stoffe, dezente Pflanzen und möglichst wenig Dekoration."
                      )
                    }
                    disabled={generating || saving}
                  >
                    Natürlich und ruhig
                  </button>
                </div>
              </div>
            </section>

            <FloorPlanAnalyzer
              listingId={listing.id}
              disabled={
                generating ||
                saving ||
                uploadingImages
              }
              onApply={changeCustomInstructions}
            />
                        </section>

            {batchPreviewItems.length > 1 && (
              <section className="multiResultSection">
                <div className="multiResultHeading">
                  <div>
                    <span className="eyebrow">
                      MEHRBILD-ERGEBNISSE
                    </span>

                    <h2>
                      Alle AI-Transformationen
                    </h2>

                    <p>
                      Jedes Raumfoto besitzt ein eigenes
                      Original und ein eigenes AI-Ergebnis.
                    </p>
                  </div>

                  <span className="aiLabel">
                    {batchPreviewItems.length}
                    {" "}BILDER FERTIG
                  </span>
                </div>

                <div className="multiResultGrid">
                  {batchPreviewItems.map(
                    (
                      {
                        image,
                        workflow,
                        previewUrl:
                          resultPreviewUrl,
                      },
                      index
                    ) => (
                      <article
                        key={image.id}
                        className={
                          selectedImage?.id ===
                          image.id
                            ? "multiResultCard multiResultCardActive"
                            : "multiResultCard"
                        }
                      >
                        <div className="multiResultCardHeader">
                          <div>
                            <strong>
                              Bild {index + 1}
                            </strong>

                            <span>
                              {workflow
                                .roomAnalysis
                                ?.roomTypeLabel ||
                                image.fileName ||
                                "Raumfoto"}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="multiResultSelectButton"
                            onClick={() =>
                              chooseImage(
                                image.id
                              )
                            }
                          >
                            Öffnen
                          </button>
                        </div>

                        <div className="multiResultComparison">
                          <div className="multiResultImage">
                            <span>
                              ORIGINAL
                            </span>

                            <img
                              src={image.url}
                              alt={
                                "Originalbild " +
                                (index + 1)
                              }
                            />
                          </div>

                          <div className="multiResultImage multiResultImageAi">
                            <span>
                              AI-ERGEBNIS
                            </span>

                            <img
                              src={
                                resultPreviewUrl
                              }
                              alt={
                                "AI-Visualisierung " +
                                (index + 1)
                              }
                            />
                          </div>
                        </div>

                        <div className="multiResultStatus">
                          <strong>
                            {workflow
                              .savedImageUrl
                              ? "Gespeichert"
                              : "Vorschau bereit"}
                          </strong>

                          <span>
                            {workflow
                              .statusMessage}
                          </span>
                        </div>
                      </article>
                    )
                  )}
                </div>
              </section>
            )}


            <section className="generationPanel">
              <div className="generationModeSection">
                <div className="generationModeHeading">
                  <small>AUSGABEQUALITÄT</small>
                  <h2>Generierungsmodus wählen</h2>
                </div>

                <div className="generationModeGrid">
                  <button
                    type="button"
                    className={
                      generationMode === "preview"
                        ? "generationModeCard generationModeCardActive"
                        : "generationModeCard"
                    }
                    onClick={() =>
                      chooseGenerationMode(
                        "preview"
                      )
                    }
                    disabled={
                      generating ||
                      saving ||
                      uploadingImages
                    }
                  >
                    <span>⚡</span>

                    <div>
                      <strong>
                        Schnellvorschau
                      </strong>

                      <small>
                        Schneller prüfen, wie Stil,
                        Möbel und Farben wirken
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={
                      generationMode === "final"
                        ? "generationModeCard generationModeCardActive"
                        : "generationModeCard"
                    }
                    onClick={() =>
                      chooseGenerationMode(
                        "final"
                      )
                    }
                    disabled={
                      generating ||
                      saving ||
                      uploadingImages
                    }
                  >
                    <span>◆</span>

                    <div>
                      <strong>
                        Finales Vermarktungsbild
                      </strong>

                      <small>
                        Höhere Qualität für Inserat,
                        Exposé und Social Media
                      </small>
                    </div>
                  </button>
                </div>

                <div className="generationModeNotice">
                  {generationMode === "preview"
                    ? "Schnellmodus aktiv: geeignet zum Ausprobieren und Vergleichen."
                    : "Finalmodus aktiv: benötigt länger, liefert aber mehr Details und eine grössere Ausgabe."}
                </div>
              </div>
              <div>
                <span className="generationLabel">
                  BEREIT ZUR VISUALISIERUNG
                </span>

                <h2>
                  {ROOM_TYPES.find(
                    (option) =>
                      option.value === roomType
                  )?.label || "Raum"}
                  {" · "}
                  {STYLES.find(
                    (option) =>
                      option.value === style
                  )?.label || "Stil"}
                </h2>

                <p>
                  Die AI soll nur bewegliche Möbel
                  und Dekoration ergänzen. Bauliche
                  Merkmale sollen erhalten bleiben.
                </p>
              </div>

              <button
                type="button"
                className="generateButton"
                onClick={generatePreview}
                disabled={
                  analyzingRoom ||
                  !analysisConfirmed ||
                  generating ||
                  saving ||
                  isArchived ||
                  !selectedImage
                }
              >
                {analyzingRoom ? (
                  "Raum wird analysiert …"
                ) : !analysisConfirmed ? (
                  "Raumanalyse zuerst bestätigen"
                ) : generating ? (
                  <>
                    <span className="buttonSpinner" />
                    AI richtet den Raum ein …
                  </>
                ) : (
                  "AI-Visualisierung erstellen"
                )}
              </button>
            </section>

            {error && (
              <div className="messageBox errorBox">
                <strong>
                  Vorgang nicht abgeschlossen
                </strong>
                <span>{error}</span>
              </div>
            )}


            {generating && (
              <section className="generationProgress">
                <div className="largeSpinner" />

                <h2>
                  Die Räume werden visualisiert
                </h2>

                <p>
                  Bis zu vier Raumfotos werden parallel analysiert und transformiert. Fertige Ergebnisse erscheinen sofort.
                </p>
              </section>
            )}


            {preview && selectedImage && (
              <section className="resultSection">
                {statusMessage && (
                  <div className="resultStatusBar">
                    <div className="resultStatusIcon">
                      ✓
                    </div>

                    <div>
                      <strong>
                        {savedImageUrl
                          ? "Ergebnis gespeichert"
                          : "Vorschau bereit"}
                      </strong>

                      <span>
                        {statusMessage}
                      </span>
                    </div>
                  </div>
                )}
                <div className="resultHeading">
                  <div>
                    <span className="eyebrow">
                      VORHER / NACHHER
                    </span>

                    <h2>
                      Original und AI-Ergebnis
                    </h2>
                  </div>

                  <span className="aiLabel">
                    AI-VISUALISIERT
                  </span>
                </div>

                <div className="comparisonGrid">
                  <article className="comparisonCard">
                    <div className="imageHeader">
                      <strong>Original</strong>
                      <span>Unverändert</span>
                    </div>

                    <div className="comparisonImage">
                      <img
                        src={selectedImage.url}
                        alt="Originales Objektbild"
                      />
                    </div>
                  </article>

                  <article className="comparisonCard resultCard">
                    <div className="imageHeader">
                      <strong>
                        AI-Visualisierung
                      </strong>
                      <span>
                        Noch nicht automatisch
                        übernommen
                      </span>
                    </div>

                    <div className="comparisonImage">
                      <img
                        src={previewUrl}
                        alt="AI-visualisiertes Home-Staging-Ergebnis"
                      />

                      <span className="imageAiBadge">
                        AI-VISUALISIERT
                      </span>
                    </div>
                  </article>
                </div>

                <div className="savePanel">
                  <div>
                    <strong>
                      Ergebnis bewusst speichern
                    </strong>

                    <p>
                      Das Original bleibt erhalten.
                      Die AI-Version wird separat mit
                      diesem Objekt und dem
                      Ausgangsbild verbunden.
                    </p>
                  </div>

                  <div className="saveActions">
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={generateNewVariant}
                      disabled={
                        generating ||
                        saving ||
                        Boolean(savedImageUrl)
                      }
                    >
                      Neue Variante erstellen
                    </button>

                    <button
                      type="button"
                      className="saveButton"
                      onClick={saveResult}
                      disabled={
                        saving ||
                        generating ||
                        Boolean(savedImageUrl)
                      }
                    >
                      {saving
                        ? "Ergebnis wird gespeichert …"
                        : savedImageUrl
                          ? "Ergebnis gespeichert"
                          : "Ergebnis speichern"}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </section>

      <PageStyles />
    </main>
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      .stagingPage {
        min-height: 100vh;
        padding: 34px 20px 80px;
        background:
          radial-gradient(
            circle at 10% 0%,
            rgba(34, 211, 238, 0.12),
            transparent 30%
          ),
          radial-gradient(
            circle at 90% 12%,
            rgba(168, 85, 247, 0.12),
            transparent 28%
          ),
          linear-gradient(
            180deg,
            #020617 0%,
            #071225 55%,
            #020617 100%
          );
        color: #f8fafc;
      }

      .stagingContainer {
        width: min(1240px, 100%);
        margin: 0 auto;
      }

      .topNavigation {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 30px;
      }

      .backLink {
        color: #cbd5e1;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
      }

      .backLink:hover {
        color: #fcd34d;
      }

      .mvpBadge,
      .aiLabel {
        padding: 8px 12px;
        border: 1px solid rgba(34, 211, 238, 0.45);
        border-radius: 999px;
        background:
          linear-gradient(
            135deg,
            rgba(34, 211, 238, 0.14),
            rgba(168, 85, 247, 0.16)
          );
        color: #a5f3fc;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.13em;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 28px;
        align-items: end;
        margin-bottom: 24px;
      }

      .eyebrow,
      .generationLabel {
        display: block;
        margin-bottom: 9px;
        color: #fbbf24;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0.15em;
      }

      .hero h1 {
        margin: 0;
        max-width: 760px;
        font-size: clamp(34px, 5vw, 62px);
        line-height: 0.98;
        letter-spacing: -0.045em;
      }

      .hero p {
        max-width: 720px;
        margin: 18px 0 0;
        color: rgba(226, 232, 240, 0.72);
        font-size: 17px;
        line-height: 1.7;
      }

      .objectSummary {
        display: grid;
        gap: 7px;
        padding: 20px;
        border: 1px solid rgba(251, 191, 36, 0.26);
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.72);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
      }

      .objectSummary span {
        color: #fbbf24;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.14em;
      }

      .objectSummary strong {
        font-size: 17px;
      }

      .objectSummary small {
        color: #94a3b8;
      }

      .notice {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 26px;
        padding: 14px 17px;
        border: 1px solid rgba(34, 211, 238, 0.23);
        border-radius: 14px;
        background: rgba(8, 47, 73, 0.28);
      }

      .notice strong {
        flex: 0 0 auto;
        color: #a5f3fc;
      }

      .notice span {
        color: #cbd5e1;
        line-height: 1.5;
      }

      .setupGrid {
        display: grid;
        gap: 20px;
      }

      .panel,
      .generationPanel,
      .resultSection,
      .emptyState,
      .statusCard {
        border: 1px solid rgba(148, 163, 184, 0.17);
        border-radius: 22px;
        background:
          linear-gradient(
            145deg,
            rgba(15, 23, 42, 0.96),
            rgba(15, 23, 42, 0.72)
          );
        box-shadow: 0 26px 70px rgba(0, 0, 0, 0.24);
      }

      .panel {
        padding: 24px;
      }

      .panelHeading {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 20px;
      }

      .panelHeading > span {
        display: grid;
        flex: 0 0 auto;
        width: 36px;
        height: 36px;
        place-items: center;
        border: 1px solid rgba(251, 191, 36, 0.42);
        border-radius: 50%;
        background: rgba(245, 158, 11, 0.12);
        color: #fcd34d;
        font-weight: 950;
      }

      .panelHeading small {
        color: #94a3b8;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.13em;
      }

      .panelHeading h2 {
        margin: 3px 0 0;
        font-size: 21px;
      }

      .imageSelection {
        display: grid;
        grid-template-columns:
          repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }

      .imageChoice {
        overflow: hidden;
        padding: 0;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 14px;
        background: rgba(2, 6, 23, 0.65);
        color: #cbd5e1;
        cursor: pointer;
        text-align: left;
        transition:
          transform 160ms ease,
          border-color 160ms ease;
      }

      .imageChoice:hover {
        transform: translateY(-2px);
        border-color: rgba(251, 191, 36, 0.5);
      }

      .imageChoiceActive {
        border-color: #fbbf24;
        box-shadow:
          0 0 0 2px rgba(251, 191, 36, 0.14),
          0 15px 35px rgba(245, 158, 11, 0.14);
      }

      .imageChoice img {
        display: block;
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
      }

      .imageChoice span {
        display: block;
        padding: 10px 11px;
        font-size: 12px;
        font-weight: 800;
      }

      .directImageUpload {
        display: grid;
        gap: 9px;
        margin-top: 16px;
      }

      .directImageUploadButton {
        display: flex;
        min-height: 76px;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        border: 1px dashed rgba(34, 211, 238, 0.48);
        border-radius: 15px;
        background:
          linear-gradient(
            135deg,
            rgba(8, 145, 178, 0.13),
            rgba(79, 70, 229, 0.13)
          );
        color: #e2e8f0;
        cursor: pointer;
        transition:
          border-color 160ms ease,
          transform 160ms ease,
          background 160ms ease;
      }

      .directImageUploadButton:hover {
        transform: translateY(-1px);
        border-color: rgba(251, 191, 36, 0.62);
        background:
          linear-gradient(
            135deg,
            rgba(8, 145, 178, 0.2),
            rgba(120, 53, 15, 0.18)
          );
      }

      .directImageUploadButton input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
      }

      .directImageUploadButtonDisabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .directImageUploadButtonDisabled:hover {
        transform: none;
      }

      .directImageUploadIcon {
        display: grid;
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid rgba(251, 191, 36, 0.42);
        border-radius: 50%;
        background: rgba(245, 158, 11, 0.13);
        color: #fcd34d;
        font-size: 25px;
        font-weight: 900;
      }

      .directImageUploadButton div {
        display: grid;
        gap: 4px;
      }

      .directImageUploadButton strong {
        color: #ffffff;
        font-size: 14px;
      }

      .directImageUploadButton small {
        color: #94a3b8;
        font-size: 11px;
      }

      .directImageUploadMessage {
        margin: 0;
        color: #a5f3fc;
        font-size: 12px;
        line-height: 1.5;
      }

      .secondaryPageLink {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        padding: 0 18px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.8);
        color: #e2e8f0;
        font-weight: 850;
        text-decoration: none;
      }

      .imageChoiceWrapper {
        position: relative;
        min-width: 0;
      }

      .imageChoiceWrapper .imageChoice {
        width: 100%;
        height: 100%;
      }

      .deleteImageButton {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 5;
        display: grid;
        width: 35px;
        height: 35px;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(254, 202, 202, 0.55);
        border-radius: 10px;
        background: rgba(69, 10, 10, 0.9);
        color: #fecaca;
        cursor: pointer;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.38);
        transition:
          transform 150ms ease,
          background 150ms ease,
          border-color 150ms ease;
      }

      .deleteImageButton:hover:not(:disabled) {
        transform: translateY(-1px) scale(1.05);
        border-color: rgba(248, 113, 113, 0.95);
        background: rgba(153, 27, 27, 0.97);
      }

      .deleteImageButton:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .deleteImageButton svg {
        width: 19px;
        height: 19px;
      }

      .deleteImageSpinner {
        width: 15px;
        height: 15px;
        border: 2px solid rgba(254, 202, 202, 0.28);
        border-top-color: #fecaca;
        border-radius: 50%;
        animation: deleteImageSpin 700ms linear infinite;
      }

      @keyframes deleteImageSpin {
        to {
          transform: rotate(360deg);
        }
      }

      .imageDeleteConfirmation {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr) auto;
        align-items: center;
        gap: 18px;
        padding: 17px;
        border: 1px solid rgba(248, 113, 113, 0.35);
        border-radius: 14px;
        background:
          linear-gradient(
            135deg,
            rgba(69, 10, 10, 0.28),
            rgba(15, 23, 42, 0.85)
          );
      }

      .imageDeleteConfirmation > div:first-child {
        display: grid;
        gap: 7px;
      }

      .imageDeleteConfirmation small {
        color: #fca5a5;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .imageDeleteConfirmation strong {
        color: #ffffff;
        font-size: 14px;
      }

      .imageDeleteConfirmation p {
        margin: 0;
        color: #cbd5e1;
        font-size: 12px;
        line-height: 1.55;
      }

      .imageDeleteConfirmation
        .primaryDeleteWarning {
        color: #fde68a;
      }

      .imageDeleteButtons {
        display: flex;
        gap: 8px;
      }

      .cancelImageDeleteButton,
      .confirmImageDeleteButton {
        min-height: 40px;
        padding: 0 13px;
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
        font-weight: 900;
        white-space: nowrap;
      }

      .cancelImageDeleteButton {
        border: 1px solid rgba(148, 163, 184, 0.3);
        background: rgba(15, 23, 42, 0.8);
        color: #e2e8f0;
      }

      .confirmImageDeleteButton {
        border: 1px solid rgba(248, 113, 113, 0.55);
        background:
          linear-gradient(
            135deg,
            #b91c1c,
            #ef4444
          );
        color: #ffffff;
      }

      .cancelImageDeleteButton:disabled,
      .confirmImageDeleteButton:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      @media (max-width: 700px) {
        .imageDeleteConfirmation {
          grid-template-columns: 1fr;
        }

        .imageDeleteButtons {
          display: grid;
          grid-template-columns: 1fr;
        }

      }
      .optionGrid {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(185px, 1fr));
        gap: 11px;
      }

      .optionCard {
        display: grid;
        gap: 7px;
        min-height: 92px;
        padding: 15px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 14px;
        background: rgba(2, 6, 23, 0.44);
        color: #f8fafc;
        cursor: pointer;
        text-align: left;
      }

      .optionCard strong {
        font-size: 14px;
      }

      .optionCard span {
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.45;
      }

      .optionCard:hover,
      .optionCardActive {
        border-color: rgba(251, 191, 36, 0.58);
        background:
          linear-gradient(
            145deg,
            rgba(245, 158, 11, 0.16),
            rgba(30, 41, 59, 0.74)
          );
      }

      .customPromptField {
        display: grid;
        gap: 9px;
      }

      .customPromptField > span {
        color: #e2e8f0;
        font-size: 13px;
        font-weight: 850;
      }

      .customPromptField textarea {
        width: 100%;
        min-height: 126px;
        resize: vertical;
        padding: 15px 16px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 14px;
        outline: none;
        background: rgba(2, 6, 23, 0.62);
        color: #f8fafc;
        font: inherit;
        line-height: 1.55;
        box-sizing: border-box;
      }

      .customPromptField textarea:focus {
        border-color: rgba(251, 191, 36, 0.65);
        box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
      }

      .customPromptField textarea::placeholder {
        color: #64748b;
      }

      .customPromptFooter {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-top: 9px;
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.5;
      }

      .customPromptFooter span {
        max-width: 760px;
      }

      .customPromptFooter strong {
        flex: 0 0 auto;
        color: #fbbf24;
      }

      .promptExamples {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 15px;
      }

      .promptExamples > span {
        margin-right: 2px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 850;
      }

      .promptExamples button {
        min-height: 34px;
        padding: 0 11px;
        border: 1px solid rgba(34, 211, 238, 0.25);
        border-radius: 999px;
        background: rgba(8, 47, 73, 0.24);
        color: #a5f3fc;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
      }

      .promptExamples button:hover {
        border-color: rgba(251, 191, 36, 0.5);
        color: #fde68a;
      }

      .generationModeSection {
        display: grid;
        gap: 15px;
        margin-bottom: 23px;
        padding-bottom: 22px;
        border-bottom: 1px solid
          rgba(148, 163, 184, 0.16);
      }

      .generationModeHeading small {
        color: #93c5fd;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .generationModeHeading h2 {
        margin: 5px 0 0;
        color: #ffffff;
        font-size: 20px;
      }

      .generationModeGrid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .generationModeCard {
        display: flex;
        min-height: 94px;
        align-items: center;
        gap: 13px;
        padding: 15px;
        border: 1px solid
          rgba(148, 163, 184, 0.22);
        border-radius: 15px;
        background: rgba(2, 6, 23, 0.56);
        color: #cbd5e1;
        cursor: pointer;
        text-align: left;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          background 160ms ease;
      }

      .generationModeCard:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color:
          rgba(34, 211, 238, 0.48);
      }

      .generationModeCardActive {
        border-color: #fbbf24;
        background:
          linear-gradient(
            135deg,
            rgba(120, 53, 15, 0.22),
            rgba(8, 47, 73, 0.26)
          );
        box-shadow:
          0 0 0 2px rgba(251, 191, 36, 0.1);
      }

      .generationModeCard > span {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 12px;
        background:
          rgba(245, 158, 11, 0.12);
        color: #fbbf24;
        font-size: 18px;
        font-weight: 900;
      }

      .generationModeCard div {
        display: grid;
        gap: 5px;
      }

      .generationModeCard strong {
        color: #ffffff;
        font-size: 13px;
      }

      .generationModeCard small {
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.45;
      }

      .generationModeCard:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .generationModeNotice {
        padding: 11px 13px;
        border: 1px solid
          rgba(96, 165, 250, 0.2);
        border-radius: 11px;
        background:
          rgba(30, 64, 175, 0.1);
        color: #bfdbfe;
        font-size: 11px;
        line-height: 1.5;
      }

      @media (max-width: 700px) {
        .generationModeGrid {
          grid-template-columns: 1fr;
        }
      }
      .generationPanel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
        margin-top: 20px;
        padding: 26px;
        border-color: rgba(251, 191, 36, 0.3);
      }

      .generationPanel h2 {
        margin: 0;
        font-size: 24px;
      }

      .generationPanel p {
        max-width: 680px;
        margin: 9px 0 0;
        color: #94a3b8;
        line-height: 1.55;
      }

      .generateButton,
      .saveButton,
      .primaryLink {
        display: inline-flex;
        min-height: 50px;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 0 22px;
        border: 1px solid rgba(251, 191, 36, 0.58);
        border-radius: 13px;
        background:
          linear-gradient(
            135deg,
            #fde68a,
            #f59e0b,
            #d97706
          );
        color: #111827;
        font-weight: 950;
        text-decoration: none;
        cursor: pointer;
        box-shadow: 0 16px 35px rgba(245, 158, 11, 0.2);
      }

      .generateButton {
        flex: 0 0 auto;
        min-width: 250px;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .messageBox {
        display: grid;
        gap: 5px;
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 14px;
        line-height: 1.5;
      }

      .errorBox {
        border: 1px solid rgba(248, 113, 113, 0.35);
        background: rgba(127, 29, 29, 0.24);
        color: #fecaca;
      }

      .successBox {
        border: 1px solid rgba(74, 222, 128, 0.3);
        background: rgba(20, 83, 45, 0.25);
        color: #bbf7d0;
      }

      .warningBox {
        margin: 0 0 20px;
        border: 1px solid rgba(251, 191, 36, 0.33);
        background: rgba(120, 53, 15, 0.24);
        color: #fde68a;
      }

      .generationProgress {
        display: grid;
        place-items: center;
        margin-top: 20px;
        padding: 46px 20px;
        border: 1px solid rgba(34, 211, 238, 0.22);
        border-radius: 20px;
        background: rgba(8, 47, 73, 0.18);
        text-align: center;
      }

      .generationProgress h2 {
        margin: 17px 0 7px;
      }

      .generationProgress p {
        max-width: 620px;
        margin: 0;
        color: #94a3b8;
        line-height: 1.6;
      }

      .resultSection {
        margin-top: 22px;
        padding: 25px;
      }

      .resultHeading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 19px;
      }

      .resultHeading h2 {
        margin: 0;
        font-size: 26px;
      }

      .comparisonGrid {
        display: grid;
        grid-template-columns: 1fr;
        justify-items: center;
        gap: 18px;
      }

      .comparisonCard {
        overflow: hidden;
        width: min(720px, 100%);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 17px;
        background: rgba(2, 6, 23, 0.65);
      }

      .resultCard {
        border-color: rgba(34, 211, 238, 0.33);
      }

      .imageHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 13px 15px;
      }

      .imageHeader span {
        color: #94a3b8;
        font-size: 11px;
      }

      .comparisonImage {
        position: relative;
        overflow: hidden;
        width: 100%;
        background: #020617;
      }

      .comparisonImage img {
        display: block;
        width: 100%;
        height: auto;
        max-height: 560px;
        object-fit: contain;
      }

      .imageAiBadge {
        position: absolute;
        right: 12px;
        bottom: 12px;
        padding: 7px 10px;
        border: 1px solid rgba(255, 255, 255, 0.38);
        border-radius: 999px;
        background: rgba(2, 6, 23, 0.76);
        color: #ffffff;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.12em;
        backdrop-filter: blur(8px);
      }

      .savePanel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-top: 18px;
        padding: 18px;
        border: 1px solid rgba(251, 191, 36, 0.22);
        border-radius: 15px;
        background: rgba(120, 53, 15, 0.12);
      }

      .savePanel p {
        max-width: 670px;
        margin: 7px 0 0;
        color: #94a3b8;
        line-height: 1.5;
      }

      .saveActions {
        display: flex;
        flex: 0 0 auto;
        gap: 10px;
      }

      .secondaryButton {
        min-height: 48px;
        padding: 0 18px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.8);
        color: #e2e8f0;
        font-weight: 850;
        cursor: pointer;
      }

      .emptyState,
      .statusCard {
        display: grid;
        width: min(680px, 100%);
        margin: 70px auto;
        place-items: center;
        padding: 50px 26px;
        text-align: center;
      }

      .emptyState h2,
      .statusCard strong {
        margin: 14px 0 0;
        font-size: 24px;
      }

      .emptyState p,
      .statusCard span {
        max-width: 520px;
        margin: 10px 0 20px;
        color: #94a3b8;
        line-height: 1.6;
      }

      .emptyIcon {
        font-size: 46px;
        color: #fbbf24;
      }

      .spinner,
      .buttonSpinner,
      .largeSpinner {
        border-radius: 50%;
        animation: stagingSpin 0.8s linear infinite;
      }

      .spinner,
      .largeSpinner {
        width: 38px;
        height: 38px;
        border: 3px solid rgba(148, 163, 184, 0.2);
        border-top-color: #fbbf24;
      }

      .largeSpinner {
        width: 54px;
        height: 54px;
      }

      .buttonSpinner {
        width: 17px;
        height: 17px;
        border: 2px solid rgba(17, 24, 39, 0.25);
        border-top-color: #111827;
      }

      @keyframes stagingSpin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 880px) {
        .hero {
          grid-template-columns: 1fr;
        justify-items: center;
        }

        .objectSummary {
          width: 100%;
        }

        .generationPanel,
        .savePanel {
          align-items: stretch;
          flex-direction: column;
        }

        .generateButton {
          width: 100%;
          min-width: 0;
        }

        .comparisonGrid {
        display: grid;
        grid-template-columns: 1fr;
        justify-items: center;
        gap: 18px;
      }

        .saveActions {
          width: 100%;
        }

        .saveActions button {
          flex: 1;
        }
      }

      @media (max-width: 600px) {
        .stagingPage {
          padding: 24px 13px 70px;
        }

        .topNavigation {
          align-items: flex-start;
          flex-direction: column;
        }

        .hero h1 {
          font-size: 38px;
        }

        .hero p {
          font-size: 15px;
        }

        .notice {
          align-items: flex-start;
          flex-direction: column;
        }

        .panel,
        .generationPanel,
        .resultSection {
          padding: 17px;
          border-radius: 17px;
        }

        .imageSelection {
          display: flex;
          overflow-x: auto;
          padding-bottom: 5px;
        }

        .imageChoiceWrapper {
          flex: 0 0 150px;
        }

        .imageChoiceWrapper .imageChoice {
          width: 100%;
        }

        .optionGrid {
          grid-template-columns: 1fr;
        justify-items: center;
        }

        .resultHeading {
          align-items: flex-start;
          flex-direction: column;
        }

        .comparisonImage,
        .comparisonImage img {
        display: block;
        width: 100%;
        height: auto;
        max-height: 560px;
        object-fit: contain;
      }

        .saveActions {
          flex-direction: column;
        }
      }

      .roomDesignGroup {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 15px;
        margin-top: 20px;
        padding: 22px;
        border: 1px solid
          rgba(251, 191, 36, 0.2);
        border-radius: 24px;
        background:
          linear-gradient(
            145deg,
            rgba(15, 23, 42, 0.92),
            rgba(8, 17, 35, 0.92)
          );
        box-shadow:
          0 24px 60px rgba(0, 0, 0, 0.18);
      }

      .workflowGroupHeading {
        grid-column: 1 / -1;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 3px 4px 17px;
        border-bottom: 1px solid
          rgba(148, 163, 184, 0.15);
      }

      .workflowGroupHeading > span {
        display: grid;
        width: 44px;
        height: 44px;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid
          rgba(251, 191, 36, 0.5);
        border-radius: 50%;
        background:
          rgba(120, 53, 15, 0.18);
        color: #fbbf24;
        font-size: 16px;
        font-weight: 950;
      }

      .workflowGroupHeading small {
        color: #93c5fd;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
      }

      .workflowGroupHeading h2 {
        margin: 5px 0 0;
        color: #ffffff;
        font-size: 24px;
      }

      .workflowGroupHeading p {
        max-width: 720px;
        margin: 7px 0 0;
        color: #94a3b8;
        font-size: 13px;
        line-height: 1.55;
      }

      .roomDesignGroup > .panel {
        min-width: 0;
        margin: 0;
        padding: 20px;
        border-color:
          rgba(148, 163, 184, 0.16);
        border-radius: 17px;
        background:
          rgba(2, 6, 23, 0.42);
        box-shadow: none;
      }

      .roomDesignGroup
        > .panel
        .panelHeading
        > span {
        display: none;
      }

      .roomDesignGroup
        > .panel
        .panelHeading {
        gap: 0;
        margin-bottom: 17px;
      }

      .roomDesignGroup
        > .panel
        .panelHeading h2 {
        font-size: 18px;
      }

      .roomDesignGroup
        > .customPromptPanel {
        grid-column: 1 / -1;
        width: 100%;
      }

      .customPromptPanel
        .customPromptField,
      .customPromptPanel
        textarea {
        width: 100%;
      }
      .roomDesignGroup .optionGrid {
        gap: 10px;
      }

      .roomDesignGroup .optionCard {
        min-height: 92px;
      }

      .generationPanel {
        display: grid;
        grid-template-columns:
          minmax(420px, 1.15fr)
          minmax(260px, 0.75fr)
          auto;
        align-items: center;
        gap: 25px;
        margin-top: 20px;
        padding: 25px;
      }

      .generationModeSection {
        min-width: 0;
        margin: 0;
        padding: 0;
        border-bottom: 0;
      }

      .generationModeHeading h2 {
        font-size: 18px;
      }

      .generationModeGrid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .generationModeCard {
        min-height: 88px;
      }

      .generationPanel
        > div:nth-of-type(2) {
        min-width: 0;
        padding-left: 2px;
      }

      .generationPanel
        > div:nth-of-type(2)
        h2 {
        font-size: 21px;
      }

      .generationPanel
        > div:nth-of-type(2)
        p {
        font-size: 13px;
      }

      .generationPanel .generateButton {
        min-width: 255px;
      }

      .resultStatusBar {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-bottom: 19px;
        padding: 14px 16px;
        border: 1px solid
          rgba(52, 211, 153, 0.35);
        border-radius: 14px;
        background:
          linear-gradient(
            135deg,
            rgba(6, 78, 59, 0.26),
            rgba(15, 23, 42, 0.82)
          );
      }

      .resultStatusIcon {
        display: grid;
        width: 37px;
        height: 37px;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid
          rgba(52, 211, 153, 0.45);
        border-radius: 50%;
        background:
          rgba(6, 95, 70, 0.3);
        color: #6ee7b7;
        font-size: 18px;
        font-weight: 950;
      }

      .resultStatusBar > div:last-child {
        display: grid;
        gap: 3px;
      }

      .resultStatusBar strong {
        color: #d1fae5;
        font-size: 13px;
      }

      .resultStatusBar span {
        color: #a7f3d0;
        font-size: 12px;
      }

      @media (max-width: 1100px) {
        .generationPanel {
          grid-template-columns:
            minmax(0, 1fr)
            minmax(250px, 0.75fr);
        }

        .generationPanel .generateButton {
          grid-column: 1 / -1;
          width: 100%;
        }
      }

      @media (max-width: 760px) {
        .roomDesignGroup {
          grid-template-columns: 1fr;
          padding: 17px;
          border-radius: 18px;
        }

        .workflowGroupHeading {
          padding-bottom: 15px;
        }

        .workflowGroupHeading h2 {
          font-size: 20px;
        }

        .roomDesignGroup > .panel {
          padding: 16px;
        }

        .generationPanel {
          grid-template-columns: 1fr;
          padding: 18px;
        }

        .generationModeGrid {
          grid-template-columns: 1fr;
        }

        .generationPanel
          > div:nth-of-type(2) {
          padding-left: 0;
        }

        .generationPanel .generateButton {
          grid-column: auto;
          min-width: 0;
          width: 100%;
        }

        .resultStatusBar {
          align-items: flex-start;
        }
      }
      .roomAnalysisPanel {
        display: grid;
        gap: 20px;
        margin-top: 20px;
        padding: 24px;
        border: 1px solid rgba(34, 211, 238, 0.28);
        border-radius: 22px;
        background:
          linear-gradient(
            145deg,
            rgba(8, 47, 73, 0.34),
            rgba(15, 23, 42, 0.96)
          );
        box-shadow: 0 24px 65px rgba(0, 0, 0, 0.22);
      }

      .roomAnalysisIntro,
      .roomAnalysisHeader,
      .roomAnalysisLoading,
      .roomAnalysisError,
      .roomAnalysisConfirmation {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .roomAnalysisIntro {
        align-items: flex-start;
      }

      .roomAnalysisIcon {
        display: grid;
        width: 48px;
        height: 48px;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid rgba(34, 211, 238, 0.5);
        border-radius: 15px;
        background: rgba(8, 145, 178, 0.17);
        color: #a5f3fc;
        font-weight: 950;
      }

      .roomAnalysisPanel small {
        color: #67e8f9;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.12em;
      }

      .roomAnalysisPanel h2,
      .roomAnalysisPanel h3 {
        margin: 5px 0 0;
        color: #ffffff;
      }

      .roomAnalysisIntro p,
      .roomAnalysisLoading p,
      .roomAnalysisConfirmation p {
        margin: 7px 0 0;
        color: #94a3b8;
        line-height: 1.55;
      }

      .roomAnalysisLoading,
      .roomAnalysisError {
        padding: 17px;
        border-radius: 14px;
        background: rgba(2, 6, 23, 0.5);
      }

      .roomAnalysisSpinner {
        width: 36px;
        height: 36px;
        flex: 0 0 auto;
        border: 3px solid rgba(148, 163, 184, 0.2);
        border-top-color: #22d3ee;
        border-radius: 50%;
        animation: stagingSpin 0.8s linear infinite;
      }

      .roomAnalysisError,
      .roomAnalysisHeader,
      .roomAnalysisConfirmation {
        justify-content: space-between;
      }

      .roomAnalysisError > div,
      .roomAnalysisResult {
        display: grid;
        gap: 16px;
      }

      .roomConfidenceBadge {
        padding: 8px 12px;
        border: 1px solid rgba(52, 211, 153, 0.4);
        border-radius: 999px;
        color: #a7f3d0;
        font-size: 11px;
        font-weight: 950;
      }

      .roomAnalysisSummary {
        margin: 0;
        color: #cbd5e1;
        line-height: 1.65;
      }

      .roomAnalysisMetrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 11px;
      }

      .roomAnalysisMetrics article {
        display: grid;
        gap: 7px;
        padding: 14px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 13px;
        background: rgba(2, 6, 23, 0.5);
      }

      .roomAnalysisMetrics strong {
        color: #ffffff;
        font-size: 13px;
      }

      .roomAnalysisFacts,
      .roomArchitectureFacts {
        display: grid;
        gap: 10px;
        padding: 16px;
        border-radius: 13px;
      }

      .roomAnalysisFacts {
        border-left: 3px solid #22d3ee;
        background: rgba(8, 47, 73, 0.24);
      }

      .roomArchitectureFacts {
        border-left: 3px solid #34d399;
        background: rgba(6, 78, 59, 0.17);
      }

      .roomAnalysisFacts ul,
      .roomArchitectureFacts ul {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px 20px;
        margin: 0;
        padding-left: 18px;
        color: #cbd5e1;
      }

      .roomAnalysisWarnings {
        display: grid;
        gap: 6px;
        padding: 14px;
        border: 1px solid rgba(251, 191, 36, 0.27);
        border-radius: 12px;
        color: #fef3c7;
      }

      .roomAnalysisConfirmation {
        padding: 17px;
        border: 1px solid rgba(52, 211, 153, 0.25);
        border-radius: 15px;
        background: rgba(6, 78, 59, 0.14);
      }

      .confirmAnalysisButton {
        min-height: 48px;
        padding: 0 19px;
        border: 0;
        border-radius: 12px;
        background: linear-gradient(135deg, #059669, #10b981);
        color: #ffffff;
        cursor: pointer;
        font-weight: 950;
      }

      .confirmAnalysisButton:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      .confirmAnalysisButtonDone {
        background: linear-gradient(135deg, #0e7490, #0891b2);
      }

      @media (max-width: 760px) {
        .roomAnalysisPanel {
          padding: 17px;
        }

        .roomAnalysisHeader,
        .roomAnalysisConfirmation,
        .roomAnalysisError {
          align-items: stretch;
          flex-direction: column;
        }

        .roomAnalysisMetrics,
        .roomAnalysisFacts ul,
        .roomArchitectureFacts ul {
          grid-template-columns: 1fr;
        }

        .confirmAnalysisButton,
        .roomAnalysisError button {
          width: 100%;
        }
      }

      .multiImageBatchPanel {
        display: grid;
        gap: 18px;
        margin-top: 20px;
        padding: 20px;
        border: 1px solid rgba(212, 175, 55, 0.28);
        border-radius: 18px;
        background:
          linear-gradient(
            145deg,
            rgba(30, 41, 59, 0.96),
            rgba(15, 23, 42, 0.98)
          );
      }

      .multiImageBatchHeader {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
      }

      .multiImageBatchHeader h3 {
        margin: 5px 0 0;
        color: #ffffff;
      }

      .multiImageBatchHeader p {
        max-width: 620px;
        margin: 8px 0 0;
        color: #94a3b8;
        line-height: 1.55;
      }

      .multiImageBatchHeader small {
        color: #d4af37;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.12em;
      }

      .analyzeAllImagesButton {
        min-height: 48px;
        padding: 0 18px;
        border: 1px solid rgba(212, 175, 55, 0.42);
        border-radius: 12px;
        background:
          linear-gradient(
            135deg,
            #9a7618,
            #d4af37
          );
        color: #07111f;
        cursor: pointer;
        font-weight: 950;
        white-space: nowrap;
      }

      .analyzeAllImagesButton:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .multiImageProgressTrack {
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.16);
      }

      .multiImageProgressTrack span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background:
          linear-gradient(
            90deg,
            #d4af37,
            #22d3ee
          );
        transition: width 220ms ease;
      }

      .multiImageStatusSummary {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        color: #cbd5e1;
        font-size: 13px;
      }

      .multiImageStatusSummary strong {
        color: #ffffff;
      }

      .multiImageStatusList {
        display: grid;
        gap: 9px;
      }

      .multiImageStatusItem {
        display: grid;
        grid-template-columns:
          34px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 11px 13px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 12px;
        background: rgba(2, 6, 23, 0.42);
        color: inherit;
        cursor: pointer;
        text-align: left;
      }

      .multiImageStatusItemActive {
        border-color: rgba(34, 211, 238, 0.55);
        background: rgba(8, 145, 178, 0.12);
      }

      .multiImageStatusNumber {
        display: grid;
        width: 30px;
        height: 30px;
        place-items: center;
        border-radius: 9px;
        background: rgba(148, 163, 184, 0.13);
        color: #ffffff;
        font-size: 12px;
        font-weight: 950;
      }

      .multiImageStatusName {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .multiImageStatusName strong {
        color: #ffffff;
        font-size: 13px;
      }

      .multiImageStatusName small {
        overflow: hidden;
        color: #94a3b8;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .multiImageStatusBadge {
        padding: 6px 9px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 950;
      }

      .multiImageStatusBadge-waiting {
        background: rgba(148, 163, 184, 0.14);
        color: #cbd5e1;
      }

      .multiImageStatusBadge-processing {
        background: rgba(34, 211, 238, 0.14);
        color: #a5f3fc;
      }

      .multiImageStatusBadge-analyzed {
        background: rgba(59, 130, 246, 0.14);
        color: #bfdbfe;
      }

      .multiImageStatusBadge-confirmed {
        background: rgba(52, 211, 153, 0.14);
        color: #a7f3d0;
      }

      .multiImageStatusBadge-generated,
      .multiImageStatusBadge-saved {
        background: rgba(212, 175, 55, 0.16);
        color: #fde68a;
      }

      .multiImageStatusBadge-error {
        background: rgba(248, 113, 113, 0.14);
        color: #fecaca;
      }

      @media (max-width: 760px) {
        .multiImageBatchHeader,
        .multiImageStatusSummary {
          align-items: stretch;
          flex-direction: column;
        }

        .analyzeAllImagesButton {
          width: 100%;
        }

        .multiImageStatusItem {
          grid-template-columns:
            30px minmax(0, 1fr);
        }

        .multiImageStatusBadge {
          grid-column: 1 / -1;
          justify-self: start;
          margin-left: 42px;
        }
      }

      .multiResultSection {
        display: grid;
        gap: 20px;
        margin-top: 24px;
        padding: 22px;
        border: 1px solid rgba(34, 211, 238, 0.28);
        border-radius: 22px;
        background:
          linear-gradient(
            145deg,
            rgba(8, 47, 73, 0.28),
            rgba(15, 23, 42, 0.98)
          );
      }

      .multiResultHeading,
      .multiResultCardHeader,
      .multiResultStatus {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .multiResultHeading h2 {
        margin: 5px 0 0;
        color: #ffffff;
      }

      .multiResultHeading p {
        margin: 7px 0 0;
        color: #94a3b8;
      }

      .multiResultGrid {
        display: grid;
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
        gap: 18px;
      }

      .multiResultCard {
        display: grid;
        gap: 14px;
        padding: 15px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 17px;
        background: rgba(2, 6, 23, 0.68);
      }

      .multiResultCardActive {
        border-color: rgba(34, 211, 238, 0.68);
        box-shadow:
          0 0 0 1px rgba(34, 211, 238, 0.16);
      }

      .multiResultCardHeader > div {
        display: grid;
        gap: 4px;
      }

      .multiResultCardHeader strong {
        color: #ffffff;
      }

      .multiResultCardHeader span,
      .multiResultStatus span {
        color: #94a3b8;
        font-size: 12px;
      }

      .multiResultSelectButton {
        min-height: 38px;
        padding: 0 13px;
        border: 1px solid rgba(34, 211, 238, 0.4);
        border-radius: 10px;
        background: rgba(8, 145, 178, 0.16);
        color: #cffafe;
        cursor: pointer;
        font-weight: 900;
      }

      .multiResultComparison {
        display: grid;
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
        gap: 10px;
      }

      .multiResultImage {
        position: relative;
        min-width: 0;
        overflow: hidden;
        border-radius: 12px;
        background: #020617;
      }

      .multiResultImage > span {
        position: absolute;
        z-index: 2;
        top: 8px;
        left: 8px;
        padding: 5px 7px;
        border-radius: 999px;
        background: rgba(2, 6, 23, 0.78);
        color: #ffffff;
        font-size: 8px;
        font-weight: 950;
        letter-spacing: 0.08em;
      }

      .multiResultImageAi {
        border: 1px solid rgba(212, 175, 55, 0.4);
      }

      .multiResultImage img {
        display: block;
        width: 100%;
        height: 280px;
        object-fit: contain;
      }

      .multiResultStatus {
        padding-top: 4px;
      }

      .multiResultStatus strong {
        color: #a7f3d0;
        font-size: 12px;
      }

      @media (max-width: 900px) {
        .multiResultGrid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 600px) {
        .multiResultHeading,
        .multiResultCardHeader,
        .multiResultStatus {
          align-items: stretch;
          flex-direction: column;
        }

        .multiResultComparison {
          grid-template-columns: 1fr;
        }

        .multiResultSelectButton {
          width: 100%;
        }

        .multiResultImage img {
          height: auto;
          max-height: 420px;
        }
      }

      @media print {
        .stagingPage {
          display: none !important;
        }
      }
    `}</style>
  );
}
