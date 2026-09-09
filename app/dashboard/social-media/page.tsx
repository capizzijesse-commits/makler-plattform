"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WorkspaceFrame from "../../components/WorkspaceFrame";
import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

type PlatformName = "Instagram" | "Facebook" | "LinkedIn" | "X" | "WhatsApp";

type SocialVariant = {
  title: string;
  text: string;
};
type ListingImage = {
  id: string;
  url: string;
  isPrimary: boolean;
  position: number;
};

type SocialListing = {
  location: string;
  propertyType: string;
  rooms: number | null;
  livingArea: number | null;
  price: number | null;
  highlights: string | null;
  style: string | null;
  imageAnalysis?: string | null;
  images?: ListingImage[];
  socialVariants?: SocialVariant[] | null;
};

type ListingResponse = {
  success: boolean;
  listing?: SocialListing;
  error?: string;
};

const PLATFORM_NAMES: PlatformName[] = ["WhatsApp", "Instagram", "Facebook", "LinkedIn", "X"];

export default function SocialMediaPage() {
  const [market, setMarket] =
    useState<InseratAiMarket>("CH");

  useEffect(() => {
    const domainMarket =
      getInseratAiMarketFromHostname(
        window.location.hostname
      );

    if (domainMarket) {
      setMarket(domainMarket);
      return;
    }

    const storedMarket =
      window.localStorage.getItem(
        "inseratAiMarket"
      );

    if (
      storedMarket === "CH" ||
      storedMarket === "DE"
    ) {
      setMarket(storedMarket);
    }
  }, []);

  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("Wohnung");
  const [rooms, setRooms] = useState("4.5");
  const [livingArea, setLivingArea] = useState("150");
  const [price, setPrice] = useState("1000000");
  const [styleText, setStyleText] = useState("hochwertig, modern");
  const [highlights, setHighlights] = useState(
    "Balkon, Lift, Schule, Kindergarten, Bahnhof"
  );

  const [imageAnalysis, setImageAnalysis] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
const [sourceListingId, setSourceListingId] = useState<string | null>(
  null
);
  const [variants, setVariants] = useState<SocialVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeVariantByPlatform, setActiveVariantByPlatform] = useState<
    Record<PlatformName, number>
  >({
    Instagram: 0,
    Facebook: 0,
    LinkedIn: 0,
    X: 0,
    WhatsApp: 0,
  });

  const [
    activePlatform,
    setActivePlatform,
  ] = useState<PlatformName>(
    "WhatsApp"
  );

  const [
    selectedImageByPlatform,
    setSelectedImageByPlatform,
  ] = useState<
    Record<PlatformName, number>
  >({
    Instagram: 0,
    Facebook: 0,
    LinkedIn: 0,
    X: 0,
    WhatsApp: 0,
  });
useEffect(() => {
  const savedAnalysis = localStorage.getItem("inseratAiImageAnalysis");

  if (savedAnalysis) {
    setImageAnalysis(savedAnalysis);
  }
}, []);
  useEffect(() => {
  const listingId = new URLSearchParams(
    window.location.search
  ).get("listingId");

  if (!listingId) {
    return;
  }
setSourceListingId(listingId);
  const controller = new AbortController();

  async function loadListingForSocialMedia() {
    try {
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
        window.location.href = "/login";
        return;
      }

      const data = (await response.json()) as ListingResponse;

      if (!response.ok || !data.success || !data.listing) {
        throw new Error(
          data.error ||
            "Das ausgewählte Objekt konnte nicht geladen werden."
        );
      }

      const listing = data.listing;
      if (Array.isArray(listing.socialVariants)) {
  setVariants(listing.socialVariants);
}

      setLocation(listing.location || "");
      setPropertyType(listing.propertyType || "");

      setRooms(
        listing.rooms !== null ? String(listing.rooms) : ""
      );

      setLivingArea(
        listing.livingArea !== null
          ? String(listing.livingArea)
          : ""
      );

      setPrice(
        listing.price !== null ? String(listing.price) : ""
      );

      setHighlights(listing.highlights || "");
      setStyleText(listing.style || "");
      setImageAnalysis(listing.imageAnalysis || "");

      const sortedImageUrls = [...(listing.images ?? [])]
        .sort((firstImage, secondImage) => {
          if (firstImage.isPrimary !== secondImage.isPrimary) {
            return firstImage.isPrimary ? -1 : 1;
          }

          return firstImage.position - secondImage.position;
        })
        .map((image) => image.url);

      setSelectedImages([]);

      setImagePreviews((currentPreviews) => {
        currentPreviews
          .filter((preview) => preview.startsWith("blob:"))
          .forEach((preview) => {
            URL.revokeObjectURL(preview);
          });

        return sortedImageUrls;
      });
    } catch (loadError) {
      if (
        loadError instanceof DOMException &&
        loadError.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "SOCIAL-MEDIA-OBJEKT-FEHLER:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Das ausgewählte Objekt konnte nicht geladen werden."
      );
    }
  }

  void loadListingForSocialMedia();


  return () => {
    controller.abort();
  };
}, []);
  function getPlatformFromTitle(title: string): PlatformName | null {
    const value = title.toLowerCase();

    if (value.includes("instagram")) return "Instagram";
    if (value.includes("facebook")) return "Facebook";
    if (value.includes("linkedin")) return "LinkedIn";
    if (value.includes("x variante") || value.includes("twitter")) return "X";
    if (value.includes("whatsapp")) return "WhatsApp";

    return null;
  }

  function getPlatformButtonLabel(platform: PlatformName) {
    if (platform === "Instagram") return "Instagram öffnen";
    if (platform === "Facebook") return "Facebook öffnen";
    if (platform === "LinkedIn") return "LinkedIn öffnen";
    if (platform === "X") return "X öffnen";
    if (platform === "WhatsApp") return "WhatsApp öffnen";

    return "Plattform öffnen";
  }

  function getPlatformButtonIcon(platform: PlatformName) {
    if (platform === "Instagram") return "📸";
    if (platform === "Facebook") return "📘";
    if (platform === "LinkedIn") return "💼";
    if (platform === "X") return "𝕏";
    if (platform === "WhatsApp") return "💬";

    return "🔗";
  }

  function getPlatformButtonClass(platform: PlatformName) {
  const baseClass =
    "inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:scale-[1.02]";

  if (platform === "Instagram") {
    return `${baseClass} border-fuchsia-300/40 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 shadow-fuchsia-500/15 hover:shadow-fuchsia-500/25`;
  }

  if (platform === "Facebook") {
    return `${baseClass} border-blue-300/40 bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/15 hover:from-blue-500 hover:to-blue-400`;
  }

  if (platform === "LinkedIn") {
    return `${baseClass} border-sky-300/40 bg-gradient-to-r from-sky-700 to-blue-600 shadow-sky-500/15 hover:from-sky-600 hover:to-blue-500`;
  }

  if (platform === "WhatsApp") {
    return `${baseClass} border-green-300/50 bg-gradient-to-r from-green-600 to-emerald-500 shadow-green-500/25 hover:from-green-500 hover:to-emerald-400 hover:shadow-green-500/35`;
  }

  if (platform === "X") {
    return `${baseClass} border-white/25 bg-gradient-to-r from-slate-950 to-slate-800 shadow-black/20 hover:from-slate-800 hover:to-slate-700`;
  }

  return `${baseClass} border-amber-400/40 bg-slate-900`;
}

  function getPlatformTabClass(
    platform: PlatformName,
    isActive: boolean
  ) {
    const base =
      "flex min-h-[54px] items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-black transition";

    if (!isActive) {
      return `${base} border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/25 hover:bg-white/10`;
    }

    if (platform === "WhatsApp") {
      return `${base} border-green-300/50 bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/20`;
    }

    if (platform === "Instagram") {
      return `${base} border-fuchsia-300/40 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 text-white`;
    }

    if (platform === "Facebook") {
      return `${base} border-blue-300/40 bg-gradient-to-r from-blue-600 to-blue-500 text-white`;
    }

    if (platform === "LinkedIn") {
      return `${base} border-sky-300/40 bg-gradient-to-r from-sky-700 to-blue-600 text-white`;
    }

    return `${base} border-white/30 bg-slate-950 text-white`;
  }

  function getPlatformUrl(platform: PlatformName) {
    if (platform === "Instagram") return "https://www.instagram.com/";
    if (platform === "Facebook") return "https://www.facebook.com/";
    if (platform === "LinkedIn") return "https://www.linkedin.com/";
    if (platform === "X") return "https://x.com/";
    if (platform === "WhatsApp") return "https://web.whatsapp.com/";

    return "#";
  }

  function getVariantsForPlatform(platform: PlatformName) {
    return variants.filter(
      (variant) => getPlatformFromTitle(variant.title) === platform
    );
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>)
   {
    function removeImage(indexToRemove: number) {
  const previewToRemove = imagePreviews[indexToRemove];

  if (previewToRemove) {
    URL.revokeObjectURL(previewToRemove);
  }

  const updatedImages = selectedImages.filter(
    (_, index) => index !== indexToRemove
  );

  const updatedPreviews = imagePreviews.filter(
    (_, index) => index !== indexToRemove
  );

  setSelectedImages(updatedImages);
  setImagePreviews(updatedPreviews);

  if (updatedImages.length === 0) {
    setImageAnalysis("");
  } else {
    setImageAnalysis(
      `${updatedImages.length} Immobilienbilder wurden hochgeladen. Die Social-Media-Texte sollen die Bilder berücksichtigen und visuell ansprechend formuliert werden.`
    );
  }
}

    const files = event.target.files;

    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, 10);
    const previews = fileArray.map((file) => URL.createObjectURL(file));

    setSelectedImages(fileArray);
    setImagePreviews(previews);

    setImageAnalysis(
      `${fileArray.length} Immobilienbilder wurden hochgeladen. Die Social-Media-Texte sollen die Bilder berücksichtigen und visuell ansprechend formuliert werden.`
    );

  }
  function removeImage(indexToRemove: number) {
  const previewToRemove = imagePreviews[indexToRemove];

  if (previewToRemove) {
    URL.revokeObjectURL(previewToRemove);
  }

  const updatedImages = selectedImages.filter(
    (_, index) => index !== indexToRemove
  );

  const updatedPreviews = imagePreviews.filter(
    (_, index) => index !== indexToRemove
  );

  setSelectedImages(updatedImages);
  setImagePreviews(updatedPreviews);

  if (updatedImages.length === 0) {
    setImageAnalysis("");
  } else {
    setImageAnalysis(
      `${updatedImages.length} Immobilienbilder wurden hochgeladen. Die Social-Media-Texte sollen die Bilder berücksichtigen und visuell ansprechend formuliert werden.`
    );
  }
}

  async function copyPost(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Text wurde kopiert.");
  }

  async function downloadPostImage(
    platform: PlatformName,
    imageIndex: number
  ) {
    const imageUrl =
      imagePreviews[imageIndex];

    if (!imageUrl) {
      return;
    }

    try {
      const response =
        await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(
          "Bild konnte nicht geladen werden."
        );
      }

      const blob =
        await response.blob();

      const extension =
        blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
            ? "webp"
            : "jpg";

      const objectUrl =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href =
        objectUrl;

      anchor.download =
        `inserat-ai-${platform.toLowerCase()}-bild-${
          imageIndex + 1
        }.${extension}`;

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(
        objectUrl
      );
    } catch (downloadError) {
      console.error(
        "SOCIAL IMAGE DOWNLOAD:",
        downloadError
      );

      alert(
        "Das Bild konnte nicht gespeichert werden."
      );
    }
  }

  async function sharePostWithImage(
    platform: PlatformName,
    text: string,
    imageIndex: number
  ) {
    const imageUrl =
      imagePreviews[imageIndex];

    if (!imageUrl) {
      await copyPost(text);

      alert(
        "Kein Bild ausgewählt. Der Text wurde kopiert."
      );

      return;
    }

    try {
      const response =
        await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(
          "Bild konnte nicht geladen werden."
        );
      }

      const blob =
        await response.blob();

      const mimeType =
        blob.type ||
        "image/jpeg";

      const extension =
        mimeType.includes("png")
          ? "png"
          : mimeType.includes("webp")
            ? "webp"
            : "jpg";

      const file =
        new File(
          [blob],
          `inserat-ai-${platform.toLowerCase()}-${imageIndex + 1}.${extension}`,
          {
            type: mimeType,
          }
        );

      /*
       * Caption vorsorglich auch kopieren.
       * Manche Ziel-Apps übernehmen beim Teilen
       * zwar das Bild, aber nicht automatisch
       * den kompletten Begleittext.
       */
      try {
        await navigator.clipboard.writeText(
          text
        );
      } catch {
        // Teilen funktioniert auch ohne Clipboard.
      }

      const canShareFiles =
        typeof navigator.share ===
          "function" &&
        typeof navigator.canShare ===
          "function" &&
        navigator.canShare({
          files: [file],
        });

      if (canShareFiles) {
        await navigator.share({
          files: [file],
          text,
          title:
            platform +
            " Immobilien-Post",
        });

        return;
      }

      /*
       * Fallback für Browser ohne File-Sharing.
       */
      await downloadPostImage(
        platform,
        imageIndex
      );

      window.open(
        getPlatformUrl(platform),
        "_blank",
        "noopener,noreferrer"
      );

      alert(
        "Der Text wurde kopiert und das Bild gespeichert. " +
        platform +
        " wurde geöffnet."
      );
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name ===
          "AbortError"
      ) {
        return;
      }

      console.error(
        "SOCIAL SHARE FEHLER:",
        shareError
      );

      try {
        await navigator.clipboard.writeText(
          text
        );
      } catch {
        // Kein weiterer Fallback möglich.
      }

      alert(
        "Direktes Teilen war auf diesem Gerät nicht möglich. Der Text wurde nach Möglichkeit kopiert."
      );
    }
  }

async function saveSocialVariants(
  listingId: string,
  generatedVariants: SocialVariant[]
) {
  const response = await fetch(
    `/api/listings/${encodeURIComponent(listingId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location,
        propertyType,
        rooms,
        livingArea,
        price,
        highlights,
        style: styleText,
        socialVariants: generatedVariants,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Die Social-Media-Texte konnten nicht dauerhaft gespeichert werden."
    );
  }
}
 async function handleGenerateSocial() {
  setLoading(true);
  setError("");
  setVariants([]);

  try {
    const response = await fetch("/api/generate-social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location,
        propertyType,
        rooms,
        livingArea,
        price,
        highlights,
        styleText,
        imageAnalysis,
        market,
        listingId: sourceListingId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Social-Media-Texte konnten nicht erstellt werden."
      );
    }

    const generatedSocialVariants: SocialVariant[] = Array.isArray(
      data.variants
    )
      ? data.variants
      : [];

    if (generatedSocialVariants.length === 0) {
      throw new Error("Es wurden keine Social-Media-Varianten erstellt.");
    }

    setVariants(generatedSocialVariants);

    if (sourceListingId) {
      await saveSocialVariants(
        sourceListingId,
        generatedSocialVariants
      );
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Social-Media-Texte konnten nicht erstellt werden."
    );
  } finally {
    setLoading(false);
  }
}
return (
  <WorkspaceFrame
    market={market}
    active="social"
    title="Social Media"
    listingId={sourceListingId}
  >
    <main className="socialMediaPage min-h-screen bg-[#071a2f] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">
              Inserat-AI
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Social-Media Studio
            </h1>

            <p className="mt-3 max-w-2xl text-slate-300">
              Erstelle fertige Immobilien-Posts für Instagram, Facebook,
              LinkedIn und X – inklusive Objektbild, Text, Hashtags und direkter Teilen-Funktion.
            </p>
          </div>

          <Link
  href="/dashboard"
  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/70 bg-gradient-to-r from-amber-500/20 to-yellow-400/10 px-6 py-3 text-sm font-black text-amber-300 shadow-[0_8px_20px_rgba(245,158,11,0.14)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:from-amber-500 hover:to-yellow-400 hover:text-slate-950"
>
  <span>←</span>
  Zurück zum Dashboard
</Link>
        </div>

   <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
 <section className="socialFormScroll flex h-[760px] min-h-[760px] flex-col overflow-y-scroll rounded-[20px] border border-white/10 bg-white/[0.07] p-6 pr-3 shadow-2xl backdrop-blur">
  <div className="min-h-0 flex-1">

      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
        Eingabe
      </p>
      </div>

            <h2 className="mt-3 text-3xl font-black">Objektdaten</h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Diese Daten werden nur für die Social-Media-Texte verwendet. Der
              Hauptgenerator bleibt unverändert.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Ort / Lage
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={
                    market === "DE"
                      ? "München"
                      : "Zürich"
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Objektart
                </label>
                <input
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Zimmer
                </label>
                <input
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Wohnfläche m²
                </label>
                <input
                  value={livingArea}
                  onChange={(e) => setLivingArea(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Preis
                </label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Stil
                </label>
                <input
                  value={styleText}
                  onChange={(e) => setStyleText(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Highlights
              </label>

              <input
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-bold text-slate-200">
  {sourceListingId
    ? "Gespeicherte Objektbilder"
    : "Objektbilder"}
</label>

              <label
  className={
    imagePreviews.length > 0
      ? "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-cyan-300/20 bg-white/[0.05] px-4 py-3 transition hover:border-cyan-300/50 hover:bg-white/[0.08]"
      : "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-white/15 bg-white/[0.06] px-4 py-4 transition hover:border-amber-300/50 hover:bg-white/[0.09]"
  }
>
  <input
    type="file"
    accept="image/png,image/jpeg,image/webp"
    multiple
    onChange={handleImageUpload}
    className="hidden"
  />

  <div className="flex min-w-0 items-center gap-3">
    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/10 text-lg">
      📷
    </div>

    <div className="min-w-0">
      <div className="text-sm font-black text-white">
        {imagePreviews.length > 0
          ? "+ Weitere Bilder hinzufügen"
          : "Fotos hochladen"}
      </div>

      <div className="mt-0.5 text-xs text-slate-400">
        JPG, PNG oder WEBP · maximal 10 Bilder
      </div>
    </div>
  </div>

  <div className="flex-none rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-300">
    {imagePreviews.length > 0
      ? imagePreviews.length + " ausgewählt"
      : "Auswählen"}
  </div>
</label>
{sourceListingId && imagePreviews.length > 0 && (
  <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-200">
    ✓ Automatisch aus dem Makler-Cockpit übernommen. Das Hauptbild
    erscheint zuerst.
  </div>
)}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div
  key={index}
  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
>
  <button
    type="button"
    onClick={() => removeImage(index)}
    className="absolute right-2 top-2 z-10 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-black text-white transition hover:bg-red-600"
  >
    ✕
  </button>
                      <img
                        src={preview}
                        alt={`Objektfoto ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />

                      <div className="p-2 text-xs text-slate-300">
                        {selectedImages[index]?.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-slate-300">
                🤖 Nach dem Hochladen berücksichtigt Inserat-AI die Bilder
                automatisch für bessere Social-Media-Posts.
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateSocial}
              disabled={loading}
           className="sticky bottom-0 z-20 mt-6 w-full flex-shrink-0 rounded-full border border-amber-200/50 bg-gradient-to-r from-yellow-300 to-orange-500 px-8 py-5 text-base font-black text-slate-950 shadow-[0_-12px_28px_rgba(2,6,23,0.75)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Social-Media-Posts werden erstellt..."
                : "✨ Generieren (3 Varianten)"}
            </button>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}
          </section>

          <section className="flex max-h-[760px] min-h-[760px] flex-col overflow-hidden rounded-[20px] border border-amber-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-[#111d4a] p-6 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Ausgabe
            </p>

          <h2 className="mt-3 text-3xl font-black text-white">
              Dein fertiger Social-Media-Post
            </h2>

           <p className="mt-2 text-sm leading-6 text-slate-300">
  Wähle Plattform, Textvariante und Objektbild. Inserat-AI passt den Post automatisch an den jeweiligen Kanal an.
</p>

<div className="mt-5 inline-flex w-fit rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-200">              5 Plattformen
            </div>

            {variants.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-amber-400/30 bg-white/[0.05] p-6">
<p className="text-sm font-black uppercase tracking-wide text-amber-300">                  Social-Media-Posts
                </p>

<p className="mt-4 text-sm leading-7 text-slate-300">                  Klicke links auf Generieren. Danach erscheinen Instagram,
                  Facebook, LinkedIn und X mit je 3 Varianten.
                </p>
              </div>
            ) : (
              <div className="mt-8 min-h-0 flex-1 space-y-6 overflow-y-auto pr-2">
                {[activePlatform].map((platform) => {
  const platformVariants =
    getVariantsForPlatform(platform);

  const activeIndex =
    activeVariantByPlatform[platform] ?? 0;

  const activeVariant =
    platformVariants[activeIndex];

  const requestedImageIndex =
    selectedImageByPlatform[platform] ?? 0;

  const selectedImageIndex =
    imagePreviews.length > 0
      ? Math.min(
          requestedImageIndex,
          imagePreviews.length - 1
        )
      : -1;

  const selectedPostImage =
    selectedImageIndex >= 0
      ? imagePreviews[selectedImageIndex]
      : null;

  if (!activeVariant) return null;

  return (
    <div
      key={platform}
className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-6 shadow-xl"    >
      <h2 className="text-xl font-black uppercase tracking-wide text-amber-300">
        {platform}
      </h2>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {platformVariants.map((_, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={index}
              type="button"
              onClick={() =>
                setActiveVariantByPlatform((current) => ({
                  ...current,
                  [platform]: index,
                }))
              }
              className={`rounded-2xl border px-5 py-4 text-sm font-black transition ${
                isActive
                  ? "border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/10"
                 : "border-white/10 bg-white/[0.05] text-slate-300 hover:border-amber-400/50 hover:bg-amber-400/10 hover:text-amber-200"
              }`}
            >
              Variante {index + 1}
            </button>
          );
        })}
      </div>

      {selectedPostImage && (
        <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-slate-950/45 p-4 shadow-inner">

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              BILD FÜR DIESEN POST
            </p>

            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              Bild {selectedImageIndex + 1} / {imagePreviews.length}
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <img
              src={selectedPostImage}
              alt={`${platform} Objektbild`}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>

          {imagePreviews.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {imagePreviews.map(
                (
                  preview,
                  imageIndex
                ) => (
                  <button
                    key={`${platform}-image-${imageIndex}`}
                    type="button"
                    onClick={() =>
                      setSelectedImageByPlatform(
                        (current) => ({
                          ...current,
                          [platform]:
                            imageIndex,
                        })
                      )
                    }
                    className={
                      imageIndex ===
                      selectedImageIndex
                        ? "h-16 w-20 flex-none overflow-hidden rounded-xl border-2 border-amber-300"
                        : "h-16 w-20 flex-none overflow-hidden rounded-xl border border-white/10 opacity-70 hover:opacity-100"
                    }
                  >
                    <img
                      src={preview}
                      alt={`Objektbild ${
                        imageIndex + 1
                      }`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/45 p-6 shadow-inner">
       <p className="text-lg font-black uppercase tracking-wide text-amber-300">
          {platform} Variante {activeIndex + 1}
        </p>

<p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-200">          {activeVariant.text}
        </p>
      </div>

      {/* SOCIAL PLATFORM SELECTOR */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Plattform wählen
        </p>

        <div className="grid grid-cols-5 gap-2">
          {PLATFORM_NAMES.map(
            (platformOption) => {
              const isActive =
                platformOption ===
                activePlatform;

              return (
                <button
                  key={platformOption}
                  type="button"
                  onClick={() =>
                    setActivePlatform(
                      platformOption
                    )
                  }
                  className={getPlatformTabClass(
                    platformOption,
                    isActive
                  )}
                  title={platformOption}
                >
                  <span className="text-base">
                    {getPlatformButtonIcon(
                      platformOption
                    )}
                  </span>

                  <span className="hidden xl:inline">
                    {platformOption}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-400">
          Der Text passt sich automatisch an die gewählte Plattform an.
        </p>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() =>
            void sharePostWithImage(
              platform,
              activeVariant.text,
              selectedImageIndex
            )
          }
          className={`${getPlatformButtonClass(
            platform
          )} w-full min-h-[58px] text-base`}
        >
          <span>
            {getPlatformButtonIcon(
              platform
            )}
          </span>

          <span>
            Auf {platform} teilen
          </span>
        </button>

        <p className="mt-3 text-center text-xs leading-5 text-slate-400">
          Bild und Text werden automatisch gemeinsam vorbereitet.
        </p>
      </div>
    </div>
  );
})}
              </div>
            )}

          </section>
        </div>
      </div>

      <style jsx>{`
  .socialFormScroll {
    scrollbar-width: thin;
    scrollbar-color: #f59e0b rgba(255, 255, 255, 0.08);
  }

  .socialFormScroll::-webkit-scrollbar {
    width: 10px;
  }

  .socialFormScroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
  }

  .socialFormScroll::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      #fbbf24 0%,
      #f59e0b 50%,
      #f97316 100%
    );
    border-radius: 999px;
    border: 2px solid rgba(15, 23, 42, 0.75);
  }

  .socialFormScroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      #fde047 0%,
      #f59e0b 50%,
      #ea580c 100%
    );
  }
`}</style>
    </main>
  </WorkspaceFrame>
  );
}
