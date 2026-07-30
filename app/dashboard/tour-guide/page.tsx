"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type ListingImage = {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
};

type TourListing = {
  id: string;
  location: string;
  propertyType: string;
  rooms: number | null;
  livingArea: number | null;
  price: number | null;
  highlights: string | null;
  style: string | null;
  images?: ListingImage[];
};

type ListingResponse = {
  success?: boolean;
  listing?: TourListing;
  error?: string;
};

type SessionResponse = {
  success?: boolean;
  authenticated?: boolean;
  user?: {
    plan?: string;
    capabilities?: {
      canUseTourGuide?: boolean;
    };
  };
  error?: string;
};

// TOUR_CREATION_READY
type TourSection = {
  room: string;
  title: string;
  audioText: string;
  videoText: string;
};

type TourAudioStatus = "idle" | "loading" | "ready" | "error";

const DEFAULT_TOUR_ROOMS = [
  "Eingang",
  "Wohnzimmer",
  "Küche",
  "Schlafzimmer",
  "Badezimmer",
  "Balkon / Terrasse",
];

const VOICE_API_IDS: Record<string, string> = {
  lea: "marin",
  nora: "coral",
  sofia: "shimmer",
  luca: "cedar",
  marco: "onyx",
  jonas: "echo",
};

function formatNumber(value: number | null, locale: string) {
  if (value === null) {
    return "–";
  }

  const numberLocale =
    locale === "de"
      ? "de-CH"
      : locale === "it"
        ? "it-CH"
        : locale === "fr"
          ? "fr-CH"
          : "en-CH";

  return new Intl.NumberFormat(numberLocale).format(value);
}

export default function TourGuidePage() {
  const t = useTranslations("TourGuide");
  const locale = useLocale();

  const [listing, setListing] = useState<TourListing | null>(null);
  const [listingImages, setListingImages] = useState<ListingImage[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  // VOICE_CONTROLS_READY
  const [selectedVoice, setSelectedVoice] = useState("lea");
  const [sceneDuration, setSceneDuration] = useState(8);
  const [showAllVoices, setShowAllVoices] = useState(false);
  // ROOM_SELECTION_READY
  const [roomOptions, setRoomOptions] =
    useState<string[]>(DEFAULT_TOUR_ROOMS);
  const [selectedRooms, setSelectedRooms] =
    useState<string[]>(DEFAULT_TOUR_ROOMS);
  const [customRoom, setCustomRoom] = useState("");
  const [tourSections, setTourSections] = useState<TourSection[]>([]);
  const [isGeneratingTour, setIsGeneratingTour] = useState(false);
  const [tourError, setTourError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState("");
  const [tourAudioStatus, setTourAudioStatus] =
    useState<TourAudioStatus>("idle");

  const productionRef = useRef<HTMLElement | null>(null);
  // CINEMATIC_TOUR_READY
  const finishedTourAudioRef = useRef<HTMLAudioElement | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [listingError, setListingError] = useState("");
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [hasTourAccess, setHasTourAccess] = useState(false);
  const [planAccessError, setPlanAccessError] = useState("");

  const activeImage = listingImages[activeSceneIndex] ?? null;

  const activeTourSection =
    tourSections.length > 0
      ? tourSections[activeSceneIndex % tourSections.length]
      : null;

  const voiceOptions = [
    {
      id: "lea",
      name: "Lea",
      description: t("voices.lea"),
    },
    {
      id: "nora",
      name: "Nora",
      description: t("voices.nora"),
    },
    {
      id: "luca",
      name: "Luca",
      description: t("voices.luca"),
    },
    {
      id: "sofia",
      name: "Sofia",
      description: t("voices.sofia"),
    },
    {
      id: "marco",
      name: "Marco",
      description: t("voices.marco"),
    },
    {
      id: "jonas",
      name: "Jonas",
      description: t("voices.jonas"),
    },
  ];

  const visibleVoiceOptions = showAllVoices
    ? voiceOptions
    : voiceOptions.slice(0, 3);

  const selectedVoiceOption =
    voiceOptions.find((voice) => voice.id === selectedVoice) ??
    voiceOptions[0];

  useEffect(() => {
    return () => {
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
    };
  }, [generatedAudioUrl]);

  useEffect(() => {
    const controller = new AbortController();
    let accessGranted = false;

    async function loadTourStudio() {
      try {
        setCheckingPlan(true);
        setLoadingListing(true);
        setPlanAccessError("");
        setListingError("");

        const sessionResponse = await fetch("/api/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (sessionResponse.status === 401) {
          window.location.href = "/login";
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
            locale === "de" && sessionData.error
                ? sessionData.error
                : t("errors.accessCheck")
          );
        }

        const canUseTourGuide =
          sessionData.user?.capabilities?.canUseTourGuide === true;

        if (!canUseTourGuide) {
          setHasTourAccess(false);
          return;
        }

        accessGranted = true;
        setHasTourAccess(true);

        const listingId = new URLSearchParams(
          window.location.search
        ).get("listingId");

        if (!listingId) {
          setListingError(
            t("errors.openFromCockpit")
          );
          return;
        }

        const response = await fetch(
          `/api/listings/${encodeURIComponent(listingId)}`,
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
            locale === "de" && data.error
                ? data.error
                : t("errors.loadListing")
          );
        }

        const sortedImages = [...(data.listing.images ?? [])].sort(
          (firstImage, secondImage) => {
            if (firstImage.isPrimary !== secondImage.isPrimary) {
              return firstImage.isPrimary ? -1 : 1;
            }

            return firstImage.position - secondImage.position;
          }
        );

        setListing(data.listing);
        setListingImages(sortedImages);
        setActiveSceneIndex(0);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : t("errors.loadStudio");

        if (accessGranted) {
          setListingError(message);
        } else {
          setPlanAccessError(message);
          setHasTourAccess(false);
        }
      } finally {
        setCheckingPlan(false);
        setLoadingListing(false);
      }
    }

    void loadTourStudio();

    return () => controller.abort();
  }, []);

  // TOUR_PLAYBACK_READY
  useEffect(() => {
    if (!isTourPlaying || listingImages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSceneIndex((currentIndex) =>
        currentIndex >= listingImages.length - 1
          ? 0
          : currentIndex + 1
      );
    }, sceneDuration * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTourPlaying, listingImages.length, sceneDuration]);

  useEffect(() => {
    if (listingImages.length === 0) {
      setIsTourPlaying(false);
      setActiveSceneIndex(0);
      return;
    }

    if (activeSceneIndex >= listingImages.length) {
      setActiveSceneIndex(0);
    }
  }, [activeSceneIndex, listingImages.length]);

  function showPreviousScene() {
    if (listingImages.length <= 1) {
      return;
    }

    setActiveSceneIndex((currentIndex) =>
      currentIndex === 0 ? listingImages.length - 1 : currentIndex - 1
    );
  }

  function showNextScene() {
    if (listingImages.length <= 1) {
      return;
    }

    setActiveSceneIndex((currentIndex) =>
      currentIndex >= listingImages.length - 1 ? 0 : currentIndex + 1
    );
  }

  function toggleTourPlayback() {
    if (listingImages.length === 0) {
      return;
    }

    setIsTourPlaying((current) => !current);
  }

  function stopTourPlayback() {
    setIsTourPlaying(false);
    setActiveSceneIndex(0);
  }

  function toggleTourRoom(room: string) {
    setSelectedRooms((currentRooms) =>
      currentRooms.includes(room)
        ? currentRooms.filter((currentRoom) => currentRoom !== room)
        : [...currentRooms, room]
    );
  }

  function addCustomTourRoom() {
    const normalizedRoom = customRoom.trim();

    if (!normalizedRoom) {
      return;
    }

    setRoomOptions((currentOptions) =>
      currentOptions.some(
        (room) => room.toLowerCase() === normalizedRoom.toLowerCase()
      )
        ? currentOptions
        : [...currentOptions, normalizedRoom]
    );

    setSelectedRooms((currentRooms) =>
      currentRooms.some(
        (room) => room.toLowerCase() === normalizedRoom.toLowerCase()
      )
        ? currentRooms
        : [...currentRooms, normalizedRoom]
    );

    setCustomRoom("");
  }

  function getRoomLabel(room: string) {
    if (room === "Eingang") return t("rooms.entrance");
    if (room === "Wohnzimmer") return t("rooms.livingRoom");
    if (room === "Küche") return t("rooms.kitchen");
    if (room === "Schlafzimmer") return t("rooms.bedroom");
    if (room === "Badezimmer") return t("rooms.bathroom");
    if (room === "Balkon / Terrasse") return t("rooms.balconyTerrace");

    return room;
  }

  function getRoomInstruction(room: string) {
    const roomKey = room.toLowerCase();

    if (roomKey.includes("eingang")) {
      return {
        audio: t("script.instructions.entrance.audio"),
        video: t("script.instructions.entrance.video"),
      };
    }

    if (roomKey.includes("wohn")) {
      return {
        audio: t("script.instructions.livingRoom.audio"),
        video: t("script.instructions.livingRoom.video"),
      };
    }

    if (roomKey.includes("küche") || roomKey.includes("kueche")) {
      return {
        audio: t("script.instructions.kitchen.audio"),
        video: t("script.instructions.kitchen.video"),
      };
    }

    if (roomKey.includes("schlaf")) {
      return {
        audio: t("script.instructions.bedroom.audio"),
        video: t("script.instructions.bedroom.video"),
      };
    }

    if (roomKey.includes("bad")) {
      return {
        audio: t("script.instructions.bathroom.audio"),
        video: t("script.instructions.bathroom.video"),
      };
    }

    return {
      audio: t("script.instructions.outdoor.audio"),
      video: t("script.instructions.outdoor.video"),
    };
  }

  function buildTourSections(): TourSection[] {
    if (!listing) {
      return [];
    }

    const location = listing.location || t("script.locationFallback");
    const propertyType =
      listing.propertyType || t("script.propertyFallback");

    const roomDescription =
      listing.rooms !== null
        ? t("script.roomDescription", {
            rooms: String(listing.rooms),
          })
        : "";

    const livingAreaDescription =
      listing.livingArea !== null
        ? t("script.livingAreaDescription", {
            area: formatNumber(listing.livingArea, locale),
          })
        : "";

    const priceDescription =
      listing.price !== null
        ? t("script.price", {
            price: formatNumber(listing.price, locale),
          })
        : t("script.priceOnRequest");

    const highlights =
      listing.highlights?.trim() || t("script.highlightsFallback");

    const intro: TourSection = {
      room: t("script.intro.room"),
      title: t("script.intro.title", { location }),
      audioText: t("script.intro.audio", {
        roomDescription,
        propertyType,
        location,
        livingAreaDescription,
        highlights,
      }),
      videoText: t("script.intro.video"),
    };

    const roomSections = selectedRooms.map((room) => {
      const instruction = getRoomInstruction(room);
      const roomLabel = getRoomLabel(room);

      return {
        room: roomLabel,
        title: t("script.room.title", { room: roomLabel }),
        audioText: t("script.room.audio", {
          room: roomLabel,
          instruction: instruction.audio,
          highlights,
        }),
        videoText: instruction.video,
      };
    });

    const outro: TourSection = {
      room: t("script.outro.room"),
      title: t("script.outro.title"),
      audioText: t("script.outro.audio", {
        propertyType,
        location,
        priceDescription,
      }),
      videoText: t("script.outro.video"),
    };

    return [intro, ...roomSections, outro];
  }

  async function generateTourGuide() {
    if (!listing) {
      setTourError(t("errors.objectNotLoaded"));
      return;
    }

    if (selectedRooms.length === 0) {
      setTourError(t("errors.selectRoom"));
      return;
    }

    finishedTourAudioRef.current?.pause();
    setIsTourPlaying(false);
    setIsGeneratingTour(true);
    setTourError("");
    setTourAudioStatus("loading");
    setGeneratedAudioUrl("");

    const sections = buildTourSections();
    setTourSections(sections);

    const fullAudioText = sections
      .map((section) => section.audioText)
      .join("\n\n");

    window.setTimeout(() => {
      productionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    try {
      const response = await fetch("/api/tour-speech", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: fullAudioText,
          voice: VOICE_API_IDS[selectedVoice] || "marin",
          locale,
        }),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        let errorMessage = t("errors.voiceAfterScript");

        try {
          const data = (await response.json()) as { error?: string };
          errorMessage = data.error || errorMessage;
        } catch {
          // Keine JSON-Fehlermeldung erhalten.
        }

        throw new Error(errorMessage);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setGeneratedAudioUrl(audioUrl);
      setTourAudioStatus("ready");
    } catch (error) {
      setTourAudioStatus("error");
      setTourError(
        error instanceof Error
          ? error.message
          : t("errors.voiceFailed")
      );
    } finally {
      setIsGeneratingTour(false);
    }
  }

  async function copyFullTour() {
    const fullTourText = tourSections
      .map(
        (section, index) =>
          `${index + 1}. ${section.title}\n\n` +
          `${t("production.audioLabel")}:\n${section.audioText}\n\n` +
          `${t("production.videoLabel")}:\n${section.videoText}`
      )
      .join("\n\n--------------------\n\n");

    try {
      await navigator.clipboard.writeText(fullTourText);
      setCopyStatus(t("production.copySuccess"));
      window.setTimeout(() => setCopyStatus(""), 2600);
    } catch {
      setTourError(t("errors.copyFailed"));
    }
  }
  async function startFinishedTour() {
    const audio = finishedTourAudioRef.current;

    if (!audio || !generatedAudioUrl || listingImages.length === 0) {
      return;
    }

    setTourError("");

    if (
      audio.ended ||
      (Number.isFinite(audio.duration) &&
        audio.currentTime >= audio.duration - 0.2)
    ) {
      audio.currentTime = 0;
      setActiveSceneIndex(0);
    }

    try {
      await audio.play();
      setIsTourPlaying(true);
    } catch {
      setTourError(t("errors.tourStart"));
    }
  }

  function pauseFinishedTour() {
    finishedTourAudioRef.current?.pause();
    setIsTourPlaying(false);
  }

  function stopFinishedTour() {
    const audio = finishedTourAudioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setIsTourPlaying(false);
    setActiveSceneIndex(0);
  }

  function handleFinishedTourEnded() {
    setIsTourPlaying(false);
    setActiveSceneIndex(0);
  }

  const objectValues = [
    {
      label: t("object.location"),
      value: listing?.location || "–",
    },
    {
      label: t("object.propertyType"),
      value: listing?.propertyType || "–",
    },
    {
      label: t("object.rooms"),
      value:
        listing?.rooms !== null && listing?.rooms !== undefined
          ? String(listing.rooms)
          : "–",
    },
    {
      label: t("object.livingArea"),
      value:
        listing?.livingArea !== null && listing?.livingArea !== undefined
          ? `${formatNumber(listing.livingArea, locale)} m²`
          : "–",
    },
    {
      label: t("object.price"),
      value:
        listing?.price !== null && listing?.price !== undefined
          ? `CHF ${formatNumber(listing.price, locale)}`
          : "–",
    },
    {
      label: t("object.style"),
      value: listing?.style || "–",
    },
  ];

  if (checkingPlan) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050819] px-4 py-10 text-white">
        <section className="w-full max-w-xl rounded-[2rem] border border-amber-300/35 bg-white/[0.055] p-8 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            Inserat-AI
          </p>

          <h1 className="mt-4 text-2xl font-black sm:text-3xl">
            {t("states.checking.title")}
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-300">
            {t("states.checking.description")}
          </p>
        </section>
      </main>
    );
  }

  if (planAccessError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050819] px-4 py-10 text-white">
        <section className="w-full max-w-xl rounded-[2rem] border border-red-300/35 bg-white/[0.055] p-8 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
            {t("states.accessError.eyebrow")}
          </p>

          <h1 className="mt-4 text-2xl font-black sm:text-3xl">
            {t("states.accessError.title")}
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-300">
            {planAccessError}
          </p>

          <Link
            href="/cockpit"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-amber-300/50 bg-amber-300/10 px-6 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300/20"
          >
            {t("common.backCockpit")}
          </Link>
        </section>
      </main>
    );
  }

  if (!hasTourAccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050819] px-4 py-10 text-white">
        <section className="w-full max-w-2xl rounded-[2rem] border-2 border-amber-300/45 bg-gradient-to-br from-[#081127] to-[#09091c] p-8 text-center shadow-2xl sm:p-10">
          <span className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            {t("states.upgrade.badge")}
          </span>

          <h1 className="mt-6 text-3xl font-black sm:text-4xl">
            {t("states.upgrade.title")}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            {t("states.upgrade.description")}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/cockpit"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-500/50 bg-white/[0.045] px-6 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
            >
              {t("common.backCockpit")}
            </Link>

            <Link
              href="/#preise"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-amber-300/60 bg-amber-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:brightness-110"
            >
              {t("states.upgrade.offers")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050819] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-12">
      <style>{`
        @keyframes tourCameraMove {
          0% {
            transform: scale(1.02) translate3d(-1%, 0, 0);
          }

          50% {
            transform: scale(1.08) translate3d(1%, -1%, 0);
          }

          100% {
            transform: scale(1.12) translate3d(0, 1%, 0);
          }
        }

        .tourImagePlaying {
          animation-name: tourCameraMove;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
          will-change: transform;
        }

        .tourSceneStrip {
          scrollbar-width: thin;
          scrollbar-color: #22d3ee rgba(255,255,255,.06);
          overscroll-behavior-x: contain;
        }

        .tourSceneStrip::-webkit-scrollbar {
          height: 8px;
        }

        .tourSceneStrip::-webkit-scrollbar-track {
          background: rgba(255,255,255,.06);
          border-radius: 999px;
        }

        .tourSceneStrip::-webkit-scrollbar-thumb {
          border: 2px solid transparent;
          border-radius: 999px;
          background: linear-gradient(90deg,#22d3ee,#6366f1);
          background-clip: padding-box;
        }
          /* GOLDENE INSERAT-AI-UMRANDUNGEN FÜR DAS TOUR STUDIO */

.tourStudioPage section,
.tourStudioPage .tourHero,
.tourStudioPage .tourSidebar,
.tourStudioPage .tourPreviewCard,
.tourStudioPage .tourObjectCard,
.tourStudioPage .tourMaterialCard,
.tourStudioPage .tourOutputCard,
.tourStudioPage .tourSettingsCard,
.tourStudioPage .tourVoiceCard {
  border-color: rgba(251, 191, 36, 0.22) !important;
  box-shadow:
    0 0 0 1px rgba(251, 191, 36, 0.05),
    0 18px 38px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
}

/* Stärkere Goldwirkung für die grossen Hauptblöcke */
.tourStudioPage .tourHero,
.tourStudioPage .tourSidebar,
.tourStudioPage .tourObjectCard,
.tourStudioPage .tourPreviewCard,
.tourStudioPage .tourMaterialCard,
.tourStudioPage .tourOutputCard {
  border: 1px solid rgba(251, 191, 36, 0.24) !important;
  background:
    linear-gradient(
      145deg,
      rgba(17, 27, 58, 0.96),
      rgba(8, 17, 43, 0.96)
    ) !important;
}

/* Feine Lichtkante */
.tourStudioPage .tourHero::before,
.tourStudioPage .tourSidebar::before,
.tourStudioPage .tourObjectCard::before,
.tourStudioPage .tourPreviewCard::before,
.tourStudioPage .tourMaterialCard::before,
.tourStudioPage .tourOutputCard::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.08);
}

/* Labels und kleine Badges harmonisch gold/cyan */
.tourStudioPage .sectionLabel,
.tourStudioPage .tourBlockLabel {
  color: #fbbf24 !important;
}

/* Optional: leichte Goldkante bei kleineren inneren Boxen */
.tourStudioPage .tourVoiceOption,
.tourStudioPage .tourSceneDurationButton,
.tourStudioPage .tourRoomChip,
.tourStudioPage .tourControlButton {
  border-color: rgba(251, 191, 36, 0.18) !important;
}

/* Hover weiter hochwertig */
.tourStudioPage .tourVoiceOption:hover,
.tourStudioPage .tourSceneDurationButton:hover,
.tourStudioPage .tourControlButton:hover {
  border-color: rgba(251, 191, 36, 0.34) !important;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.08);
}
  /* FINAL – 6PX INSERAT-AI GOLD MIT TRANSPARENTEM LICHTAUSLAUF */

main > div.relative.mx-auto > section:first-of-type,
.tourLeftColumn,
.tourMobileObject > section,
.tourMobilePreview > section,
.tourMobileMaterial > section,
.tourScriptArea > section {
  border-width: 6px !important;
  border-style: solid !important;
  border-color: rgba(251, 191, 36, 0.62) !important;

  box-shadow:
    /* sehr helle innere Goldkante */
    0 0 0 1px rgba(255, 248, 205, 0.58),

    /* heller Goldschein direkt am Rahmen */
    0 0 9px rgba(251, 191, 36, 0.42),

    /* transparenter mittlerer Lichtauslauf */
    0 0 22px rgba(251, 191, 36, 0.22),

    /* weiter, weicher und fast transparenter Auslauf */
    0 0 46px rgba(251, 191, 36, 0.09),

    /* dezentes Licht nach innen */
    inset 0 0 15px rgba(251, 191, 36, 0.11),

    /* bestehender dunkler Tiefenschatten */
    0 26px 70px rgba(0, 0, 0, 0.3) !important;
}

/* Beim Darüberfahren etwas heller */

main > div.relative.mx-auto > section:first-of-type:hover,
.tourMobileObject > section:hover,
.tourMobilePreview > section:hover,
.tourMobileMaterial > section:hover,
.tourScriptArea > section:hover {
  border-color: rgba(255, 211, 84, 0.78) !important;

  box-shadow:
    0 0 0 1px rgba(255, 251, 225, 0.7),
    0 0 11px rgba(251, 191, 36, 0.52),
    0 0 28px rgba(251, 191, 36, 0.27),
    0 0 58px rgba(251, 191, 36, 0.11),
    inset 0 0 17px rgba(251, 191, 36, 0.13),
    0 28px 75px rgba(0, 0, 0, 0.32) !important;
}
      `}</style>

      <div className="mx-auto w-full max-w-[1540px]">
        <section className="mb-6 rounded-[2rem] border-2 border-amber-300/40 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                Inserat-AI Pro
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                {t("hero.titlePrefix")}{" "}
                <span className="text-cyan-300">
                  {t("hero.titleAccent")}
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                {t("hero.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/cockpit"
                className="rounded-xl border-2 border-amber-300/40 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.1]"
              >
                {t("common.backCockpit")}
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl bg-gradient-to-r from-cyan-300 to-indigo-500 px-5 py-3 text-sm font-black text-slate-950"
              >
                {t("common.dashboard")}
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
          <aside className="w-full xl:w-[360px] xl:shrink-0 xl:self-stretch">
            <section className="flex h-full flex-col overflow-hidden rounded-[2rem] border-2 border-amber-300/40 bg-gradient-to-b from-white/[0.07] to-white/[0.035] shadow-2xl">
              <div className="border-b border-amber-300/40 p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                  {t("controls.eyebrow")}
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {t("controls.title")}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {t("controls.description")}
                </p>
              </div>

              <div className="flex-1 space-y-5 p-6">
                <div className="rounded-2xl border-2 border-amber-300/40 bg-slate-950/35 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                    {t("controls.voiceEyebrow")}
                  </p>

                  <p className="mt-2 font-black text-white">
                    {t("controls.voiceTitle")}
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    {visibleVoiceOptions.map((voice) => {
                      const isSelected = selectedVoice === voice.id;

                      return (
                        <button
                          key={voice.id}
                          type="button"
                          onClick={() => setSelectedVoice(voice.id)}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            isSelected
                              ? "border-cyan-300 bg-cyan-300/10 ring-2 ring-cyan-300/10"
                              : "border-amber-300/40 bg-white/[0.05] hover:border-white/25 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span>
                              <span className="block text-sm font-black text-white">
                                {voice.name}
                              </span>
                              <span className="mt-1 block text-[11px] font-bold text-slate-400">
                                {voice.description}
                              </span>
                            </span>

                            <span
                              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-black ${
                                isSelected
                                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                                  : "border-amber-300/40 bg-white/[0.04] text-slate-500"
                              }`}
                            >
                              {isSelected ? "✓" : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllVoices((current) => !current)}
                    className="mt-3 w-full rounded-xl border-2 border-amber-300/40 bg-white/[0.035] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.07]"
                  >
                    {showAllVoices
                      ? t("controls.showLessVoices")
                      : t("controls.showMoreVoices")}
                  </button>
                </div>

                <div className="rounded-2xl border-2 border-amber-300/40 bg-slate-950/35 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                    {t("controls.settingsEyebrow")}
                  </p>

                  <p className="mt-2 text-sm font-black text-white">
                    {t("controls.durationTitle")}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[5, 8, 12].map((duration) => {
                      const isSelected = sceneDuration === duration;

                      return (
                        <button
                          key={duration}
                          type="button"
                          onClick={() => setSceneDuration(duration)}
                          className={`rounded-xl border px-2 py-3 text-center text-xs font-black transition ${
                            isSelected
                              ? "border-indigo-300 bg-indigo-400/15 text-indigo-100 ring-2 ring-indigo-400/10"
                              : "border-amber-300/40 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]"
                          }`}
                        >
                          {t("controls.secondsShort", {
                            seconds: duration,
                          })}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-2">
                    <div className="rounded-xl border-2 border-amber-300/40 bg-white/[0.04] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        {t("controls.voiceSummary")}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {selectedVoiceOption.name}
                      </p>
                    </div>

                    <div className="rounded-xl border-2 border-amber-300/40 bg-white/[0.04] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        {t("controls.speedSummary")}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {t("controls.secondsPerScene", {
                          seconds: sceneDuration,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-amber-300/40 p-6">
                <button
                  type="button"
                  onClick={() => void generateTourGuide()}
                  disabled={
                    isGeneratingTour || !listing || selectedRooms.length === 0
                  }
                  className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-indigo-500 px-5 py-4 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGeneratingTour
                    ? t("controls.createLoading")
                    : tourSections.length > 0
                      ? t("controls.recreate")
                      : t("controls.create")}
                </button>
              </div>
            </section>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
              <section className="flex self-stretch flex-col rounded-[2rem] border-2 border-amber-300/40 bg-white/[0.055] p-6 shadow-2xl lg:w-[42%] lg:shrink-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                  {t("objectCard.eyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {t("objectCard.title")}
                </h2>

                {loadingListing ? (
                  <div className="mt-6 grid flex-1 place-items-center rounded-2xl border-2 border-amber-300/40 bg-slate-950/35 p-8">
                    <p className="text-sm font-bold text-slate-400">
                      {t("objectCard.loading")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {objectValues.map((item) => (
                        <div key={item.label}>
                          <p className="mb-2 text-xs font-black text-slate-500">
                            {item.label}
                          </p>
                          <div className="min-h-12 rounded-xl border-2 border-amber-300/40 bg-slate-950/45 px-4 py-3 text-sm font-bold text-white">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <p className="mb-2 text-xs font-black text-slate-500">
                        {t("object.highlights")}
                      </p>
                      <div className="min-h-24 rounded-xl border-2 border-amber-300/40 bg-slate-950/45 px-4 py-3 text-sm leading-6 text-slate-300">
                        {listing?.highlights || "–"}
                      </div>
                    </div>

                    {listingError && (
                      <div className="mt-4 rounded-xl border-2 border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-bold leading-6 text-amber-200">
                        {listingError}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="flex min-w-0 flex-1 self-stretch flex-col rounded-[2rem] border-2 border-amber-300/55 bg-gradient-to-br from-[#081127] to-[#09091c] p-6 shadow-2xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                      {tourSections.length > 0
                        ? t("preview.eyebrowTour")
                        : t("preview.eyebrowPreview")}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {tourSections.length > 0
                        ? t("preview.titleTour")
                        : t("preview.titlePreview")}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border-2 border-amber-300/55 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-200">
                      {t("preview.sceneCount", {
                        count: listingImages.length,
                      })}
                    </span>
                    <button
  type="button"
  onClick={() => setPrivacyMode((current) => !current)}
  aria-pressed={privacyMode}
  className={`whitespace-nowrap rounded-full border-2 px-3 py-2 text-xs font-black transition ${
    privacyMode
      ? "border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
      : "border-amber-300/55 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20"
  }`}
>
  {privacyMode
    ? t("preview.privacyActive")
    : t("preview.privacy")}
</button>
                    {tourSections.length > 0 && (
                      <span className="rounded-full border-2 border-amber-300/40 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-300">
                        {selectedVoiceOption.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-[1.5rem] border-2 border-amber-300/40 bg-gradient-to-br from-slate-900 to-indigo-950">
                  {activeImage ? (
                    <img
                      key={`${activeImage.id}-${activeSceneIndex}`}
                      src={activeImage.url}
                      alt={t("preview.imageAlt", {
                        number: activeSceneIndex + 1,
                      })}
                      className={`h-full w-full object-cover ${
                        isTourPlaying ? "tourImagePlaying" : ""
                      }`}
                      style={
                        isTourPlaying
                          ? { animationDuration: `${sceneDuration}s` }
                          : undefined
                      }
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center p-8 text-center">
                      <div>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border-2 border-amber-300/55 bg-cyan-300/10 text-3xl">
                          🏠
                        </div>
                        <p className="mt-5 text-xl font-black">
                          {t("preview.emptyTitle")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {t("preview.emptyDescription")}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeImage && (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20" />

                      <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2 sm:left-5 sm:top-5">
                        <span className="rounded-full border-2 border-amber-300/45 bg-slate-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                          {t("preview.scenePosition", {
                            current: activeSceneIndex + 1,
                            total: listingImages.length,
                          })}
                        </span>
                        {isTourPlaying && (
                          <span className="rounded-full bg-red-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                            {t("preview.running")}
                          </span>
                        )}
                      </div>

                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                          {t("preview.propertyIn", {
                            propertyType:
                              listing?.propertyType ||
                              t("script.propertyFallback"),
                            location:
                              listing?.location ||
                              t("preview.locationFallback"),
                          })}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-white sm:text-3xl">
                          {activeTourSection?.title || t("preview.tourPreview")}
                        </h3>
                        <p className="mt-2 line-clamp-2 max-w-3xl text-xs leading-5 text-slate-200 sm:text-sm">
                          {activeTourSection?.audioText ||
                            t("preview.fallbackDescription")}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {tourSections.length > 0 && (
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-500 transition-all duration-500"
                      style={{
                        width:
                          listingImages.length > 0
                            ? `${((activeSceneIndex + 1) / listingImages.length) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                )}

                {generatedAudioUrl && (
                  <audio
                    ref={finishedTourAudioRef}
                    src={generatedAudioUrl}
                    preload="auto"
                    onPlay={() => setIsTourPlaying(true)}
                    onPause={() => setIsTourPlaying(false)}
                    onEnded={handleFinishedTourEnded}
                    className="hidden"
                  />
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={showPreviousScene}
                    disabled={listingImages.length <= 1}
                    className="rounded-xl border-2 border-amber-300/40 bg-white/[0.055] px-3 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {t("preview.previous")}
                  </button>

                  <button
                    type="button"
                    onClick={
                      tourSections.length > 0 && generatedAudioUrl
                        ? isTourPlaying
                          ? pauseFinishedTour
                          : () => void startFinishedTour()
                        : toggleTourPlayback
                    }
                    disabled={listingImages.length === 0}
                    className="rounded-xl bg-gradient-to-r from-cyan-300 to-indigo-500 px-3 py-3 text-xs font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {isTourPlaying
                      ? t("preview.pause")
                      : tourSections.length > 0
                        ? t("preview.startTour")
                        : t("preview.startPreview")}
                  </button>

                  <button
                    type="button"
                    onClick={
                      tourSections.length > 0 && generatedAudioUrl
                        ? stopFinishedTour
                        : stopTourPlayback
                    }
                    disabled={listingImages.length === 0}
                    className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-3 text-xs font-black text-red-100 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {t("preview.stop")}
                  </button>

                  <button
                    type="button"
                    onClick={showNextScene}
                    disabled={listingImages.length <= 1}
                    className="rounded-xl border-2 border-amber-300/40 bg-white/[0.055] px-3 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {t("preview.next")}
                  </button>
                </div>

                {listingImages.length > 0 && (
                  <div className="mt-4 border-t border-amber-300/40 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                        {t("preview.scenesLabel")}
                      </p>
                      <span className="text-[10px] font-bold text-slate-500">
                        {t("preview.scenesSource")}
                      </span>
                    </div>

                    <div className="tourSceneStrip flex max-w-full gap-3 overflow-x-auto pb-3">
                      {listingImages.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setActiveSceneIndex(index)}
                          className={`group relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl border transition sm:w-28 ${
                            activeSceneIndex === index
                              ? "border-cyan-300 ring-2 ring-cyan-300/20"
                              : "border-amber-300/40 hover:border-white/30"
                          }`}
                        >
                          <img
                            src={image.url}
                            alt={t("preview.sceneAlt", {
                              number: index + 1,
                            })}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-black text-white">
                            {index + 1}
                          </span>
                          {image.isPrimary && (
                            <span className="absolute bottom-2 right-2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black text-slate-950">
                              {t("preview.primary")}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tourAudioStatus === "loading" && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-amber-300/55 bg-cyan-300/10 px-4 py-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
                    <p className="text-xs font-bold text-cyan-100">
                      {t("preview.audioLoading")}
                    </p>
                  </div>
                )}

                {tourError && (
                  <div className="mt-4 rounded-xl border-2 border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-bold leading-6 text-amber-100">
                    {tourError}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-[2rem] border-2 border-amber-300/40 bg-white/[0.055] p-6 shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                {t("material.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {t("material.title")}
              </h2>

              <div className="mt-6 flex flex-col gap-5 lg:flex-row">
                <div className="rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.05] p-5 lg:w-[38%]">
                  <p className="font-black text-white">
                    {t("material.ownVideoTitle")}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {t("material.ownVideoDescription")}
                  </p>
                </div>

                <div className="min-w-0 flex-1 rounded-2xl border-2 border-amber-300/40 bg-slate-950/35 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">
                        {t("material.roomsTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {t("material.roomsDescription")}
                      </p>
                    </div>

                    <span className="rounded-full border-2 border-amber-300/55 bg-cyan-300/10 px-3 py-2 text-[10px] font-black text-cyan-200">
                      {t("material.selectedCount", {
                        count: selectedRooms.length,
                      })}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {roomOptions.map((room) => {
                      const isSelected = selectedRooms.includes(room);

                      return (
                        <button
                          key={room}
                          type="button"
                          onClick={() => toggleTourRoom(room)}
                          className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                            isSelected
                              ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-lg"
                              : "border-amber-300/40 bg-white/[0.05] text-slate-300 hover:border-white/25 hover:bg-white/[0.08]"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {getRoomLabel(room)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={customRoom}
                      onChange={(event) => setCustomRoom(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomTourRoom();
                        }
                      }}
                      placeholder={t("material.customRoomPlaceholder")}
                      className="min-w-0 flex-1 rounded-xl border-2 border-amber-300/40 bg-white/[0.045] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60"
                    />

                    <button
                      type="button"
                      onClick={addCustomTourRoom}
                      disabled={!customRoom.trim()}
                      className="rounded-xl border-2 border-amber-300/40 bg-white/[0.08] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.13] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {t("material.addRoom")}
                    </button>
                  </div>

                  {selectedRooms.length === 0 && (
                    <div className="mt-4 rounded-xl border-2 border-amber-300/40 bg-amber-300/10 px-4 py-3 text-xs font-bold leading-5 text-amber-100">
                      {t("material.selectAtLeast")}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section
          ref={productionRef}
          id="tour-production"
          className="mt-6 scroll-mt-24 rounded-[2rem] border-2 border-amber-300/40 bg-white/[0.055] p-6 shadow-2xl sm:p-8"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                {t("production.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {t("production.title")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {t("production.description")}
              </p>
            </div>

            {generatedAudioUrl && (
              <a
                href={generatedAudioUrl}
                download="inserat-ai-tour-stimme.mp3"
                className="rounded-xl border-2 border-amber-300/55 bg-cyan-300/10 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20"
              >
                {t("production.download")}
              </a>
            )}
          </div>

          {tourSections.length === 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                t("production.steps.checkObject"),
                t("production.steps.choose"),
                t("production.steps.create"),
              ].map((title, index) => (
                <div
                  key={title}
                  className="rounded-2xl border-2 border-amber-300/40 bg-slate-950/35 p-5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-xs font-black text-cyan-200">
                    {index + 1}
                  </span>
                  <p className="mt-4 font-black text-white">{title}</p>
                </div>
              ))}
            </div>
          ) : (
            <details className="mt-6 overflow-hidden rounded-2xl border-2 border-amber-300/40 bg-slate-950/35">
              <summary className="cursor-pointer px-5 py-4 text-sm font-black text-slate-300 transition hover:bg-white/[0.04]">
                {t("production.summary")}
              </summary>

              <div className="max-h-[460px] space-y-3 overflow-y-auto border-t border-amber-300/40 p-4 sm:p-5">
                {tourSections.map((section, index) => (
                  <div
                    key={`${section.room}-compact-${index}`}
                    className="rounded-xl border-2 border-amber-300/40 bg-white/[0.035] p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
                      {String(index + 1).padStart(2, "0")} · {section.room}
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {section.title}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-slate-400">
                      {section.audioText}
                    </p>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => void copyFullTour()}
                  className="w-full rounded-xl border-2 border-amber-300/40 bg-white/[0.06] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.1]"
                >
                  {t("production.copyAll")}
                </button>

                {copyStatus && (
                  <p
                    className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-center text-xs font-black text-emerald-100"
                    role="status"
                  >
                    {copyStatus}
                  </p>
                )}
              </div>
            </details>
          )}
        </section>
      </div>
    </main>
  );
}



