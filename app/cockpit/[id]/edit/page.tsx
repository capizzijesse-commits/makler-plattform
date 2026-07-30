"use client";

import Link from "next/link";
import LocationAssistantPanel, {
  type LocationAssistantData,
} from "./LocationAssistantPanel";

import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAppDialog } from "@/components/AppDialogProvider";

import { upload } from "@vercel/blob/client";
import {
  
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
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
  livingArea: number | null;
  price: number | null;
  highlights: string | null;
  style: string | null;
  locationDescription: string | null;
  locationData: LocationAssistantData | null;
  viewerPlan: string;
  hasCoreAccess: boolean;
  images: ListingImage[];
};

type EditForm = {
  location: string;
  postalCode: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  highlights: string;
  style: string;
};

const EMPTY_FORM: EditForm = {
  location: "",
  postalCode: "",
  propertyType: "",
  rooms: "",
  livingArea: "",
  price: "",
  highlights: "",
  style: "",
};

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("CockpitEdit");
  const { confirmAction } = useAppDialog();

  const intlLocale =
    locale === "it"
      ? "it-CH"
      : locale === "fr"
        ? "fr-CH"
        : locale === "en"
          ? "en-CH"
          : "de-CH";

  const rawId = params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locationDescription, setLocationDescription] =
    useState("");
  const [locationData, setLocationData] =
    useState<LocationAssistantData | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [imageUploadLimit, setImageUploadLimit] = useState(0);
const [uploadingImages, setUploadingImages] = useState(false);
const [uploadMessage, setUploadMessage] = useState("");
const [deletingImageId, setDeletingImageId] =
  useState<string | null>(null);

const [settingPrimaryImageId, setSettingPrimaryImageId] =
  useState<string | null>(null);

  useEffect(() => {
    if (!listingId) {
      setError(t("errors.missingId"));
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadListing() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/listings/${encodeURIComponent(listingId!)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            locale === "de" && data.error
                ? data.error
                : t("errors.load")
          );
        }

        const listing = data.listing as Listing;

        const normalizedViewerPlan =
          (listing.viewerPlan || "free")
            .trim()
            .toLowerCase();

        const nextImageUploadLimit =
          normalizedViewerPlan !== "free"
            ? 10
            : listing.hasCoreAccess
              ? 5
              : 0;

        setImageUploadLimit(nextImageUploadLimit);
setImages(
  Array.isArray(data.listing?.images)
    ? data.listing.images
    : []
);
        setForm({
          location: listing.location || "",
          postalCode: listing.postalCode || "",
          propertyType: listing.propertyType || "",
          rooms:
            listing.rooms === null ? "" : String(listing.rooms),
          livingArea:
            listing.livingArea === null
              ? ""
              : String(listing.livingArea),
          price:
            listing.price === null ? "" : String(listing.price),
          highlights: listing.highlights || "",
          style: listing.style || "",
        });
        setLocationDescription(
          listing.locationDescription || ""
        );
        setLocationData(listing.locationData || null);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : t("errors.load")
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadListing();

    return () => controller.abort();
  }, [listingId, router]);

  function updateField(
    field: keyof EditForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }
async function handleImageUpload(
  event: ChangeEvent<HTMLInputElement>
) {
  const selectedFiles = Array.from(event.target.files ?? []);

  event.target.value = "";

  if (
    !listingId ||
    selectedFiles.length === 0 ||
    uploadingImages
  ) {
    return;
  }

  if (imageUploadLimit === 0) {
    setUploadMessage(t("images.messages.unlockRequired"));
    return;
  }

  const availableSlots = Math.max(
    0,
    imageUploadLimit - images.length
  );

  if (availableSlots === 0) {
    setUploadMessage(
      t("images.messages.limitReached", {
        limit: imageUploadLimit,
      })
    );
    return;
  }

  const filesToUpload = selectedFiles.slice(0, availableSlots);

  const invalidFile = filesToUpload.find(
    (file) =>
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      ) ||
      file.size > 10 * 1024 * 1024
  );

  if (invalidFile) {
    setUploadMessage(t("images.messages.invalidFile"));
    return;
  }

  try {
    setUploadingImages(true);
    setUploadMessage("");

    const uploadedImages: ListingImage[] = [];

    for (let index = 0; index < filesToUpload.length; index++) {
      const file = filesToUpload[index];

      setUploadMessage(
        t("images.messages.uploadingProgress", {
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
        `listing-images/${listingId}/${Date.now()}-${index}-${
          safeFileName || "objektbild"
        }`,
        file,
        {
          access: "public",
          handleUploadUrl: "/api/listing-images/upload",
          clientPayload: JSON.stringify({
            listingId,
          }),
        }
      );

      const imageResponse = await fetch("/api/listing-images", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          url: blob.url,
          storageKey: blob.pathname,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      const imageData = (await imageResponse
        .json()
        .catch(() => ({}))) as {
        image?: ListingImage;
        error?: string;
      };

      if (!imageResponse.ok || !imageData.image) {
        throw new Error(
          locale === "de" && imageData.error
              ? imageData.error
              : t("images.messages.saveFileError", {
                  fileName: file.name,
                })
        );
      }

      uploadedImages.push(imageData.image);
    }

    setImages((currentImages) =>
      [...currentImages, ...uploadedImages].sort(
        (firstImage, secondImage) =>
          firstImage.position - secondImage.position
      )
    );

    setUploadMessage(
      t("images.messages.saved", {
        count: uploadedImages.length,
      })
    );
  } catch (uploadError) {
    console.error(
      "Bilder konnten nicht hochgeladen werden:",
      uploadError
    );

    setUploadMessage(
      uploadError instanceof Error
        ? uploadError.message
        : t("images.messages.uploadError")
    );
  } finally {
    setUploadingImages(false);
  }
}
async function setPrimaryImage(imageId: string) {
  if (settingPrimaryImageId || deletingImageId) {
    return;
  }

  try {
    setSettingPrimaryImageId(imageId);
    setUploadMessage("");

    const response = await fetch(
      `/api/listing-images/${encodeURIComponent(imageId)}`,
      {
        method: "PATCH",
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
      image?: ListingImage;
      error?: string;
    };

    if (!response.ok || !data.success || !data.image) {
      throw new Error(
        locale === "de" && data.error
          ? data.error
          : t("images.messages.primaryError")
      );
    }

    setImages((currentImages) =>
      currentImages
        .map((image) => ({
          ...image,
          isPrimary: image.id === imageId,
        }))
        .sort(
          (firstImage, secondImage) =>
            Number(secondImage.isPrimary) -
              Number(firstImage.isPrimary) ||
            firstImage.position - secondImage.position
        )
    );

    setUploadMessage(t("images.messages.primaryUpdated"));
  } catch (primaryImageError) {
    console.error(
      "Hauptbild konnte nicht geändert werden:",
      primaryImageError
    );

    setUploadMessage(
      primaryImageError instanceof Error
        ? primaryImageError.message
        : t("images.messages.primaryError")
    );
  } finally {
    setSettingPrimaryImageId(null);
  }
}

async function deleteListingImage(imageId: string) {
  if (deletingImageId || settingPrimaryImageId) {
    return;
  }

  const confirmed = await confirmAction({
    title: t("images.deleteDialog.title"),
    message: t("images.deleteDialog.message"),
    confirmLabel: t("images.deleteDialog.confirm"),
    cancelLabel: t("actions.cancel"),
    tone: "danger",
  });

  if (!confirmed) {
    return;
  }

  try {
    setDeletingImageId(imageId);
    setUploadMessage("");

    const response = await fetch(
      `/api/listing-images/${encodeURIComponent(imageId)}`,
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
        locale === "de" && data.error
            ? data.error
            : t("images.messages.deleteError")
      );
    }

    setImages((currentImages) => {
      const remainingImages = currentImages.filter(
        (image) => image.id !== imageId
      );

      const nextPrimaryId =
        data.nextPrimaryImage?.id ?? null;

      return remainingImages
        .map((image) => ({
          ...image,
          isPrimary: nextPrimaryId
            ? image.id === nextPrimaryId
            : image.isPrimary,
        }))
        .sort(
          (firstImage, secondImage) =>
            Number(secondImage.isPrimary) -
              Number(firstImage.isPrimary) ||
            firstImage.position - secondImage.position
        );
    });

    setUploadMessage(t("images.messages.deleted"));
  } catch (deleteImageError) {
    console.error(
      "Bild konnte nicht gelöscht werden:",
      deleteImageError
    );

    setUploadMessage(
      deleteImageError instanceof Error
        ? deleteImageError.message
        : t("images.messages.deleteError")
    );
  } finally {
    setDeletingImageId(null);
  }
}
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!listingId || saving) return;

    if (!form.location.trim() || !form.propertyType.trim()) {
      setError(t("errors.required"));
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/listings/${encodeURIComponent(listingId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: form.location,
            postalCode: form.postalCode,
            propertyType: form.propertyType,
            rooms: form.rooms,
            livingArea: form.livingArea,
            price: form.price,
            highlights: form.highlights,
            style: form.style,
            locationDescription,
            locationData,
          }),
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          locale === "de" && data.error
                ? data.error
                : t("errors.save")
        );
      }

      router.push(`/cockpit/${listingId}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("errors.save")
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="editPage" lang={locale}>
        <div className="statusCard">
          <div className="spinner" />
          <strong>{t("loading")}</strong>
        </div>

        <EditStyles />
      </main>
    );
  }

  return (
    <main className="editPage" lang={locale}>
      <section className="editContainer" data-intl-locale={intlLocale}>
        <div className="topRow">
          <Link
            href={`/cockpit/${listingId}`}
            className="backLink"
          >
            ← {t("navigation.back")}
          </Link>

          <span className="secureBadge">
            {t("navigation.secure")}
          </span>
        </div>

        <header className="editHeader">
          <span>{t("header.eyebrow")}</span>
          <h1>{t("header.title")}</h1>
          <p>{t("header.description")}</p>
        </header>

        <form className="editCard" onSubmit={handleSubmit}>
          <div className="formSection">
            <div className="sectionHeading">
              <span>{t("basic.sectionLabel")}</span>
              <h2>{t("basic.title")}</h2>
            </div>

            <div className="formGrid">
              <label>
                <span>{t("fields.location.label")}</span>
                <input
                  value={form.location}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                  placeholder={t("fields.location.placeholder")}
                  required
                />
              </label>

              <label>
                <span>{t("fields.postalCode.label")}</span>
                <input
                  value={form.postalCode}
                  onChange={(event) =>
                    updateField("postalCode", event.target.value)
                  }
                  placeholder={t("fields.postalCode.placeholder")}
                  inputMode="numeric"
                />
              </label>

              <label>
                <span>{t("fields.propertyType.label")}</span>
                <input
                  value={form.propertyType}
                  onChange={(event) =>
                    updateField("propertyType", event.target.value)
                  }
                  placeholder={t("fields.propertyType.placeholder")}
                  required
                />
              </label>

              <label>
                <span>{t("fields.rooms.label")}</span>
                <input
                  value={form.rooms}
                  onChange={(event) =>
                    updateField("rooms", event.target.value)
                  }
                  placeholder={t("fields.rooms.placeholder")}
                  inputMode="decimal"
                />
              </label>

              <label>
                <span>{t("fields.livingArea.label")}</span>
                <input
                  value={form.livingArea}
                  onChange={(event) =>
                    updateField("livingArea", event.target.value)
                  }
                  placeholder={t("fields.livingArea.placeholder")}
                  inputMode="decimal"
                />
              </label>

              <label>
                <span>{t("fields.price.label")}</span>
                <input
                  value={form.price}
                  onChange={(event) =>
                    updateField("price", event.target.value)
                  }
                  placeholder={t("fields.price.placeholder")}
                  inputMode="numeric"
                />
              </label>
            </div>
          </div>

          <LocationAssistantPanel
            postalCode={form.postalCode}
            location={form.location}
            locationDescription={locationDescription}
            locationData={locationData}
            onPostalCodeChange={(value) =>
              updateField("postalCode", value)
            }
            onLocationChange={(value) =>
              updateField("location", value)
            }
            onDescriptionChange={setLocationDescription}
            onDataChange={setLocationData}
            locale={locale}
          />
          <div className="formSection">
            <div className="sectionHeading">
              <span>{t("marketing.sectionLabel")}</span>
              <h2>{t("marketing.title")}</h2>
            </div>

            <label className="fullField">
              <span>{t("fields.highlights.label")}</span>
              <textarea
                value={form.highlights}
                onChange={(event) =>
                  updateField("highlights", event.target.value)
                }
                placeholder={t("fields.highlights.placeholder")}
                rows={5}
              />
              <small>{t("fields.highlights.hint")}</small>
            </label>

            <label className="fullField">
              <span>{t("fields.style.label")}</span>
              <input
                value={form.style}
                onChange={(event) =>
                  updateField("style", event.target.value)
                }
                placeholder={t("fields.style.placeholder")}
              />
            </label>
          </div>

          {error && (
            <div className="errorMessage">
              {error}
            </div>
          )}

         <div className="formSection imageManagementSection">
  <div className="sectionHeading imageSectionHeading">
    <div>
      <span>{t("images.sectionLabel")}</span>
      <h2>{t("images.title")}</h2>
      <p className="imageSectionDescription">
        {t("images.description")}
      </p>
    </div>

    <strong>
      {t("images.counter", {
        count: images.length,
        limit: imageUploadLimit || 5,
      })}
    </strong>
  </div>

  {images.length > 0 && (
    <div className="editImagesGrid">
      {images.map((image, index) => (
        <article className="editImageCard" key={image.id}>
          <div className="editImagePreviewWrap">
            <img
              src={image.url}
              alt={
                image.fileName ||
                t("images.imageAlt", { number: index + 1 })
              }
            />

            {image.isPrimary && (
              <span className="editPrimaryBadge">
                {t("images.primaryBadge")}
              </span>
            )}
          </div>

         <div className="editImageInfo">
  <strong>
    {image.fileName ||
      t("images.imageAlt", { number: index + 1 })}
  </strong>

  <div className="editImageActions">
    {!image.isPrimary && (
      <button
        type="button"
        className="setPrimaryImageButton"
        disabled={
          settingPrimaryImageId === image.id ||
          deletingImageId !== null
        }
        onClick={() => setPrimaryImage(image.id)}
      >
        {settingPrimaryImageId === image.id
          ? t("images.settingPrimary")
          : t("images.setPrimary")}
      </button>
    )}

    <button
      type="button"
      className="deleteEditImageButton"
      disabled={
        deletingImageId === image.id ||
        settingPrimaryImageId !== null
      }
      onClick={() => deleteListingImage(image.id)}
    >
      {deletingImageId === image.id
        ? t("images.deleting")
        : t("images.delete")}
    </button>
  </div>
</div>
        </article>
      ))}
    </div>
  )}

  <label
    className={
      imageUploadLimit === 0 || uploadingImages || images.length >= imageUploadLimit
        ? "imageUploadButton disabled"
        : "imageUploadButton"
    }
  >
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      disabled={imageUploadLimit === 0 || uploadingImages || images.length >= imageUploadLimit}
      onChange={handleImageUpload}
    />

    <span className="imageUploadIcon">＋</span>

    <div>
      <strong>
        {uploadingImages
          ? t("images.uploading")
          : imageUploadLimit === 0
            ? t("images.unlockAvailable")
            : images.length >= imageUploadLimit
              ? t("images.maximumReached")
              : t("images.addMore")}
      </strong>

      <small>
        {imageUploadLimit === 0
          ? t("images.unlockHint")
          : images.length >= imageUploadLimit
            ? t("images.maximumHint", {
                count: images.length,
                limit: imageUploadLimit,
              })
            : t("images.formatHint")}
      </small>
    </div>
  </label>

  {uploadMessage && (
    <p className="imageUploadMessage">{uploadMessage}</p>
  )}
</div>

<div className="formActions">
  <Link
    href={`/cockpit/${listingId}`}
    className="cancelButton"
  >
    {t("actions.cancel")}
  </Link>

  <button
    type="submit"
    className="saveButton"
    disabled={saving}
  >
    {saving
      ? t("actions.saving")
      : t("actions.save")}
  </button>
</div>  
</form>
      </section>

      <EditStyles />
    </main>
  );
}

function EditStyles() {
  return (
    <style jsx global>{`
      .editPage {
        min-height: 100vh;
        padding: 42px 20px 90px;
        background:
          radial-gradient(
            circle at 18% 12%,
            rgba(37, 99, 235, 0.42),
            transparent 30%
          ),
          radial-gradient(
            circle at 88% 82%,
            rgba(249, 115, 22, 0.62),
            transparent 36%
          ),
          linear-gradient(
            135deg,
            #020617 0%,
            #0f172a 38%,
            #312e81 68%,
            #7c2d12 100%
          );
        color: #f8fafc;
      }

      .editContainer {
        width: min(1000px, 100%);
        margin: 0 auto;
      }

      .topRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 30px;
      }

      .backLink {
        color: #fbbf24;
        font-weight: 900;
        text-decoration: none;
      }

      .secureBadge {
        padding: 8px 13px;
        border: 1px solid rgba(34, 197, 94, 0.3);
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.13);
        color: #86efac;
        font-size: 12px;
        font-weight: 900;
      }

      .editHeader {
        margin-bottom: 28px;
      }

      .editHeader > span,
      .sectionHeading > span {
        display: block;
        margin-bottom: 8px;
        color: #fbbf24;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.16em;
      }

      .editHeader h1 {
        margin: 0;
        color: #ffffff;
        font-size: clamp(36px, 6vw, 56px);
        letter-spacing: -0.045em;
      }

      .editHeader p {
        max-width: 700px;
        margin: 13px 0 0;
        color: rgba(226, 232, 240, 0.74);
        line-height: 1.65;
      }

      .editCard,
      .statusCard {
        border: 1px solid rgba(251, 191, 36, 0.22);
        border-radius: 28px;
        background:
          linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.88),
            rgba(30, 41, 59, 0.72)
          );
        backdrop-filter: blur(14px);
        box-shadow: 0 22px 58px rgba(2, 6, 23, 0.34);
      }

      .editCard {
        padding: 30px;
      }

      .formSection + .formSection {
        margin-top: 30px;
        padding-top: 30px;
        border-top: 1px solid rgba(255, 255, 255, 0.09);
      }

      .sectionHeading {
        margin-bottom: 20px;
      }

      .sectionHeading h2 {
        margin: 0;
        color: #ffffff;
        font-size: 25px;
      }

      .formGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      label > span {
        color: rgba(248, 250, 252, 0.88);
        font-size: 13px;
        font-weight: 800;
      }

      input,
      textarea {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 14px;
        outline: none;
        background: rgba(255, 255, 255, 0.055);
        color: #ffffff;
        font: inherit;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          background 160ms ease;
      }

      input {
        min-height: 50px;
        padding: 0 15px;
      }

      textarea {
        min-height: 130px;
        padding: 14px 15px;
        resize: vertical;
        line-height: 1.6;
      }

      input::placeholder,
      textarea::placeholder {
        color: rgba(203, 213, 225, 0.42);
      }

      input:focus,
      textarea:focus {
        border-color: rgba(251, 191, 36, 0.72);
        background: rgba(255, 255, 255, 0.075);
        box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.11);
      }

      .fullField {
        margin-top: 18px;
      }

      .fullField:first-of-type {
        margin-top: 0;
      }

      small {
        color: rgba(203, 213, 225, 0.58);
      }

      .errorMessage {
        margin-top: 24px;
        padding: 14px 16px;
        border: 1px solid rgba(248, 113, 113, 0.34);
        border-radius: 13px;
        background: rgba(239, 68, 68, 0.12);
        color: #fecaca;
        font-weight: 800;
      }

      .formActions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 30px;
        padding-top: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.09);
      }

      .cancelButton,
      .saveButton {
        display: inline-flex;
        min-height: 48px;
        padding: 0 20px;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        font-weight: 900;
        text-decoration: none;
      }

      .cancelButton {
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.06);
        color: rgba(248, 250, 252, 0.8);
      }

      .saveButton {
        border: 1px solid rgba(251, 191, 36, 0.5);
        background: linear-gradient(135deg, #f59e0b, #f97316);
        color: #ffffff;
        cursor: pointer;
        box-shadow: 0 15px 34px rgba(249, 115, 22, 0.3);
      }

      .saveButton:disabled {
        cursor: wait;
        opacity: 0.65;
      }

      .statusCard {
        display: flex;
        width: min(700px, 100%);
        min-height: 330px;
        margin: 40px auto;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .spinner {
        width: 40px;
        height: 40px;
        margin-bottom: 18px;
        border: 4px solid rgba(251, 191, 36, 0.2);
        border-top-color: #f59e0b;
        border-radius: 50%;
        animation: editSpin 800ms linear infinite;
      }

      @keyframes editSpin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 700px) {
        .editPage {
          padding: 28px 14px 65px;
        }

        .editCard {
          padding: 20px;
        }

        .formGrid {
          grid-template-columns: 1fr;
        }

        .formActions {
          flex-direction: column-reverse;
        }

        .cancelButton,
        .saveButton {
          width: 100%;
        }
      }
        .imageManagementSection {
  margin-top: 24px;
}

.imageSectionHeading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.imageSectionHeading strong {
  padding: 7px 11px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  font-size: 11px;
}

.editImagesGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-height: 390px;
  margin-top: 18px;
  padding-right: 8px;
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

.editImagesGrid::-webkit-scrollbar {
  width: 8px;
}

.editImagesGrid::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}

.editImagesGrid::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.65);
  background-clip: padding-box;
}

.editImagesGrid::-webkit-scrollbar-thumb:hover {
  background: rgba(251, 191, 36, 0.95);
  background-clip: padding-box;
}

.editImageCard {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
}

.editImageCard img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.editImageCard > div {
  min-width: 0;
  padding: 10px;
}

.editImageCard strong {
  display: block;
  overflow: hidden;
  color: #ffffff;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editImageCard span {
  display: inline-block;
  margin-top: 6px;
  color: #fbbf24;
  font-size: 9px;
  font-weight: 900;
}

.imageUploadButton {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 104px;
  margin-top: 20px;
  padding: 20px 24px;
  align-items: center;
  justify-content: center;
  gap: 16px;
  overflow: hidden;
  border: 1px dashed rgba(251, 191, 36, 0.72);
  border-radius: 18px;
  background:
    radial-gradient(
      circle at top left,
      rgba(251, 191, 36, 0.14),
      transparent 42%
    ),
    linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.88),
      rgba(30, 41, 59, 0.7)
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 16px 35px rgba(2, 6, 23, 0.22);
  color: #ffffff;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.imageUploadButton::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    110deg,
    transparent 20%,
    rgba(255, 255, 255, 0.05) 48%,
    transparent 75%
  );
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.imageUploadButton:hover:not(.disabled) {
  transform: translateY(-2px);
  border-color: #fbbf24;
  background:
    radial-gradient(
      circle at top left,
      rgba(251, 191, 36, 0.22),
      transparent 44%
    ),
    linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.94),
      rgba(40, 52, 78, 0.82)
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 20px 42px rgba(2, 6, 23, 0.3),
    0 0 24px rgba(251, 191, 36, 0.1);
}

.imageUploadButton:hover:not(.disabled)::after {
  transform: translateX(100%);
}

.imageUploadButton input {
  display: none;
}

.imageUploadIcon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  border: 1px solid rgba(251, 191, 36, 0.75);
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 8px 20px rgba(2, 6, 23, 0.22);
  color: #fbbf24;
  font-size: 25px;
  font-weight: 500;
  line-height: 1;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.imageUploadButton:hover:not(.disabled) .imageUploadIcon {
  transform: scale(1.06) rotate(90deg);
  background: rgba(251, 191, 36, 0.2);
}

.imageUploadButton > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  text-align: left;
}

.imageUploadButton strong {
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.imageUploadButton small {
  color: rgba(226, 232, 240, 0.68);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.45;
}

.imageUploadButton.disabled {
  border-color: rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.5);
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.58;
}

.imageUploadButton.disabled .imageUploadIcon {
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(148, 163, 184, 0.08);
  color: rgba(226, 232, 240, 0.55);
}

@media (max-width: 600px) {
  .imageUploadButton {
    min-height: 96px;
    padding: 17px 18px;
    justify-content: flex-start;
    gap: 13px;
  }

  .imageUploadIcon {
    width: 42px;
    height: 42px;
    flex-basis: 42px;
    font-size: 22px;
  }

  .imageUploadButton strong {
    font-size: 13px;
  }

  .imageUploadButton small {
    font-size: 9px;
  }
}

.imageUploadHint {
  display: block;
  margin-top: 9px;
  color: rgba(226, 232, 240, 0.5);
  font-size: 10px;
}

.imageUploadMessage {
  margin: 10px 0 0;
  color: #fbbf24;
  font-size: 11px;
  font-weight: 800;
}

@media (max-width: 700px) {
  .editImagesGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    .editImagesGrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-height: 500px;
}
  }

  .imageSectionHeading {
    align-items: flex-start;
    flex-direction: column;
  }
}.editImageInfo {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
}

.editImageInfo > strong {
  display: block;
  overflow: hidden;
  color: #ffffff;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editImageActions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
}

.setPrimaryImageButton,
.deleteEditImageButton {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 9px;
  cursor: pointer;
  font: inherit;
  font-size: 9px;
  font-weight: 900;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.setPrimaryImageButton {
  border: 1px solid rgba(251, 191, 36, 0.4);
  background: rgba(245, 158, 11, 0.09);
  color: #fbbf24;
}

.setPrimaryImageButton:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #fbbf24;
  background: rgba(245, 158, 11, 0.17);
}

.deleteEditImageButton {
  border: 1px solid rgba(248, 113, 113, 0.34);
  background: rgba(239, 68, 68, 0.08);
  color: #fca5a5;
}

.deleteEditImageButton:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(248, 113, 113, 0.72);
  background: rgba(239, 68, 68, 0.15);
}

.setPrimaryImageButton:disabled,
.deleteEditImageButton:disabled {
  cursor: wait;
  opacity: 0.5;
}

@media (max-width: 700px) {
  .editImageActions {
    grid-template-columns: 1fr;
  }
}
    `}</style>
  );
}

