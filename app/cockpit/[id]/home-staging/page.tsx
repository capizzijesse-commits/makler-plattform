"use client";

import { upload } from "@vercel/blob/client";
import FloorPlanAnalyzer from "./FloorPlanAnalyzer";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
  | "kidsRoom";

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

const ROOM_TYPES: RoomType[] = [
  "livingRoom",
  "bedroom",
  "office",
  "diningRoom",
  "kidsRoom",
];

const STYLES: StagingStyle[] = [
  "modern",
  "scandinavian",
  "luxurious",
  "minimalist",
];

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
  const locale = useLocale();
  const t = useTranslations("HomeStaging");

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
              t("errors.accessCheck")
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
          setError(t("errors.missingListingId"));
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
              t("errors.loadListing")
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
            : t("errors.loadHomeStaging");

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
  }, [listingId, locale, router, t]);

  const selectedImage = useMemo(
    () =>
      listing?.images.find(
        (image) => image.id === selectedImageId
      ) || null,
    [listing, selectedImageId]
  );

  const previewUrl = preview
    ? `data:${preview.mimeType};base64,${preview.imageBase64}`
    : "";

  function resetResult() {
    setPreview(null);
    setSavedImageUrl("");
    setStatusMessage("");
    setError("");
    setVariationIndex(0);
  }

  function chooseImage(imageId: string) {
    setSelectedImageId(imageId);
    resetResult();
  }

  function chooseRoomType(value: RoomType) {
    setRoomType(value);
    resetResult();
  }

  function chooseStyle(value: StagingStyle) {
    setStyle(value);
    resetResult();
  }

  function chooseGenerationMode(
    mode: GenerationMode
  ) {
    setGenerationMode(mode);
    resetResult();
  }

  function changeCustomInstructions(
    value: string
  ) {
    setCustomInstructions(value.slice(0, 500));
    resetResult();
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
      generating ||
      saving
    ) {
      return;
    }

    const availableSlots = Math.max(
      0,
      10 - listing.images.length
    );

    if (availableSlots === 0) {
      setError(
        t("errors.imageLimit")
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
        t("errors.invalidImage")
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
          t("upload.progress", {
            current: index + 1,
            total: filesToUpload.length,
          })
        );

        const safeFileName = file.name
          .normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const blob = await upload(
          `listing-images/${listing.id}/${Date.now()}-${index}-${
            safeFileName || "property-image"
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
              t("errors.saveImage", {
                fileName: file.name,
              })
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
        setSelectedImageId(
          uploadedImages[0].id
        );
      }

      setPreview(null);
      setSavedImageUrl("");

      setUploadMessage(
        uploadedImages.length === 1
          ? t("upload.savedSingle")
          : t("upload.savedMultiple", {
              count: uploadedImages.length,
            })
      );
    } catch (uploadError) {
      console.error(
        "Raumfotos konnten nicht hochgeladen werden:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("errors.uploadImages")
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
      uploadingImages
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
            t("errors.deleteImage")
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
        t("upload.deleted")
      );
    } catch (deleteError) {
      console.error(
        "Raumfoto konnte nicht gelöscht werden:",
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("errors.deleteRoomImage")
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
      generating ||
      saving ||
      imageCount >= 10;

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
                ? t("upload.uploading")
                : imageCount >= 10
                  ? t("upload.limitReached")
                  : t("upload.addPhotos")}
            </strong>

            <small>
              {t("upload.formats")}
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

  async function runGeneration(variationIndexForRequest: number) {
    if (
      !listing ||
      !selectedImage ||
      generating ||
      saving
    ) {
      return;
    }

    try {
      setGenerating(true);
      setPreview(null);
      setSavedImageUrl("");
      setStatusMessage("");
      setError("");

      const outputSize = await detectOutputSize(
        selectedImage.url,
        generationMode
      );

      const response = await fetch(
        `/api/home-staging/generate?locale=${encodeURIComponent(locale)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listingId: listing.id,
            sourceImageId: selectedImage.id,
            roomType,
            style,
            customInstructions,
            outputSize,
            mode: generationMode,
            variationIndex:
              variationIndexForRequest,
            locale,
          }),
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data =
        (await response.json()) as GenerateResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.preview
      ) {
        throw new Error(
          data.details ||
            data.error ||
            t("errors.generate")
        );
      }

      setPreview(data.preview);
      setStatusMessage(
        t("status.previewCreated")
      );
    } catch (generateError) {
      console.error(
        "Home-Staging-Vorschau fehlgeschlagen:",
        generateError
      );

      setError(
        generateError instanceof Error
          ? generateError.message
          : t("errors.generate")
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
            `/api/home-staging/upload?locale=${encodeURIComponent(locale)}`,
          clientPayload: JSON.stringify({
            listingId: listing.id,
            sourceImageId:
              preview.sourceImageId,
            roomType: preview.roomType,
            style: preview.style,
            aiModel: preview.aiModel,
            promptVersion:
              preview.promptVersion,
            locale,
          }),
        }
      );

      const saveResponse = await fetch(
        `/api/home-staging?locale=${encodeURIComponent(locale)}`,
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
            locale,
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
            t("errors.saveResult")
        );
      }

      setSavedImageUrl(
        saveData.image?.url || uploadedBlob.url
      );
      setStatusMessage(
        t("status.saved")
      );
    } catch (saveError) {
      console.error(
        "Home-Staging-Ergebnis konnte nicht gespeichert werden:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : t("errors.saveResult")
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
          <strong>{t("loading.title")}</strong>
          <span>{t("loading.description")}</span>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (accessError) {
    return (
      <main className="stagingPage">
        <div className="statusCard errorCard">
          <strong>{t("access.errorTitle")}</strong>

          <span>{accessError}</span>

          <Link
            href="/cockpit"
            className="primaryLink"
          >{t("common.backCockpit")}</Link>
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
          >{t("access.proBadge")}</span>

          <strong>{t("access.title")}</strong>

          <span>{t("access.proDescription")}</span>

          <span>{t("access.excludedPlans")}</span>

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
            >{t("common.backCockpit")}</Link>

            <Link
              href="/#preise"
              className="primaryLink"
            >{t("access.viewPro")}</Link>
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
          <strong>{t("errors.openTitle")}</strong>
          <span>{error}</span>

          <Link
            href="/cockpit"
            className="primaryLink"
          >{t("common.backCockpit")}</Link>
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
          >{t("common.backObject")}</Link>

          <span className="mvpBadge">{t("hero.mvpBadge")}</span>
        </nav>

        <header className="hero">
          <div>
            <span className="eyebrow">{t("hero.eyebrow")}</span>

            <h1>{t("hero.title")}</h1>

            <p>{t("hero.description")}</p>
          </div>

          <div className="objectSummary">
            <span>{t("hero.currentObject")}</span>
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
          <strong>{t("notice.title")}</strong>

          <span>{t("notice.description")}</span>
        </div>

        {isArchived && (
          <div className="messageBox warningBox">{t("archived")}</div>
        )}

        {!hasImages ? (
          <section className="emptyState">
            <span className="emptyIcon">▧</span>

            <h2>{t("empty.title")}</h2>

            <p>{t("empty.description")}</p>

            {renderImageUpload()}

            <Link
              href={`/cockpit/${listing.id}`}
              className="secondaryPageLink"
            >{t("common.toObject")}</Link>
          </section>
        ) : (
          <>
            <section className="setupGrid">
              <div className="panel">
                <div className="panelHeading">
                  <span>1</span>

                  <div>
                    <small>{t("steps.source.eyebrow")}</small>
                    <h2>{t("steps.source.title")}</h2>
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
                            deletingImageId !== null
                          }
                          aria-label={t("images.selectAria", {
                            number: index + 1,
                          })}
                        >
                          <img
                            src={image.url}
                            alt={
                              image.fileName ||
                              t("images.alt", {
                                number: index + 1,
                              })
                            }
                          />

                          <span>
                            {t("images.number", {
                              number: index + 1,
                            })}
                            {image.isPrimary
                              ? t("images.primarySuffix")
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
                            deletingImageId !== null
                          }
                          aria-label={t("images.deleteAria", {
                            number: index + 1,
                          })}
                          title={t("images.deleteTitle")}
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
                {pendingDeleteImage ? (
                  <div
                    className="imageDeleteConfirmation"
                    role="alert"
                  >
                      <div>
                        <small>{t("delete.eyebrow")}</small>

                        <strong>{t("delete.title")}</strong>

                        <p>{t("delete.description")}</p>

                        {pendingDeleteImage.isPrimary ? (
                          <p className="primaryDeleteWarning">{t("delete.primaryWarning")}</p>
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
                        >{t("common.cancel")}</button>

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
                            ? t("delete.deleting")
                            : t("delete.confirm")}
                        </button>
                      </div>
                  </div>
                ) : null}

              </div>

                          <section className="roomDesignGroup">
              <div className="workflowGroupHeading">
                <span>2</span>

                <div>
                  <small>{t("steps.design.eyebrow")}</small>

                  <h2>{t("steps.design.title")}</h2>

                  <p>{t("steps.design.description")}</p>
                </div>
              </div>
<div className="panel">
                <div className="panelHeading">
                  <span>2</span>

                  <div>
                    <small>{t("steps.room.eyebrow")}</small>
                    <h2>{t("steps.room.title")}</h2>
                  </div>
                </div>

                <div className="optionGrid">
                  {ROOM_TYPES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        roomType === option
                          ? "optionCard optionCardActive"
                          : "optionCard"
                      }
                      onClick={() =>
                        chooseRoomType(option)
                      }
                      disabled={
                        generating || saving
                      }
                    >
                      <strong>
                        {t(`rooms.${option}.label`)}
                      </strong>
                      <span>
                        {t(`rooms.${option}.description`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panelHeading">
                  <span>3</span>

                  <div>
                    <small>{t("steps.style.eyebrow")}</small>
                    <h2>{t("steps.style.title")}</h2>
                  </div>
                </div>

                <div className="optionGrid">
                  {STYLES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        style === option
                          ? "optionCard optionCardActive"
                          : "optionCard"
                      }
                      onClick={() =>
                        chooseStyle(option)
                      }
                      disabled={
                        generating || saving
                      }
                    >
                      <strong>
                        {t(`styles.${option}.label`)}
                      </strong>
                      <span>
                        {t(`styles.${option}.description`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel customPromptPanel">
                <div className="panelHeading">
                  <span>4</span>

                  <div>
                    <small>{t("steps.custom.eyebrow")}</small>
                    <h2>{t("steps.custom.title")}</h2>
                  </div>
                </div>

                <label className="customPromptField">
                  <span>{t("steps.custom.label")}</span>

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
                    placeholder={t("steps.custom.placeholder")}
                  />
                </label>

                <div className="customPromptFooter">
                  <span>{t("steps.custom.hint")}</span>

                  <strong>
                    {customInstructions.length} / 500
                  </strong>
                </div>

                <div className="promptExamples">
                  <span>{t("steps.custom.examples")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      changeCustomInstructions(
                        t("steps.custom.examplesText.warm")
                      )
                    }
                    disabled={generating || saving}
                  >{t("steps.custom.warm")}</button>

                  <button
                    type="button"
                    onClick={() =>
                      changeCustomInstructions(
                        t("steps.custom.examplesText.bold")
                      )
                    }
                    disabled={generating || saving}
                  >{t("steps.custom.bold")}</button>

                  <button
                    type="button"
                    onClick={() =>
                      changeCustomInstructions(
                        t("steps.custom.examplesText.natural")
                      )
                    }
                    disabled={generating || saving}
                  >{t("steps.custom.natural")}</button>
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

            <section className="generationPanel">
              <div className="generationModeSection">
                <div className="generationModeHeading">
                  <small>{t("generation.qualityEyebrow")}</small>
                  <h2>{t("generation.modeTitle")}</h2>
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
                      <strong>{t("generation.preview.title")}</strong>

                      <small>{t("generation.preview.description")}</small>
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
                      <strong>{t("generation.final.title")}</strong>

                      <small>{t("generation.final.description")}</small>
                    </div>
                  </button>
                </div>

                <div className="generationModeNotice">
                  {generationMode === "preview"
                    ? t("generation.preview.notice")
                    : t("generation.final.notice")}
                </div>
              </div>
              <div>
                <span className="generationLabel">{t("generation.ready")}</span>

                <h2>
                  {t(`rooms.${roomType}.label`)}
                  {" · "}
                  {t(`styles.${style}.label`)}
                </h2>

                <p>{t("generation.preservation")}</p>
              </div>

              <button
                type="button"
                className="generateButton"
                onClick={generatePreview}
                disabled={
                  generating ||
                  saving ||
                  isArchived ||
                  !selectedImage
                }
              >
                {generating ? (
                  <>
                    <span className="buttonSpinner" />{t("generation.generatingButton")}</>
                ) : (
                  t("generation.create")
                )}
              </button>
            </section>

            {error && (
              <div className="messageBox errorBox">
                <strong>{t("errors.actionTitle")}</strong>
                <span>{error}</span>
              </div>
            )}


            {generating && (
              <section className="generationProgress">
                <div className="largeSpinner" />

                <h2>{t("progress.title")}</h2>

                <p>{t("progress.description")}</p>
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
                          ? t("result.savedTitle")
                          : t("result.previewReady")}
                      </strong>

                      <span>
                        {statusMessage}
                      </span>
                    </div>
                  </div>
                )}
                <div className="resultHeading">
                  <div>
                    <span className="eyebrow">{t("result.eyebrow")}</span>

                    <h2>{t("result.title")}</h2>
                  </div>

                  <span className="aiLabel">{t("result.aiBadge")}</span>
                </div>

                <div className="comparisonGrid">
                  <article className="comparisonCard">
                    <div className="imageHeader">
                      <strong>{t("result.original")}</strong>
                      <span>{t("result.unchanged")}</span>
                    </div>

                    <div className="comparisonImage">
                      <img
                        src={selectedImage.url}
                        alt={t("result.originalAlt")}
                      />
                    </div>
                  </article>

                  <article className="comparisonCard resultCard">
                    <div className="imageHeader">
                      <strong>{t("result.visualization")}</strong>
                      <span>{t("result.notApplied")}</span>
                    </div>

                    <div className="comparisonImage">
                      <img
                        src={previewUrl}
                        alt={t("result.generatedAlt")}
                      />

                      <span className="imageAiBadge">{t("result.aiBadge")}</span>
                    </div>
                  </article>
                </div>

                <div className="savePanel">
                  <div>
                    <strong>{t("result.saveTitle")}</strong>

                    <p>{t("result.saveDescription")}</p>
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
                    >{t("result.newVariant")}</button>

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
                        ? t("result.saving")
                        : savedImageUrl
                          ? t("result.savedTitle")
                          : t("result.save")}
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
      @media print {
        .stagingPage {
          display: none !important;
        }
      }
    `}</style>
  );
}
