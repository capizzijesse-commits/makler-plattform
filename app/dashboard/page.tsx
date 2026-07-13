"use client";
import Link from "next/link";
import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type ChangeEvent,
} from "react";
import PortalExportButton from "../components/PortalExportButton";
import {
  SWISS_LOCATIONS,
  SWISS_POSTAL_LOCATIONS,
} from "@/lib/swissLocations";
type Variant = {
  title: string;
  text: string;
  highlights?: string[];
  cta?: string;
  instagramPost?: string;
  linkedinPost?: string;
  facebookPost?: string;
};
type ObjectTemplate = {
  id: string;
  name: string;
  location: string;
  postalCode?: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  styleText: string;
  highlights: string;
};
const EXTRA_HIGHLIGHT_SUGGESTIONS = [
  "Balkon",
  "Terrasse",
  "Garten",
  "Sitzplatz",
  "Garage",
  "Tiefgarage",
  "Aussenparkplatz",
  "Lift",
  "Keller",
  "Reduit",
  "Cheminée",
  "Seesicht",
  "Bergsicht",
  "Ruhige Lage",
  "Zentrale Lage",
  "Bahnhof in der Nähe",
  "Bushaltestelle in der Nähe",
  "Schule in der Nähe",
  "Kindergarten in der Nähe",
  "Einkaufsmöglichkeiten in der Nähe",
  "Kinderfreundlich",
  "Haustiere erlaubt",
  "Rollstuhlgängig",
  "Minergie-Standard",
  "Neuwertig",
  "Renoviert",
  
];
const QUICK_PROPERTY_TYPES = [
  "Wohnung",
  "Haus",
  "Einfamilienhaus",
  "Mehrfamilienhaus",
  "Attikawohnung",
  "Maisonette",
  "Doppeleinfamilienhaus",
  "Reihenhaus",
  "Villa",
  "Bauland",
  "Gewerbe",
];

const QUICK_ROOMS = ["1.5", "2.5", "3.5", "4.5", "5.5", "6.5"];

const QUICK_LIVING_AREAS = ["60", "80", "100", "120", "150", "180", "200", "250"];

const QUICK_STYLES = [
  "modern",
  "hochwertig",
  "luxuriös",
  "familienfreundlich",
  "ruhig",
  "zentral",
  "hell",
  "renoviert",
  "neuwertig",
];

export default function DashboardPage() {
  
  const [instagramPost, setInstagramPost] = useState("");
  const [linkedinPost, setLinkedinPost] = useState("");
  const [facebookPost, setFacebookPost] = useState("");
 

const [imageAnalysis, setImageAnalysis] = useState("");
const [analyzingImage, setAnalyzingImage] = useState(false);
const [userName, setUserName] = useState(""); useEffect(() => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
const loginExpiresAt = Number(localStorage.getItem("loginExpiresAt"));

if (!isLoggedIn || !loginExpiresAt || Date.now() > loginExpiresAt) {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("loginExpiresAt");

  window.location.href = "/login";
  return;
}
const nextLoginExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
localStorage.setItem("loginExpiresAt", nextLoginExpiresAt.toString());
 
  const savedName = localStorage.getItem("userName");
  if (savedName) {
    setUserName(savedName);
  }
}, []);

async function analyzeImage() {
  let imageForAnalysis: File | null = selectedImages[0] || null;

  // Falls nur noch eine Vorschau vorhanden ist,
  // versuchen wir daraus wieder eine Bilddatei zu erstellen.
  if (!imageForAnalysis && imagePreviews[0]) {
    try {
      const previewResponse = await fetch(imagePreviews[0]);
      const imageBlob = await previewResponse.blob();

      imageForAnalysis = new File(
        [imageBlob],
        "objektfoto.jpg",
        {
          type: imageBlob.type || "image/jpeg",
        }
      );
    } catch (error) {
      console.error("PREVIEW CONVERSION ERROR:", error);
    }
  }

  if (!imageForAnalysis) {
    alert(
      "Das Bild ist nur noch als alte Vorschau vorhanden. Bitte das Foto nochmals auswählen."
    );
    return;
  }

  try {
    setAnalyzingImage(true);
    setImageAnalysis("");

    const formData = new FormData();
    formData.append("image", imageForAnalysis);

    const response = await fetch("/api/analyze-image", {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();

    let data: {
      success?: boolean;
      analysis?: string;
      error?: string;
    };

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(
        responseText ||
          "Die Bildanalyse hat keine gültige Antwort geliefert."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          `Bildanalyse fehlgeschlagen – HTTP ${response.status}`
      );
    }

    if (!data.analysis?.trim()) {
      throw new Error("Es wurde keine Bildanalyse zurückgegeben.");
    }

    setImageAnalysis(data.analysis);

    localStorage.setItem(
      "inseratAiImageAnalysis",
      data.analysis
    );
  } catch (error) {
    console.error("IMAGE ANALYSIS ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Fehler bei der Bildanalyse.";

    alert(message);
  } finally {
    setAnalyzingImage(false);
  }
}

const [location, setLocation] = useState("");
const [propertyType, setPropertyType] = useState("");
const [rooms, setRooms] = useState("");
const [livingArea, setLivingArea] = useState("");
const [price, setPrice] = useState("");
const [styleText, setStyleText] = useState("");
const [highlights, setHighlights] = useState("");
const [selectedImages, setSelectedImages] = useState<File[]>([]);
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
const [formLoaded, setFormLoaded] = useState(false);
const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
const [templateName, setTemplateName] = useState("");
const [objectTemplates, setObjectTemplates] = useState<ObjectTemplate[]>([]);
const [postalCode, setPostalCode] = useState("");
const [showPostalSuggestions, setShowPostalSuggestions] = useState(false);
const [showExtraHighlights, setShowExtraHighlights] = useState(false);
const highlightsInputRef = useRef<HTMLInputElement>(null);
const getFormStorageKey = () => {
  const email = localStorage.getItem("userEmail") || "guest";
  return `inseratAiDashboardForm_${email}`;
};

const getLocationSuggestionsKey = () => {
  const email = localStorage.getItem("userEmail") || "guest";
  return `inseratAiLocationSuggestions_${email}`;
};
const getObjectTemplatesKey = () => {
  const email = localStorage.getItem("userEmail") || "guest";
  return `inseratAiObjectTemplates_${email}`;
};

useEffect(() => {
  const savedForm = localStorage.getItem(getFormStorageKey());

  if (!savedForm) {
    setFormLoaded(true);
    return;
  }

  try {
    const data = JSON.parse(savedForm);

    setLocation(data.location || "");
    setPropertyType(data.propertyType || "");
    setRooms(data.rooms || "");
    setLivingArea(data.livingArea || "");
    setPrice(data.price || "");
    setStyleText(data.styleText || "");
    setHighlights(data.highlights || "");
    setPostalCode(data.postalCode || "");
  } catch {
    localStorage.removeItem(getFormStorageKey());
  } finally {
    setFormLoaded(true);
  }
}, []);

useEffect(() => {
  if (!formLoaded) return;

  const formData = {
  location,
  postalCode,
  propertyType,
  rooms,
  livingArea,
  price,
  styleText,
  highlights,
};

  localStorage.setItem(getFormStorageKey(), JSON.stringify(formData));
}, [
  formLoaded,
location,
postalCode,
propertyType,
  rooms,
  livingArea,
  price,
  styleText,
  highlights,
]);
useEffect(() => {
  const savedSuggestions = localStorage.getItem(getLocationSuggestionsKey());

  if (!savedSuggestions) return;

  try {
    const data = JSON.parse(savedSuggestions);

    if (Array.isArray(data)) {
      setLocationSuggestions(data);
    }
  } catch {
    localStorage.removeItem(getLocationSuggestionsKey());
  }
}, []);

const saveLocationSuggestion = (value: string) => {
  const cleanValue = value.trim();

  if (cleanValue.length < 2) return;

  setLocationSuggestions((currentSuggestions) => {
    const nextSuggestions = [
      cleanValue,
      ...currentSuggestions.filter(
        (item) => item.toLowerCase() !== cleanValue.toLowerCase()
      ),
    ].slice(0, 8);

    localStorage.setItem(
      getLocationSuggestionsKey(),
      JSON.stringify(nextSuggestions)
    );

    return nextSuggestions;
  });
};
useEffect(() => {
  const savedTemplates = localStorage.getItem(getObjectTemplatesKey());

  if (!savedTemplates) return;

  try {
    const data = JSON.parse(savedTemplates);

    if (Array.isArray(data)) {
      setObjectTemplates(data);
    }
  } catch {
    localStorage.removeItem(getObjectTemplatesKey());
  }
}, []);

const saveObjectTemplate = () => {
  const cleanName =
    templateName.trim() ||
    `${propertyType || "Objekt"} ${location || "ohne Ort"}`.trim();

  const newTemplate: ObjectTemplate = {
  id: crypto.randomUUID(),
  name: cleanName,
  location,
  postalCode,
  propertyType,
  rooms,
  livingArea,
  price,
  styleText,
  highlights,
};

  setObjectTemplates((currentTemplates) => {
    const nextTemplates = [
      newTemplate,
      ...currentTemplates.filter(
        (template) => template.name.toLowerCase() !== cleanName.toLowerCase()
      ),
    ].slice(0, 12);

    localStorage.setItem(
      getObjectTemplatesKey(),
      JSON.stringify(nextTemplates)
    );

    return nextTemplates;
  });

  setTemplateName("");
};
const saveListingPermanently = async () => {
  const userEmail =
    localStorage.getItem("userEmail")?.trim().toLowerCase() || "";

  if (!userEmail) {
    window.alert("Bitte zuerst einloggen.");
    return;
  }

  if (!location.trim() || !propertyType.trim()) {
    window.alert("Bitte mindestens Ort und Objektart ausfüllen.");
    return;
  }

  try {
    setSavingListing(true);

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userEmail,
        location,
        postalCode,
        propertyType,
        rooms,
        livingArea,
        price,
        highlights,
        style: styleText,
        generatedVariants: variants,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Das Objekt konnte nicht gespeichert werden."
      );
    }

    window.alert("Objekt wurde dauerhaft gespeichert.");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Das Objekt konnte nicht gespeichert werden.";

    window.alert(message);
  } finally {
    setSavingListing(false);
  }
};
const loadObjectTemplate = (template: ObjectTemplate) => {
  setLocation(template.location);
  setPostalCode(template.postalCode || "");
  setPropertyType(template.propertyType);
  setRooms(template.rooms);
  setLivingArea(template.livingArea);
  setPrice(template.price);
  setStyleText(template.styleText);
  setHighlights(template.highlights);
  setShowExtraHighlights(true);
};
const addSuggestedHighlight = (value: string) => {
  
  const cleanValue = value.trim();

  if (!cleanValue) return;

  setHighlights((currentValue) => {
    const currentHighlights = currentValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const alreadyExists = currentHighlights.some(
      (item) => item.toLowerCase() === cleanValue.toLowerCase()
    );

    if (alreadyExists) return currentValue;

    return [...currentHighlights, cleanValue].join(", ");
  });

  setTimeout(() => {
    highlightsInputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    highlightsInputRef.current?.focus();
  }, 50);
};
const quickButtonStyle = {
  border: "1px solid rgba(245, 158, 11, 0.35)",
  background: "rgba(245, 158, 11, 0.10)",
  color: "#fbbf24",
  borderRadius: "999px",
  padding: "8px 11px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "0.82rem",
} as const;
const deleteObjectTemplate = (templateId: string) => {
  setObjectTemplates((currentTemplates) => {
    const nextTemplates = currentTemplates.filter(
      (template) => template.id !== templateId
    );

    localStorage.setItem(
      getObjectTemplatesKey(),
      JSON.stringify(nextTemplates)
    );

    return nextTemplates;
  });
};
const clearForm = () => {
  setLocation("");
  setPropertyType("");
  setRooms("");
  setLivingArea("");
  setPrice("");
  setStyleText("");
  setHighlights("");
  setVariants([]);
  setActiveIndex(0);
  setInstagramPost("");
  setLinkedinPost("");
  setFacebookPost("");
  setSocialPosts({});
  setTemplateName("");
  setPostalCode("");
  setShowExtraHighlights(false);
};
const allLocationSuggestions: string[] = Array.from(
  new Set([...locationSuggestions, ...SWISS_LOCATIONS])
);

const filteredLocationSuggestions: string[] =
  location.trim().length > 0
    ? allLocationSuggestions
        .filter(
          (suggestion: string) =>
            suggestion.toLowerCase().startsWith(location.toLowerCase()) &&
            suggestion.toLowerCase() !== location.toLowerCase()
        )
        .slice(0, 5)
    : [];
const filteredPostalLocationSuggestions =
  location.trim().length > 0 || postalCode.trim().length > 0
    ? SWISS_POSTAL_LOCATIONS.filter((item) => {
        const searchValue = `${item.zip} ${item.name} ${item.canton}`.toLowerCase();
        const locationValue = location.toLowerCase().trim();
        const postalValue = postalCode.toLowerCase().trim();

        return (
          searchValue.includes(locationValue) &&
          item.zip.startsWith(postalValue)
        );
      }).slice(0, 8)
    : [];

const [socialLoading, setSocialLoading] = useState(false);

const [socialPosts, setSocialPosts] = useState<{
  instagramPost?: string;
  linkedinPost?: string;
  facebookPost?: string;
}>({});

const [loading, setLoading] = useState(false);
const [variants, setVariants] = useState<Variant[]>([]);
const [savingListing, setSavingListing] = useState(false);
const [dailyCount, setDailyCount] = useState(0);
const [trialExpired, setTrialExpired] = useState(false);
const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
const [activeIndex, setActiveIndex] = useState(0);

useEffect(() => {
  const trialEndDate = localStorage.getItem("trialEndDate");

  if (!trialEndDate) {
    setTrialExpired(false);
    setTrialDaysLeft(null);
    return;
  }

  const now = new Date();
  const end = new Date(trialEndDate);

  if (now > end) {
    setTrialExpired(true);
    localStorage.setItem("trialStatus", "expired");
    setTrialDaysLeft(0);
    return;
  }

  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  setTrialExpired(false);
  setTrialDaysLeft(diffDays);
}, []);
  const current = variants[activeIndex];
  const getTodayKey = () => {
  const email = localStorage.getItem("userEmail") || "guest";
  const today = new Date().toISOString().slice(0, 10);
  return `inseratAiDailyCount_${email}_${today}`;
};

const formatSavedTime = (count: number) => {
  const totalMinutes = count * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} Std. ${minutes} Min.`;
  }

  if (hours > 0) {
    return `${hours} Std.`;
  }

  return `${totalMinutes} Min.`;
};

  async function generateText() {
    if (trialExpired) {
  alert("Ihr 30-Tage-Test ist abgelaufen. Bitte aktivieren Sie Ihr Abo, um weiterhin Inserate zu erstellen.");
  return;
}
    
    try {
      setLoading(true);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  location,
  rooms,
  livingArea,
  price,
  propertyType,
  highlights,
  styleText,
  imageAnalysis,
  email: localStorage.getItem("userEmail"),
  
}),
      });

      const data = await response.json();
      console.log("GENERATE RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data?.error || "Fehler beim Generieren");
      }

      const newVariants = Array.isArray(data?.variants) ? data.variants : [];

      if (!newVariants.length) {
        throw new Error("Keine Varianten erhalten");
      }

      setVariants(newVariants);
      setActiveIndex(0);
     setInstagramPost(data?.social?.instagram || "");
setLinkedinPost(data?.social?.linkedin || "");
setFacebookPost(data?.social?.facebook || "");
const newDailyCount = dailyCount + 1;
setDailyCount(newDailyCount);
localStorage.setItem(getTodayKey(), String(newDailyCount));
    } catch (error) {
  console.error("FRONTEND GENERATE ERROR:", error);

  const message =
    error instanceof Error ? error.message : "Fehler beim Generieren.";

  alert(message);
} finally {
  setLoading(false);
}
  }

  async function copyActive() {
  if (!variants || variants.length === 0) {
    alert("Bitte zuerst eine Variante generieren.");
    return;
  }

  const active = variants[activeIndex];

  if (!active) {
    alert("Keine Variante gefunden.");
    return;
  }

  const fullText = `${active.title}\n\n${active.text}`;

  try {
    await navigator.clipboard.writeText(fullText);
    alert("Kopiert ✅");
  } catch (err) {
    console.error(err);
    alert("Kopieren fehlgeschlagen ❌");
  }
}
  function exportPdf() {
    if (!current) {
      alert("Bitte zuerst eine Variante generieren.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      alert("Pop-up blockiert. Bitte Pop-ups erlauben.");
      return;
    }

    const title = current.title;
    const text = current.text.replace(/\n/g, "<br>");
    const bulletHtml =
      current.highlights && current.highlights.length > 0
        ? `
          <div style="margin-top:24px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:10px;">Highlights</div>
            <ul style="margin:0;padding-left:20px;line-height:1.8;">
              ${current.highlights.map((h) => `<li>${h}</li>`).join("")}
            </ul>
          </div>
        `
        : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              line-height: 1.7;
              color: #1f2937;
            }
            h1 {
              font-size: 30px;
              margin-bottom: 24px;
              line-height: 1.15;
            }
            .meta {
              margin-bottom: 14px;
              font-size: 12px;
              color: #8b7355;
              font-weight: bold;
              letter-spacing: 0.04em;
            }
            .container {
              max-width: 900px;
              margin: auto;
            }
            .content {
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="meta">Inserat - AI – PDF Export</div>
            <h1>${title}</h1>
            <div class="content">${text}</div>
            ${bulletHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
  const files = event.target.files;

  if (!files || files.length === 0) return;

  const remainingSlots = 10 - selectedImages.length;

  if (remainingSlots <= 0) {
    alert("Du kannst maximal 10 Fotos hochladen.");
    event.target.value = "";
    return;
  }

  const newFiles = Array.from(files).slice(0, remainingSlots);
  const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

  setSelectedImages((currentImages) => [
    ...currentImages,
    ...newFiles,
  ]);

  setImagePreviews((currentPreviews) => [
    ...currentPreviews,
    ...newPreviews,
  ]);

  event.target.value = "";
}

function removeImage(indexToRemove: number) {
  const previewToRemove = imagePreviews[indexToRemove];

  if (previewToRemove) {
    URL.revokeObjectURL(previewToRemove);
  }

  setSelectedImages((current) =>
    current.filter((_, index) => index !== indexToRemove)
  );

  setImagePreviews((current) =>
    current.filter((_, index) => index !== indexToRemove)
  );
}
return (
<main
  className="page"
  style={{
    background:
      "radial-gradient(circle at 18% 12%, rgba(37, 99, 235, 0.45), transparent 28%), radial-gradient(circle at 88% 82%, rgba(249, 115, 22, 0.75), transparent 34%), linear-gradient(135deg, #020617 0%, #0f172a 35%, #312e81 65%, #7c2d12 100%)",
  }}
>
    <div className="shell">

    <div className="hero">
        <h1>Inserat Generator für Immobilienmakler</h1>
        <p>
          Erstelle in Sekunden hochwertige Immobilieninserate für Homegate, ImmoScout24,
          Exposés und Social Media. Professionell formuliert, strukturiert aufgebaut und
          auf maximale Wirkung bei Käufern ausgelegt.
        </p>
      </div>

        <div className="grid">
         <section className="leftCard">
  <h2>Eingabe</h2>
  <p className="sectionText">
  Erfasse die wichtigsten Eckdaten der Immobilie. Inserat-AI erstellt daraus professionelle Titel, Beschreibungen und Varianten für dein Inserat.
  </p>
{trialDaysLeft !== null && !trialExpired && (
  <div
    style={{
      marginBottom: "18px",
      padding: "14px 16px",
      borderRadius: "14px",
      background: "rgba(34, 197, 94, 0.12)",
      border: "1px solid rgba(34, 197, 94, 0.35)",
      color: "#bbf7d0",
      fontWeight: 700,
      textAlign: "center",
    }}
  >
    Ihr kostenloser Test läuft noch {trialDaysLeft} Tage.
  </div>
)}

{trialExpired && (
  <div
    style={{
      marginBottom: "18px",
      padding: "18px",
      borderRadius: "16px",
      background: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.35)",
      color: "#fecaca",
      fontWeight: 700,
      textAlign: "center",
    }}
  >
    Ihr 30-Tage-Test ist abgelaufen. Bitte aktivieren Sie Ihr Abo, um weiterhin Inserate zu erstellen.
  </div>
)}
  <div className="formGrid">
    <div
  style={{
    gridColumn: "1 / -1",
    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(30, 41, 59, 0.58))",
    border: "1px solid rgba(251, 191, 36, 0.22)",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.22)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: "12px",
    }}
  >
    <div>
      <div
        style={{
          color: "#fbbf24",
          fontWeight: 900,
          fontSize: "0.95rem",
        }}
      >
        Objekt-Vorlagen
      </div>
      <div
        style={{
          color: "rgba(226, 232, 240, 0.78)",
          fontSize: "0.84rem",
          marginTop: "3px",
        }}
      >
        Speichere häufige Objektangaben und lade sie später mit einem Klick.
      </div>
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto",
      gap: "10px",
      alignItems: "center",
    }}
  >
    <input
      value={templateName}
      placeholder={`${propertyType || "Objekt"} ${location || "ohne Ort"}`}
      className="input bg-transparent text-white placeholder-gray-400/60"
      onChange={(e) => setTemplateName(e.target.value)}
    />

    <button
      type="button"
      onClick={saveObjectTemplate}
      disabled={
        !location &&
        !propertyType &&
        !rooms &&
        !livingArea &&
        !price &&
        !styleText &&
        !highlights
      }
      style={{
        border: "1px solid rgba(245, 158, 11, 0.55)",
        background:
          "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(251, 191, 36, 0.15))",
        color: "#fbbf24",
        borderRadius: "14px",
        padding: "12px 16px",
        fontWeight: 900,
        cursor:
          location ||
          propertyType ||
          rooms ||
          livingArea ||
          price ||
          styleText ||
          highlights
            ? "pointer"
            : "not-allowed",
        opacity:
          location ||
          propertyType ||
          rooms ||
          livingArea ||
          price ||
          styleText ||
          highlights
            ? 1
            : 0.45,
        whiteSpace: "nowrap",
      }}
    >
      Vorlage speichern
    </button>
  </div>
<button
  type="button"
  onClick={saveListingPermanently}
  disabled={
    savingListing ||
    !location.trim() ||
    !propertyType.trim()
  }
  style={{
    width: "100%",
    marginTop: "12px",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(34, 197, 94, 0.55)",
    background: savingListing
      ? "rgba(34, 197, 94, 0.35)"
      : "linear-gradient(135deg, #16a34a, #22c55e)",
    color: "#ffffff",
    fontWeight: 800,
    cursor:
      savingListing ||
      !location.trim() ||
      !propertyType.trim()
        ? "not-allowed"
        : "pointer",
    opacity:
      savingListing ||
      !location.trim() ||
      !propertyType.trim()
        ? 0.55
        : 1,
  }}
>
  {savingListing
    ? "Objekt wird gespeichert..."
    : "Objekt dauerhaft speichern"}
</button>
  {objectTemplates.length > 0 && (
    <div
      style={{
        display: "grid",
        gap: "8px",
        marginTop: "14px",
      }}
    >
      {objectTemplates.map((template) => (
        <div
          key={template.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            background: "rgba(15, 23, 42, 0.58)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "10px 12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#f8fafc",
                fontWeight: 800,
                fontSize: "0.92rem",
              }}
            >
              {template.name}
            </div>
            <div
              style={{
                color: "rgba(203, 213, 225, 0.72)",
                fontSize: "0.8rem",
                marginTop: "2px",
              }}
            >
              {template.propertyType || "Objekt"} ·{" "}
{template.postalCode ? `${template.postalCode} ` : ""}
{template.location || "ohne Ort"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => loadObjectTemplate(template)}
              style={{
                border: "1px solid rgba(34, 197, 94, 0.35)",
                background: "rgba(34, 197, 94, 0.12)",
                color: "#86efac",
                borderRadius: "12px",
                padding: "9px 12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Laden
            </button>

            <button
              type="button"
              onClick={() => deleteObjectTemplate(template.id)}
              style={{
                border: "1px solid rgba(248, 113, 113, 0.35)",
                background: "rgba(248, 113, 113, 0.10)",
                color: "#fca5a5",
                borderRadius: "12px",
                padding: "9px 12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Löschen
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
  {showExtraHighlights && (
  <div
    style={{
      gridColumn: "1 / -1",
      background:
        "linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(30, 41, 59, 0.58))",
      border: "1px solid rgba(251, 191, 36, 0.22)",
      borderRadius: "18px",
      padding: "16px",
      boxShadow: "0 16px 36px rgba(2, 6, 23, 0.22)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: "12px",
      }}
    >
      <div>
        <div
          style={{
            color: "#fbbf24",
            fontWeight: 900,
            fontSize: "0.95rem",
          }}
        >
          Was möchten Sie noch ergänzen?
        </div>
        <div
          style={{
            color: "rgba(226, 232, 240, 0.78)",
            fontSize: "0.84rem",
            marginTop: "3px",
          }}
        >
          Klicken Sie passende Punkte an. Sie werden automatisch zu den Highlights hinzugefügt.
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowExtraHighlights(false)}
        style={{
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "rgba(255, 255, 255, 0.06)",
          color: "rgba(226, 232, 240, 0.86)",
          borderRadius: "12px",
          padding: "8px 11px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Schliessen
      </button>
      
    </div>
<div
  style={{
    display: "grid",
    gap: "14px",
    marginTop: "14px",
    marginBottom: "16px",
    paddingBottom: "14px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  }}
>
  <div>
    <div style={{ color: "#f8fafc", fontWeight: 900, marginBottom: "8px" }}>
      Objektart
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {QUICK_PROPERTY_TYPES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setPropertyType(item)}
          style={quickButtonStyle}
        >
          {item}
        </button>
      ))}
    </div>
  </div>

  <div>
    <div style={{ color: "#f8fafc", fontWeight: 900, marginBottom: "8px" }}>
      Zimmer
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {QUICK_ROOMS.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setRooms(item)}
          style={quickButtonStyle}
        >
          {item}
        </button>
      ))}
    </div>
  </div>

  <div>
    <div style={{ color: "#f8fafc", fontWeight: 900, marginBottom: "8px" }}>
      Wohnfläche
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {QUICK_LIVING_AREAS.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLivingArea(item)}
          style={quickButtonStyle}
        >
          {item} m²
        </button>
      ))}
    </div>
  </div>

  <div>
    <div style={{ color: "#f8fafc", fontWeight: 900, marginBottom: "8px" }}>
      Stil
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {QUICK_STYLES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setStyleText(item)}
          style={quickButtonStyle}
        >
          {item}
        </button>
      ))}
    </div>
  </div>
</div>
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
      }}
    >
      {EXTRA_HIGHLIGHT_SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => addSuggestedHighlight(suggestion)}
          style={{
            border: "1px solid rgba(245, 158, 11, 0.35)",
            background: "rgba(245, 158, 11, 0.10)",
            color: "#fbbf24",
            borderRadius: "999px",
            padding: "9px 12px",
            fontWeight: 800,
            cursor: "pointer",
            fontSize: "0.86rem",
          }}
        >
          + {suggestion}
        </button>
      ))}
    </div>
  </div>
)}
</div>
  <Field label="Ort / Lage">
  <div style={{ position: "relative" }}>
    <input
  value={location}
  placeholder="Winterthur"
  className="input bg-transparent text-white placeholder-gray-400/60"
  onChange={(e) => {
    const value = e.target.value;

    setLocation(value);

    if (value.trim() === "") {
      setPostalCode("");
      setShowPostalSuggestions(false);
      return;
    }

    setShowPostalSuggestions(true);
  }}
  onFocus={() => {
    if (location.trim().length > 0 || postalCode.trim().length > 0) {
      setShowPostalSuggestions(true);
    }
  }}
  onBlur={() => {
    saveLocationSuggestion(location);
    setTimeout(() => setShowPostalSuggestions(false), 150);
  }}
/>

   {showPostalSuggestions && filteredPostalLocationSuggestions.length > 0 && (
  <div
    style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0,
      right: 0,
      zIndex: 50,
      background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
      border: "1px solid rgba(251, 191, 36, 0.22)",
      borderRadius: "16px",
      boxShadow: "0 18px 40px rgba(2, 6, 23, 0.35)",
      overflow: "hidden",
      backdropFilter: "blur(10px)",
    }}
  >
    {filteredPostalLocationSuggestions.map((suggestion) => (
      <button
        key={`${suggestion.zip}-${suggestion.name}-${suggestion.canton}`}
        type="button"
       onMouseDown={() => {
  setPostalCode(suggestion.zip);
  setLocation(suggestion.name);
  saveLocationSuggestion(suggestion.name);
  setShowPostalSuggestions(false);
}}
        style={{
          display: "block",
          width: "100%",
          padding: "13px 16px",
          border: "none",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "transparent",
          color: "#f8fafc",
          textAlign: "left",
          fontWeight: 700,
          fontSize: "0.96rem",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(251, 191, 36, 0.10))";
          e.currentTarget.style.color = "#fbbf24";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#f8fafc";
        }}
      >
        <span style={{ color: "#fbbf24", fontWeight: 900 }}>
          {suggestion.zip}
        </span>{" "}
        {suggestion.name}{" "}
        <span style={{ color: "rgba(203, 213, 225, 0.72)" }}>
          · {suggestion.canton}
        </span>
      </button>
    ))}
  </div>
)}
  </div>
</Field>

    <Field label="Objektart">
      <input
        value={propertyType}
        placeholder="Wohnung"
        onChange={(e) => setPropertyType(e.target.value)}
        className="input"
        
      />
    </Field>

 <Field label="Zimmer">
  <div style={{ display: "grid", gap: "10px" }}>
    <input
      value={rooms}
      placeholder="4.5"
      type="number"
      min="1"
      max="10"
      step="0.5"
      className="input"
      onChange={(e) => setRooms(e.target.value)}
    />

    <input
      type="range"
      min="1"
      max="10"
      step="0.5"
      value={rooms || "4.5"}
      onChange={(e) => setRooms(e.target.value)}
      className="amberRange"
    />
  </div>
</Field>

<Field label="Wohnfläche (m²)">
  <div style={{ display: "grid", gap: "10px" }}>
    <input
      value={livingArea}
      placeholder="120"
      type="number"
      min="20"
      max="500"
      step="5"
      className="input"
      onChange={(e) => setLivingArea(e.target.value)}
    />

    <input
      type="range"
      min="20"
      max="500"
      step="5"
      value={livingArea || "120"}
      onChange={(e) => setLivingArea(e.target.value)}
      className="amberRange"
    />
  </div>
</Field>

  

<Field label="Preis">
  <input
    value={price}
    placeholder="z.B. 1'450'000"
    onChange={(e) => setPrice(e.target.value)}
    className="input"
  />
</Field>

<Field label="Stil">
  <input
    value={styleText}
    placeholder="z.B. hochwertig, modern oder sachlich"
    onChange={(e) => setStyleText(e.target.value)}
    className="input"
  />
</Field>

    <Field label="Highlights (mit Komma trennen)">
      <input
      ref={highlightsInputRef}
        value={highlights}
        placeholder="Balkon, Lift, Garage, ruhige Lage"
        onChange={(e) => setHighlights(e.target.value)}
        className="input"
      />
    </Field>
    

   <div className="full">
  <div
    style={{
      fontSize: "13px",
      color: "rgba(255,255,255,0.72)",
      marginBottom: "8px",
      fontWeight: 700,
      letterSpacing: "0.01em",
    }}
  >
    Immobilienfoto
  </div>

<label className="uploadBox">
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={handleImageUpload}
  />

  <span>
    {selectedImages.length > 0
      ? `${selectedImages.length} Fotos ausgewählt`
      : "📷 Fotos auswählen"}
  </span>
</label>

{imagePreviews.length > 0 && (
  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
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

  

  <div style={{ marginTop: "12px" }}>
    <button
  type="button"
  onClick={analyzeImage}
  className="btn btn-secondary"
  disabled={
    (selectedImages.length === 0 && imagePreviews.length === 0) ||
    analyzingImage
  }
>
  {analyzingImage ? "Analysiere Foto..." : "Foto analysieren"}
</button>
  </div>

  {imageAnalysis && (
    <div
      style={{
        marginTop: "12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "12px",
        color: "rgba(255,255,255,0.78)",
        lineHeight: 1.6,
        fontSize: "14px",
        whiteSpace: "pre-line",
      }}
    >
      {imageAnalysis}
    </div>
  )}
</div>
  </div>

  <div className="divider" />

<div className="actions">
  <div className="mainActions">
    <button
      onClick={generateText}
      disabled={loading || trialExpired}
      className="btn btn-primary"
      style={{
        background: "linear-gradient(135deg, #f59e0b, #f97316)",
        boxShadow: "0 16px 36px rgba(249, 115, 22, 0.35)",
        color: "#ffffff",
        border: "none",
      }}
    >
      {trialExpired
        ? "Test abgelaufen"
        : loading
        ? "Generiere..."
        : "✨ Generieren (3 Varianten)"}
    </button>

 <Link
  href="/dashboard/social-media"
  aria-label="Instagram, Facebook, LinkedIn und X Posts erstellen"
  onClick={() => {
    localStorage.setItem(
      "inseratAiSocialDraft",
      JSON.stringify({
        location,
        propertyType,
        rooms,
        livingArea,
        price,
        highlights,
        styleText,
        imageAnalysis,
      })
    );
    sessionStorage.setItem(
  "inseratAiSocialImages",
  JSON.stringify(imagePreviews)
);
  }}
  style={{
    minHeight: "52px",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    width: "100%",
    borderRadius: "16px",
    padding: "8px 18px",
    textDecoration: "none",
    color: "#ffffff",
    border: "none",
    background: "linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)",
    boxShadow: "0 16px 36px rgba(139, 92, 246, 0.38)",
  }}
>
  <span
    style={{
      fontSize: "10px",
      fontWeight: 900,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      opacity: 0.92,
      lineHeight: 1,
    }}
  >
    Instagram · Facebook · LinkedIn · X
  </span>

  <strong
    style={{
      fontSize: "17px",
      fontWeight: 950,
      lineHeight: 1.1,
    }}
  >
    📱 Social Media →
  </strong>
</Link>
  </div>

  <div className="secondaryActions">
    <button
      onClick={copyActive}
      disabled={!current}
      className="btn btn-secondary"
    >
      Copy
    </button>

    <button
      type="button"
      onClick={clearForm}
      className="btn btn-secondary"
    >
      Neues Objekt
    </button>

    <button
      onClick={exportPdf}
      disabled={!current}
      className="btn btn-secondary"
    >
      PDF
    </button>

    <PortalExportButton
      data={{
        ort: location,
        objektart: propertyType,
        zimmer: rooms,
        wohnflaeche: livingArea,
        preis: price,
        titel: current?.title || "",
        beschreibung: current?.text || "",
        highlights:
          current?.highlights && current.highlights.length > 0
            ? current.highlights
            : highlights,
      }}
    />
  </div>
</div>

  <div className="miniStats">
    <MiniStat title="Markt" value="Schweiz" />
    <MiniStat title="Output" value=" Varianten" />
    <MiniStat title="Stil" value="Hochwertig" />
  </div>
</section>

<a
  href="https://wa.me/41772323567?text=Hallo%20Inserat-AI%2C%20ich%20habe%20eine%20Frage%20oder%20Feedback."
  target="_blank"
  rel="noopener noreferrer"
  className="feedbackButton"
>
  Feedback / Support
</a>

  <section className="rightCard">
  <div className="topStats">
    <div className="topStat">
  <div className="topStatValue">{dailyCount}</div>
  <div className="topStatLabel">Inserate heute</div>
</div>

    <div className="topStat">
  <div className="topStatValue">{formatSavedTime(dailyCount)}</div>
  <div className="topStatLabel">Geschätzte Zeitersparnis heute</div>
</div>

    <div className="topStat">
      <div className="topStatValue">30 Tage</div>
      <div className="topStatLabel">Kostenlos testen</div>
    </div>
  </div>
  <div className="outputShell">
    <div className="outputTop">
      <div>
        <div className="outputBadge">Output</div>
        <div className="outputState">
         {(variants?.length ?? 0) > 0
  ? `Variante ${activeIndex + 1} aktiv`
  : "Noch nichts generiert"}
        </div>
      </div>

      <div className="variantTabs">
 {(variants ?? []).map((v, i) => (
    <button
      key={i}
      onClick={() => setActiveIndex(i)}
      className={`variantButton ${activeIndex === i ? "active" : ""}`}
    >
      Variante {i + 1}
    </button>
  ))}
</div>
    </div>

    <div className="outputCard">
      {variants.length === 0 ? (
        <div className="emptyState">
          <div className="emptyTitle">Noch keine Variante vorhanden</div>
          <div className="emptyText">
           Gib links die Objektdaten ein und klicke auf „Generieren (3 Varianten)“.
          </div>
        </div>
      ) : (
        <>
    
          <h2 className="outputTitle">{variants[activeIndex]?.title}</h2>
          {socialPosts.instagramPost && (
  <div style={{ marginTop: "20px" }}>
    <h4>Instagram</h4>
    <p>{socialPosts.instagramPost}</p>
  </div>
)}

{socialPosts.linkedinPost && (
  <div style={{ marginTop: "20px" }}>
    <h4>LinkedIn</h4>
    <p>{socialPosts.linkedinPost}</p>
  </div>
)}

{socialPosts.facebookPost && (
  <div style={{ marginTop: "20px" }}>
    <h4>Facebook</h4>
    <p>{socialPosts.facebookPost}</p>
  </div>
)}
          <p className="outputText">{variants[activeIndex]?.text}</p>
          {variants[activeIndex]?.instagramPost && (
  <div className="socialBlock">
    <div className="socialTitle">Instagram</div>
    <p className="socialText">{variants[activeIndex]?.instagramPost}</p>
  </div>
)}

{variants[activeIndex]?.linkedinPost && (
  <div className="socialBlock">
    <div className="socialTitle">LinkedIn</div>
    <p className="socialText">{variants[activeIndex]?.linkedinPost}</p>
  </div>
)}

{variants[activeIndex]?.facebookPost && (
  <div className="socialBlock">
    <div className="socialTitle">Facebook</div>
    <p className="socialText">{variants[activeIndex]?.facebookPost}</p>
  </div>
)}
        </>
        
      )}
    </div>

    <div className="bonusBlock">
      <div className="bonusTitle">🎁 Bonus</div>
      <div className="bonusText">
        Empfehle Inserat - AI einem Maklerkollegen und erhalte 5 zusätzliche Inserate kostenlos.
      </div>
      <button className="bonusBtn">Empfehlungslink kopieren</button>
    </div>
   
  </div>
</section>
        </div>
      </div>

      <style jsx>{`
     
      .topStats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  flex-shrink: 0;
  width: 100%
}

.topStat {
  background: #fffdf7;
  border: 1px solid #eedfb9;
  border-radius: 14px;
  padding: 12px;
}
  .uploadBox {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.78);
  cursor: pointer;
  font-weight: 700;
  transition: 0.2s ease;
  text-align: center;
}

.uploadBox:hover {
  border-color: rgba(200,162,77,0.7);
  background: rgba(255,255,255,0.06);
}

.uploadBox input {
  display: none;
}

.topStatValue {
  font-size: 22px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 6px;
}

.topStatLabel {
  font-size: 12px;
  color: #7b6a46;
  line-height: 1.4;
}

.outputShell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
        .page {
          min-height: 100vh;
          background: linear-gradient(
            180deg,
            #07111e 0%,
            #0a1627 45%,
            #0d1b2e 100%
          );
          color: #ffffff;
          padding: 28px 16px 40px;
        }

        .shell {
          max-width: 1280px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .logo {
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 0.08em;
        }

        .topbarRight {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .topLink {
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          opacity: 0.9;
        }

        .topCta {
          background: #c8a24d;
          color: #111827;
          text-decoration: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 700;
          font-size: 14px;
        }
.hero {
  margin-bottom: 28px;
  text-align: center;
}

.hero h1 {
  margin: 0 0 10px 0;
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 800;
  line-height: 1.08;
}

.hero p {
  margin: 0 auto;
  max-width: 980px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.7;
  font-size: 16px;
}

       .grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 22px;
  align-items: stretch;
}

.leftCard {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(0,0,0,0.22);
  min-height: 760px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
        

        .leftCard h2 {
          font-size: 26px;
          font-weight: 800;
          margin: 0 0 10px 0;
        }

        .sectionText {
          color: rgba(255, 255, 255, 0.72);
          margin-bottom: 22px;
          line-height: 1.6;
          font-size: 14px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 14px 15px;
          color: #ffffff;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }

        .input::placeholder {
  color: #8b93a1;
}

        .actions {
  display: grid;
  gap: 14px;
  margin-top: 22px;
}

.mainActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.secondaryActions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}


.socialLaunchBtn {
  min-height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 12px 20px;
  border-radius: 18px;
  text-decoration: none;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: linear-gradient(
    135deg,
    #ff006e 0%,
    #8338ec 42%,
    #3a86ff 72%,
    #06b6d4 100%
  );
  box-shadow:
    0 18px 42px rgba(131, 56, 236, 0.38),
    0 0 32px rgba(6, 182, 212, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  font-weight: 950;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease;
}

.socialLaunchBtn:hover {
  transform: translateY(-2px) scale(1.015);
  filter: brightness(1.08);
  box-shadow:
    0 24px 58px rgba(131, 56, 236, 0.5),
    0 0 42px rgba(6, 182, 212, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.38);
}

.socialLaunchPlatforms {
  font-size: 10px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.9);
}

.socialLaunchBtn strong {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  line-height: 1.1;
  color: #ffffff;
}

.socialLaunchBtn strong span {
  font-size: 22px;
  line-height: 1;
}


        
.miniStats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 14px;
}

.rightCard {
  background: #fff9ec;
  border: 1px solid #e9d7a8;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  color: #1f2937;
  min-height: 760px;
  height: 760px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

.outputTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.outputCard {
  background: #ffffff;
  border: 1px solid #f0e3c1;
  border-radius: 18px;
  padding: 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.outputCard::-webkit-scrollbar {
  width: 8px;
}

.outputCard::-webkit-scrollbar-thumb {
  background: #cdb88a;
  border-radius: 10px;
}

.outputCard::-webkit-scrollbar-track {
  background: transparent;
}

        .outputState {
          font-size: 22px;
          font-weight: 800;
          margin-top: 8px;
        }

       .tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}
   .tab {
  width: 100%;
  text-align: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e8d9b5;
  background: #fffdf7;
  cursor: pointer;
  font-weight: 700;
  color: #6b5530;
}

        .tab.active {
          background: #f7e4b5;
          border: 1px solid #c59a2d;
          color: #4f3d1d;
        }


        .emptyState {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #8b8b8b;
        }

        .emptyTitle {
          font-weight: 700;
          font-size: 22px;
          margin-bottom: 10px;
          color: #6b7280;
        }

        .emptyText {
          line-height: 1.6;
        }

        .outputTitle {
          font-size: 30px;
          font-weight: 800;
          margin: 0 0 14px 0;
          line-height: 1.15;
        }

        .outputText {
          font-size: 17px;
          line-height: 1.7;
          color: #4b5563;
          margin: 0;
          white-space: pre-line;
        }

        .bonusBlock {
          border: 1px solid #f0e3c1;
          background: #fffaf0;
          border-radius: 14px;
          padding: 14px;
        }

        .bonusTitle {
          font-weight: 800;
          margin-bottom: 8px;
          color: #8a6a1f;
        }

        .bonusText {
          color: #7b6a46;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .bonusBtn {
          border: 1px solid #ecd9a3;
          background: #f8ebc4;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 700;
          color: #7a6021;
        }

        .socialWrap {
          margin-top: 24px;
          display: grid;
          gap: 16px;
        }

        .socialCard {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #f0e3c1;
          padding: 18px;
        }

        .socialTitle {
          font-weight: 800;
          font-size: 16px;
          margin-bottom: 10px;
          color: #1f2937;
        }

        .socialText {
          margin: 0;
          white-space: pre-line;
          color: #445066;
          line-height: 1.8;
          font-size: 15px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .miniStats {
            grid-template-columns: 1fr;
          }
.rightCard {
  background: #fff9ec;
  border: 1px solid #e9d7a8;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  color: #1f2937;
  min-height: 760px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
          .topbar {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }
          
}
        }

      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.72)",
          marginBottom: "8px",
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.58)",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "#FFFFFF",
        }}
      >
        {value}
      </div>
    </div>
  );
}
   
 
  