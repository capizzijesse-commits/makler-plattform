"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";

type TourSection = {
  room: string;
  title: string;
  audioText: string;
  videoText: string;
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
};

const DEFAULT_ROOMS = [
  "Eingang",
  "Wohnzimmer",
  "Küche",
  "Schlafzimmer",
  "Badezimmer",
  "Balkon / Terrasse",
];

export default function TourGuidePage() {
  const [location, setLocation] = useState("Winterthur");
  const [propertyType, setPropertyType] = useState("Wohnung");
  const [rooms, setRooms] = useState("4.5");
  const [livingArea, setLivingArea] = useState("112");
  const [price, setPrice] = useState("1'450'000");
  const [styleText, setStyleText] = useState("hochwertig, modern und einladend");
  const [highlights, setHighlights] = useState(
    "Balkon, offene Küche, Parkettboden, ruhige Lage"
  );

  const [selectedRooms, setSelectedRooms] = useState<string[]>(DEFAULT_ROOMS);
  const [customRoom, setCustomRoom] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");

  const [tourSections, setTourSections] = useState<TourSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessStatus, setAccessStatus] = useState<
  "checking" | "allowed" | "blocked"
>("checking");
useEffect(() => {
  let cancelled = false;

  async function checkAccess() {
    try {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = (await response.json()) as SessionResponse;

      if (cancelled) return;

      const hasAccess =
        data.authenticated === true &&
        data.user?.capabilities?.canUseTourGuide === true;

      setAccessStatus(hasAccess ? "allowed" : "blocked");
    } catch (error) {
      console.error("TOUR GUIDE ACCESS ERROR:", error);

      if (!cancelled) {
        setAccessStatus("blocked");
      }
    }
  }

  void checkAccess();

  return () => {
    cancelled = true;
  };
}, []);
  useEffect(() => {
    const savedDraft = localStorage.getItem("inseratAiSocialDraft");

    if (!savedDraft) return;

    try {
      const data = JSON.parse(savedDraft);

      if (typeof data.location === "string") setLocation(data.location);
      if (typeof data.propertyType === "string") setPropertyType(data.propertyType);
      if (typeof data.rooms === "string") setRooms(data.rooms);
      if (typeof data.livingArea === "string") setLivingArea(data.livingArea);
      if (typeof data.price === "string") setPrice(data.price);
      if (typeof data.highlights === "string") setHighlights(data.highlights);
      if (typeof data.styleText === "string") setStyleText(data.styleText);
    } catch {
      console.log("Keine gespeicherten Objektdaten gefunden.");
    }
  }, []);

  const highlightList = useMemo(() => {
    return highlights
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [highlights]);
  

  function toggleRoom(room: string) {
    setSelectedRooms((current) =>
      current.includes(room)
        ? current.filter((item) => item !== room)
        : [...current, room]
    );
  }

  function addCustomRoom() {
    const room = customRoom.trim();

    if (!room) return;
    if (selectedRooms.includes(room)) return;

    setSelectedRooms((current) => [...current, room]);
    setCustomRoom("");
  }

  function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  function getVideoInstruction(room: string) {
    const lowerRoom = room.toLowerCase();

    if (lowerRoom.includes("eingang")) {
      return "Beginne mit einer ruhigen Aufnahme der Eingangssituation. Zeige kurz den ersten Eindruck, den Übergang in die Wohnung und führe langsam in den nächsten Raum.";
    }

    if (lowerRoom.includes("wohn")) {
      return "Schwenke langsam vom Eingang des Wohnzimmers Richtung Fenster. Zeige danach Details wie Boden, Licht, Raumtiefe und den Übergang zu Balkon oder Essbereich.";
    }

    if (lowerRoom.includes("küche") || lowerRoom.includes("kueche")) {
      return "Zeige zuerst die gesamte Küche. Danach langsam über Arbeitsfläche, Geräte, Stauraum und Verbindung zum Wohnbereich filmen.";
    }

    if (lowerRoom.includes("schlaf")) {
      return "Filme ruhig vom Eingang Richtung Fenster. Zeige Stellfläche, Licht und die Rückzugsatmosphäre dieses Raumes.";
    }

    if (lowerRoom.includes("bad")) {
      return "Zeige zuerst das Badezimmer als Ganzes. Danach Details wie Dusche, Badewanne, Armaturen, Platten oder Tageslicht aufnehmen.";
    }

    if (
      lowerRoom.includes("balkon") ||
      lowerRoom.includes("terrasse") ||
      lowerRoom.includes("garten")
    ) {
      return "Filme den Weg von innen nach aussen. Zeige die nutzbare Fläche, Privatsphäre, Aussicht und mögliche Möblierung.";
    }

    return "Beginne mit einer ruhigen Gesamtaufnahme. Danach die wichtigsten Details aus zwei Perspektiven zeigen.";
  }

  function generateTourGuide() {
    setLoading(true);

    setTimeout(() => {
      const intro: TourSection = {
        room: "Begrüssung",
        title: `Willkommen zur Besichtigung in ${location}`,
        audioText: `Willkommen in dieser ${rooms}-Zimmer-${propertyType} in ${location}. Diese digitale Besichtigung führt Sie Schritt für Schritt durch das Objekt. Achten Sie besonders auf ${
          highlightList.slice(0, 3).join(", ") ||
          "die wichtigsten Eigenschaften dieser Immobilie"
        }. Nehmen Sie sich Zeit und erleben Sie die Räume in Ruhe.${
          videoFile
            ? " Zusätzlich wurde ein Video-Rundgang hochgeladen. Das Drehbuch ist deshalb auch als Video-Szenenplan für Makleraufnahmen vorbereitet."
            : ""
        }`,
        videoText:
          "Video-Intro: Starte mit einer ruhigen Aussenaufnahme oder dem Eingang. Danach kurz das Gebäude, den Zugang oder den ersten Eindruck zeigen. Die Aufnahme sollte hochwertig, ruhig und professionell wirken.",
      };

     const roomSections: TourSection[] = selectedRooms.map((room, index) => {
  const roomHighlight =
    highlightList[index % Math.max(highlightList.length, 1)] ||
    "die angenehme Raumwirkung";

  return {
    room,
    title: `${room} erleben`,
    audioText: `Sie befinden sich jetzt im Bereich ${room}. Dieser Teil der Immobilie unterstreicht den ${styleText}en Charakter des Objekts. Besonders hervorzuheben ist ${roomHighlight}. Die Wohnfläche von ca. ${livingArea} m² bietet eine gute Grundlage für komfortables Wohnen. Achten Sie beim Rundgang auf Atmosphäre, Lichtverhältnisse und Nutzungsmöglichkeiten.`,
    videoText: `Video-Szene: ${getVideoInstruction(room)}`,
  };
});
if (accessStatus === "checking") {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-orange-700 px-6 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-amber-400" />

        <h1 className="mt-6 text-2xl font-black">
          Zugang wird geprüft
        </h1>

        <p className="mt-3 text-slate-300">
          Inserat-AI lädt deine Pro-Berechtigungen.
        </p>
      </div>
    </main>
  );
}

if (accessStatus === "blocked") {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-orange-700 px-6 py-12 text-white">
      <div className="w-full max-w-2xl rounded-[2rem] border border-amber-400/30 bg-slate-950/70 p-8 text-center shadow-2xl backdrop-blur sm:p-12">
        <div className="text-5xl">🎬</div>

        <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-amber-300">
          Inserat-AI Pro
        </p>

        <h1 className="mt-4 text-3xl font-black sm:text-5xl">
          Virtual Tour Studio
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Das Audio- und Video-Drehbuch für digitale Immobilienbesichtigungen
          ist im Pro-Plan für 79.90 CHF pro Monat enthalten.
        </p>

        <div className="mt-8 grid gap-3 text-left text-slate-200 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            ✓ Raum-für-Raum Audio-Guide
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            ✓ Professioneller Video-Szenenplan
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            ✓ Objektbezogene Tour-Texte
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            ✓ Vollständiges Makler-Cockpit
          </div>
        </div>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-4 font-black text-slate-950 shadow-xl transition hover:scale-[1.02]"
          >
            Pro für 79.90 CHF ansehen
          </Link>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/15 bg-white/[0.06] px-7 py-4 font-bold text-white"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
       

      const outro: TourSection = {
        room: "Abschluss",
        title: "Ihr nächster Schritt",
        audioText: `Damit endet die digitale Besichtigung dieser ${propertyType} in ${location}. Wenn Sie sich vorstellen können, hier zu wohnen oder das Objekt näher prüfen möchten, empfehlen wir eine persönliche Besichtigung oder ein Gespräch mit dem zuständigen Makler. Preisangabe: ${
          price || "auf Anfrage"
        }.`,
        videoText:
          "Video-Abschluss: Zeige nochmals den stärksten Bereich der Immobilie, zum Beispiel Wohnzimmer, Aussicht, Terrasse oder Eingang. Danach mit einer ruhigen Schlussaufnahme enden.",
      };

      setTourSections([intro, ...roomSections, outro]);
      setLoading(false);
    }, 700);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Text wurde kopiert.");
  }

  async function copyFullTour() {
    const fullText = tourSections
      .map(
        (section) =>
          `${section.title}\n\nAudio-Text:\n${section.audioText}\n\nVideo-Drehbuch:\n${section.videoText}`
      )
      .join("\n\n---\n\n");

    await navigator.clipboard.writeText(fullText);
    alert("Komplettes Drehbuch wurde kopiert.");
  }

  function playAudio(text: string) {
    if (typeof window === "undefined") return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-CH";
    utterance.rate = 0.92;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-orange-700 text-white">
      <section className="relative px-6 py-8">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute left-0 top-1/3 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <header className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-slate-950/45 px-5 py-3 shadow-2xl backdrop-blur">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🏠</span>
              <span className="font-black tracking-tight text-white">
                Inserat-AI
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-300">
              <Link
                href="/dashboard"
                className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/social-media"
                className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
              >
                Social Media
              </Link>
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-cyan-200">
                Virtual Tour
              </span>
            </nav>
          </header>

          <section className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">
                Inserat-AI Pro
              </p>

              <h1 className="mt-6 max-w-4xl text-5xl font-light leading-tight tracking-tight text-white md:text-7xl">
                Virtual Tour Studio für Immobilien.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
                Erstelle aus Objektdaten, Räumen und Videos ein professionelles
                Audio- und Video-Drehbuch für digitale Besichtigungen.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                  Audio-Guide
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                  Video-Szenenplan
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                  Raum-für-Raum Tour
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200">
                  Pro-Feature
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[440px]">
              <div className="absolute -inset-6 rounded-[3rem] bg-cyan-400/20 blur-3xl" />

              <div className="relative rounded-[2.5rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl backdrop-blur">
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-cyan-300">
                        Käufer-Tour
                      </p>
                      <p className="text-sm text-slate-400">
                        QR-Code & Smartphone
                      </p>
                    </div>

                    <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                      Live
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white">
                    <div className="h-44 bg-gradient-to-br from-slate-200 via-cyan-100 to-amber-100" />

                    <div className="p-5 text-slate-950">
                      <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
                        Aktueller Raum
                      </p>

                      <h3 className="mt-2 text-xl font-black">
                        Wohnzimmer
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        „Achten Sie auf das natürliche Licht, den offenen
                        Grundriss und die hochwertige Raumwirkung.“
                      </p>

                      <div className="mt-5 flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-cyan-300 text-slate-950">
                          ▶
                        </div>
                        <div className="h-2 flex-1 rounded-full bg-slate-200">
                          <div className="h-full w-2/3 rounded-full bg-cyan-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                      <p className="text-lg font-black">QR</p>
                      <p className="text-xs text-slate-400">Scan</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                      <p className="text-lg font-black">Audio</p>
                      <p className="text-xs text-slate-400">Guide</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                      <p className="text-lg font-black">Video</p>
                      <p className="text-xs text-slate-400">Script</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur">
              <div className="mb-7">
                <p className="text-sm font-black uppercase tracking-wide text-cyan-300">
                  Eingabe
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Objekt & Tour-Daten
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Erfasse die wichtigsten Angaben und lade optional ein Video
                  hoch. Daraus entsteht ein Audio- und Video-Drehbuch.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ort / Lage" value={location} onChange={setLocation} />
                <Field label="Objektart" value={propertyType} onChange={setPropertyType} />
                <Field label="Zimmer" value={rooms} onChange={setRooms} />
                <Field label="Wohnfläche m²" value={livingArea} onChange={setLivingArea} />
                <Field label="Preis" value={price} onChange={setPrice} />
                <Field label="Stil" value={styleText} onChange={setStyleText} />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Highlights
                </label>
                <input
                  value={highlights}
                  onChange={(event) => setHighlights(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
                <div className="mb-4">
                  <p className="text-sm font-black uppercase tracking-wide text-cyan-300">
                    🎥 Video / Rundgang hochladen
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Lade ein Handyvideo, einen Rundgang oder eine kurze
                    Objektaufnahme hoch. Die Vorschau bleibt lokal im Browser.
                  </p>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-300/35 bg-slate-950/40 px-6 py-8 text-center transition hover:border-cyan-300 hover:bg-cyan-300/10">
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />

                  <span className="text-4xl">🎬</span>

                  <strong className="mt-3 text-lg font-black text-white">
                    Video auswählen
                  </strong>

                  <span className="mt-2 text-sm text-slate-400">
                    MP4, MOV oder iPhone-Video
                  </span>
                </label>

                {videoFile && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {videoFile.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Video bereit für das Drehbuch
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        Hochgeladen
                      </span>
                    </div>

                    {videoPreview && (
                      <video
                        src={videoPreview}
                        controls
                        className="max-h-[240px] w-full rounded-2xl border border-white/10 bg-black"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <label className="mb-3 block text-sm font-bold text-slate-200">
                  Räume für die Besichtigung
                </label>

                <div className="flex flex-wrap gap-2">
                  {DEFAULT_ROOMS.map((room) => (
                    <button
                      key={room}
                      type="button"
                      onClick={() => toggleRoom(room)}
                      className={
                        selectedRooms.includes(room)
                          ? "rounded-full border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950"
                          : "rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-300"
                      }
                    >
                      {room}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex gap-3">
                  <input
                    value={customRoom}
                    onChange={(event) => setCustomRoom(event.target.value)}
                    placeholder="Eigener Raum, z.B. Hobbyraum"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                  />

                  <button
                    type="button"
                    onClick={addCustomRoom}
                    className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={generateTourGuide}
                disabled={loading}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 px-8 py-4 font-black text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Audio- & Video-Drehbuch wird erstellt..."
                  : "🎧 Audio- & Video-Drehbuch erstellen"}
              </button>
            </div>

            <div className="rounded-[2rem] border border-cyan-300/25 bg-cyan-50 p-6 text-slate-950 shadow-2xl">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-cyan-700">
                    Ausgabe
                  </p>
                  <h2 className="mt-2 text-3xl font-black">
                    Audio- & Video-Drehbuch
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-cyan-900">
                    Erhalte einen Audio-Guide und ein Video-Drehbuch für die
                    Besichtigung.
                  </p>
                </div>

                {tourSections.length > 0 && (
                  <button
                    type="button"
                    onClick={copyFullTour}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
                  >
                    Komplett kopieren
                  </button>
                )}
              </div>

              {tourSections.length === 0 ? (
                <div className="grid gap-5 md:grid-cols-3">
                  <EmptyTourCard
                    title="1. Objekt erfassen"
                    text="Daten und Räume links eingeben."
                  />
                  <EmptyTourCard
                    title="2. Video optional"
                    text="Rundgang hochladen oder nur mit Daten arbeiten."
                  />
                  <EmptyTourCard
                    title="3. Drehbuch"
                    text="Audio- und Video-Skript generieren."
                  />
                </div>
              ) : (
                <div className="grid max-h-[740px] gap-5 overflow-y-auto pr-2">
                  {tourSections.map((section, index) => (
                    <div
                      key={`${section.room}-${index}`}
                      className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
                            {String(index + 1).padStart(2, "0")} · {section.room}
                          </p>
                          <h3 className="mt-1 text-xl font-black">
                            {section.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => playAudio(section.audioText)}
                            className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-black text-cyan-900 transition hover:bg-cyan-200"
                          >
                            ▶ Audio
                          </button>

                          <button
                            type="button"
                            onClick={() => copyText(section.audioText)}
                            className="rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm font-black text-cyan-900 transition hover:bg-cyan-50"
                          >
                            Kopieren
                          </button>
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap text-base leading-8 text-slate-700">
                        {section.audioText}
                      </p>

                      <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
                          🎥 Video-Drehbuch
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {section.videoText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-200">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
      />
    </div>
  );
}

function EmptyTourCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-cyan-200 bg-white p-5">
      <div className="h-28 rounded-2xl bg-gradient-to-br from-cyan-100 to-slate-100" />
      <p className="mt-4 font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}