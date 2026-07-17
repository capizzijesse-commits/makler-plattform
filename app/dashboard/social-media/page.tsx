"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlatformName = "Instagram" | "Facebook" | "LinkedIn" | "X";

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

const PLATFORM_NAMES: PlatformName[] = ["Instagram", "Facebook", "LinkedIn", "X"];

export default function SocialMediaPage() {
  const [location, setLocation] = useState("Winterthur");
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
  });
useEffect(() => {
  const savedAnalysis = localStorage.getItem("inseratAiImageAnalysis");

  if (savedAnalysis) {
    setImageAnalysis(savedAnalysis);
  }
}, []);
  useEffect(() => {
    const savedDraft = localStorage.getItem("inseratAiSocialDraft");

    if (!savedDraft) return;

    try {
      const data = JSON.parse(savedDraft);

      if (typeof data.location === "string") setLocation(data.location);
      if (typeof data.propertyType === "string") {
        setPropertyType(data.propertyType);
      }
      if (typeof data.rooms === "string") setRooms(data.rooms);
      if (typeof data.livingArea === "string") setLivingArea(data.livingArea);
      if (typeof data.price === "string") setPrice(data.price);
      if (typeof data.highlights === "string") setHighlights(data.highlights);
      if (typeof data.styleText === "string") setStyleText(data.styleText);
      if (typeof data.imageAnalysis === "string") {
        setImageAnalysis(data.imageAnalysis);
      }
    } catch {
      console.log("Social-Media-Daten konnten nicht geladen werden.");
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

    return null;
  }

  function getPlatformButtonLabel(platform: PlatformName) {
    if (platform === "Instagram") return "Instagram öffnen";
    if (platform === "Facebook") return "Facebook öffnen";
    if (platform === "LinkedIn") return "LinkedIn öffnen";
    if (platform === "X") return "X öffnen";

    return "Plattform öffnen";
  }

  function getPlatformButtonIcon(platform: PlatformName) {
    if (platform === "Instagram") return "📸";
    if (platform === "Facebook") return "📘";
    if (platform === "LinkedIn") return "💼";
    if (platform === "X") return "𝕏";

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

  if (platform === "X") {
    return `${baseClass} border-white/25 bg-gradient-to-r from-slate-950 to-slate-800 shadow-black/20 hover:from-slate-800 hover:to-slate-700`;
  }

  return `${baseClass} border-amber-400/40 bg-slate-900`;
}

  function getPlatformUrl(platform: PlatformName) {
    if (platform === "Instagram") return "https://www.instagram.com/";
    if (platform === "Facebook") return "https://www.facebook.com/";
    if (platform === "LinkedIn") return "https://www.linkedin.com/";
    if (platform === "X") return "https://x.com/";

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
        imageAnalysis,
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
        demo: true,
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
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
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
              Erstelle professionelle Immobilien-Posts für Instagram, Facebook,
              LinkedIn und X – inklusive Bildhinweis, Hashtags und Copy-Funktion.
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
 <section className="socialFormScroll flex h-[760px] min-h-[760px] flex-col overflow-y-scroll rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 pr-3 shadow-2xl backdrop-blur">
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
  className={`flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/10 transition hover:border-amber-300 hover:bg-white/[0.14] ${
    sourceListingId ? "px-5 py-4" : "px-6 py-8"
  }`}
>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="text-center">
                  <div className="text-3xl">📷</div>

                 <div className="mt-3 text-lg font-black text-white">
  {sourceListingId
    ? "Weitere Bilder hinzufügen"
    : "Fotos hochladen"}
</div>

<div className="mt-2 text-sm leading-6 text-slate-400">
  {sourceListingId
    ? "Die gespeicherten Bilder wurden bereits automatisch übernommen."
    : "JPG, PNG oder WEBP hochladen. Maximal 10 Bilder."}
</div>
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

          <section className="flex max-h-[760px] min-h-[760px] flex-col overflow-hidden rounded-[2rem] border border-amber-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-[#111d4a] p-6 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Ausgabe
            </p>

          <h2 className="mt-3 text-3xl font-black text-white">
              Fertige Social-Media-Posts
            </h2>

           <p className="mt-2 text-sm leading-6 text-slate-300">
  Jeder Text wird mit Plattform-Stil, Call-to-Action und passenden
  Hashtags erstellt.
</p>

<div className="mt-5 inline-flex w-fit rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-200">              4 Plattformen
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
                {PLATFORM_NAMES.map((platform) => {
  const platformVariants = getVariantsForPlatform(platform);
  const activeIndex = activeVariantByPlatform[platform] ?? 0;
  const activeVariant = platformVariants[activeIndex];

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

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/45 p-6 shadow-inner">
       <p className="text-lg font-black uppercase tracking-wide text-amber-300">
          {platform} Variante {activeIndex + 1}
        </p>

<p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-200">          {activeVariant.text}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => copyPost(activeVariant.text)}
className="inline-flex items-center justify-center rounded-xl border border-amber-400/60 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-200 shadow-[0_8px_20px_rgba(245,158,11,0.12)] transition hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-amber-500 hover:to-yellow-400 hover:text-slate-950"        >
          📋 Text kopieren
        </button>

        <button
          type="button"
          onClick={() => window.open(getPlatformUrl(platform), "_blank")}
          className={getPlatformButtonClass(platform)}
        >
          {getPlatformButtonIcon(platform)} {getPlatformButtonLabel(platform)}
        </button>
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
  );
}