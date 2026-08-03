"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { upload } from "@vercel/blob/client";
import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type ChangeEvent,
} from "react";
import PortalExportButton from "../components/PortalExportButton";
import { useAppDialog } from "@/components/AppDialogProvider";
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
type ImageAnalysisStatus = "idle" | "analyzing" | "done" | "error";

type ImageAnalysisResult = {
  status: ImageAnalysisStatus;
  analysis: string;
  error: string;
};

function createEmptyImageAnalysis(): ImageAnalysisResult {
  return {
    status: "idle",
    analysis: "",
    error: "",
  };
}
export default function DashboardPage() {
  const router = useRouter();
  const {
    notify,
    confirmAction,
    chooseAction,
  } = useAppDialog();

  const [userPlan, setUserPlan] = useState("free");
  const canUseDashboardImages = userPlan !== "free";

const [instagramPost, setInstagramPost] = useState("");
  const [linkedinPost, setLinkedinPost] = useState("");
  const [facebookPost, setFacebookPost] = useState("");
 
const [imageAnalyses, setImageAnalyses] = useState<
  ImageAnalysisResult[]
>([]);

const [analyzingImage, setAnalyzingImage] = useState(false);

const [analysisProgressIndex, setAnalysisProgressIndex] = useState<
  number | null
>(null);

const [imageAnalysisMessage, setImageAnalysisMessage] = useState("");
const [userName, setUserName] = useState("");

useEffect(() => {
  let active = true;

  async function loadSessionPlan() {
    try {
      const response = await fetch("/api/session", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response
        .json()
        .catch(() => ({}));

      const nextPlan =
        typeof data?.user?.plan === "string"
          ? data.user.plan
          : "free";

      if (active) {
        setUserPlan(nextPlan);
      }
    } catch (error) {
      console.error(
        "PLAN KONNTE NICHT GELADEN WERDEN:",
        error
      );

      if (active) {
        setUserPlan("free");
      }
    }
  }

  loadSessionPlan();

  return () => {
    active = false;
  };
}, []);

useEffect(() => {
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

async function getImageFileForAnalysis(
  index: number
): Promise<File | null> {
  const selectedFile = selectedImages[index];

  if (selectedFile) {
    return selectedFile;
  }

  const preview = imagePreviews[index];

  if (!preview) {
    return null;
  }

  try {
    const previewResponse = await fetch(preview);

    if (!previewResponse.ok) {
      throw new Error(
        `Die Vorschau von Bild ${index + 1} konnte nicht geladen werden.`
      );
    }

    const imageBlob = await previewResponse.blob();

    return new File(
      [imageBlob],
      `objektfoto-${index + 1}.jpg`,
      {
        type: imageBlob.type || "image/jpeg",
      }
    );
  } catch (error) {
    console.error(
      `PREVIEW CONVERSION ERROR – BILD ${index + 1}:`,
      error
    );

    return null;
  }
}

async function analyzeImage() {
  const totalImages = imagePreviews.length;

  if (totalImages === 0 || analyzingImage) {
    return;
  }

  setAnalyzingImage(true);
  setImageAnalysisMessage("");
  setAnalysisProgressIndex(0);

  // Verhindert, dass eine alte Einzelanalyse erneut verwendet wird.
  localStorage.removeItem("inseratAiImageAnalysis");

  const nextResults = Array.from(
    { length: totalImages },
    () => createEmptyImageAnalysis()
  );

  setImageAnalyses([...nextResults]);

  try {
    for (let index = 0; index < totalImages; index += 1) {
      setAnalysisProgressIndex(index);

      nextResults[index] = {
        status: "analyzing",
        analysis: "",
        error: "",
      };

      setImageAnalyses([...nextResults]);

      try {
        const imageFile = await getImageFileForAnalysis(index);

        if (!imageFile) {
          throw new Error(
            "Das Foto ist nur noch als ungültige Vorschau vorhanden. Bitte dieses Bild nochmals auswählen."
          );
        }

        const formData = new FormData();
        formData.append("image", imageFile);

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
          throw new Error(
            "Für dieses Bild wurde keine Analyse zurückgegeben."
          );
        }

        nextResults[index] = {
          status: "done",
          analysis: data.analysis.trim(),
          error: "",
        };
      } catch (error) {
        console.error(
          `IMAGE ANALYSIS ERROR – BILD ${index + 1}:`,
          error
        );

        nextResults[index] = {
          status: "error",
          analysis: "",
          error:
            error instanceof Error
              ? error.message
              : "Dieses Bild konnte nicht analysiert werden.",
        };
      }

      setImageAnalyses([...nextResults]);
    }

    const successfulAnalyses = nextResults.filter(
      (item) => item.status === "done"
    ).length;

    const failedAnalyses = nextResults.filter(
      (item) => item.status === "error"
    ).length;

    if (successfulAnalyses === totalImages) {
      setImageAnalysisMessage(
        `✓ Alle ${totalImages} ${
          totalImages === 1 ? "Foto wurde" : "Fotos wurden"
        } einzeln und erfolgreich analysiert.`
      );
    } else if (successfulAnalyses > 0) {
      setImageAnalysisMessage(
        `⚠ ${successfulAnalyses} von ${totalImages} Fotos wurden analysiert. ${failedAnalyses} ${
          failedAnalyses === 1 ? "Analyse ist" : "Analysen sind"
        } fehlgeschlagen.`
      );
    } else {
      setImageAnalysisMessage(
        "✕ Keines der ausgewählten Fotos konnte analysiert werden."
      );
    }
  } finally {
    setAnalyzingImage(false);
    setAnalysisProgressIndex(null);
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
const imageAnalysis = imageAnalyses
  .reduce<string[]>((parts, item, index) => {
    if (item.status !== "done" || !item.analysis.trim()) {
      return parts;
    }

    const fileName =
      selectedImages[index]?.name || `Objektfoto ${index + 1}`;

    parts.push(
      `Bild ${index + 1} – ${fileName}:\n${item.analysis.trim()}`
    );

    return parts;
  }, [])
  .join("\n\n");
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
async function uploadListingImages(listingId: string) {
  for (const file of selectedImages) {
    const safeFileName = file.name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const blob = await upload(
      `listing-images/${listingId}/${
        safeFileName || "objektfoto"
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
      error?: string;
    };

    if (!imageResponse.ok) {
      throw new Error(
        imageData.error ||
          `Das Bild „${file.name}“ konnte nicht gespeichert werden.`
      );
    }
  }
}
const saveListingPermanently = async (): Promise<string | null> => {
  const userEmail =
    localStorage.getItem("userEmail")?.trim().toLowerCase() || "";

if (!userEmail) {
  notify("Bitte zuerst einloggen.", "warning");
  return null;
}

if (!location.trim() || !propertyType.trim()) {
  notify("Bitte mindestens Ort und Objektart ausfüllen.", "warning");
  return null;
}

  try {
    setSavingListing(true);
    setSaveProgress("Objekt wird sicher gespeichert …");

    const response = await fetch("/api/listings", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location,
        postalCode,
        propertyType,
        rooms,
        livingArea,
        price,
        highlights,
        style: styleText,
        generatedVariants: variants,
        imageAnalysis,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Das Objekt konnte nicht gespeichert werden."
      );
    }

    const listingId =
  typeof data?.listing?.id === "string"
    ? data.listing.id
    : "";

if (!listingId) {
  throw new Error(
    "Das Objekt wurde gespeichert, aber es wurde keine Objekt-ID zurückgegeben."
  );
}

if (selectedImages.length > 0) {
  try {
    setSaveProgress(
      `${selectedImages.length} ${
        selectedImages.length === 1 ? "Bild wird" : "Bilder werden"
      } hochgeladen …`
    );

    await uploadListingImages(listingId);

    setSaveProgress(
      `✓ Objekt und ${selectedImages.length} ${
        selectedImages.length === 1 ? "Bild" : "Bilder"
      } erfolgreich gespeichert – Weiterleitung läuft …`
    );
  } catch (imageError) {
    console.error(
      "BILDER KONNTEN NICHT GESPEICHERT WERDEN:",
      imageError
    );

    const imageMessage =
      imageError instanceof Error
        ? imageError.message
        : "Die Bilder konnten nicht gespeichert werden.";

    setSaveProgress(
      `✕ Das Objekt wurde gespeichert, aber der Bild-Upload ist fehlgeschlagen: ${imageMessage}`
    );

    return null;
  }
} else {
  setSaveProgress(
    "✓ Objekt erfolgreich gespeichert – Weiterleitung läuft …"
  );
}

return listingId;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Das Objekt konnte nicht gespeichert werden.";

   setSaveProgress(`✕ ${message}`);
return null;
  } finally {
    setSavingListing(false);
  }
};
const startSingleObjectCheckoutFromDemo =
  async () => {
    if (savingListing) {
      return;
    }

    const listingId =
      await saveListingPermanently();

    if (!listingId) {
      return;
    }

    try {
      setSaveProgress(
        "Sichere Zahlungsseite wird vorbereitet …"
      );

      const response = await fetch(
        "/api/payments/single-object/checkout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            listingId,
          }),
        }
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data =
        (await response
          .json()
          .catch(() => null)) as
          | {
              success?: boolean;
              checkoutUrl?: string;
              alreadyUnlocked?: boolean;
              error?: string;
            }
          | null;

      if (data?.alreadyUnlocked) {
        router.push(
          `/cockpit/${encodeURIComponent(
            listingId
          )}`
        );

        return;
      }

      if (
        !response.ok ||
        !data?.success ||
        typeof data.checkoutUrl !==
          "string"
      ) {
        throw new Error(
          data?.error ||
            "Die Zahlungsseite konnte nicht geöffnet werden."
        );
      }

      window.location.href =
        data.checkoutUrl;
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Die Zahlungsseite konnte nicht geöffnet werden.";

      setSaveProgress(
        `✕ ${message}`
      );

      notify(message, "error");
    }
  };

const saveListingAndOpenCockpit = async () => {
  const listingId = await saveListingPermanently();

  if (!listingId) {
    return;
  }

  window.setTimeout(() => {
    window.location.href =
      `/cockpit/${encodeURIComponent(listingId)}`;
  }, 900);
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
const [saveProgress, setSaveProgress] = useState("");
const [dailyCount, setDailyCount] = useState(0);


const [activeIndex, setActiveIndex] = useState(0);

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
        const requestError = Object.assign(
          new Error(
            data?.error || "Fehler beim Generieren"
          ),
          {
            code:
              typeof data?.code === "string"
                ? data.code
                : undefined,
          }
        );

        throw requestError;
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
  const requestError = (
    error instanceof Error
      ? error
      : new Error("Fehler beim Generieren.")
  ) as Error & {
    code?: string;
  };

  if (
    requestError.code ===
      "DEMO_LIMIT_REACHED"
  ) {
    const choice =
      await chooseAction({
        title:
          "Deine kostenlose Demo ist abgeschlossen",
        message:
          "Sichere jetzt dieses Inserat inklusive bis zu 5 Bildern, Standard-Bildanalyse, Social-Media-Texten und PDF-Exposé für einmalig CHF 9.90.",
        confirmLabel:
          "Für CHF 9.90 freischalten",
        secondaryLabel:
          "Founder vergleichen",
        cancelLabel:
          "Später weiterarbeiten",
        tone: "warning",
        emphasizeConfirmAfterMs: 2500,
      });

    if (choice === "confirm") {
      await startSingleObjectCheckoutFromDemo();
      return;
    }

    if (choice === "secondary") {
      router.push("/#preise");
      return;
    }

    return;
  }

  console.error(
    "FRONTEND GENERATE ERROR:",
    requestError
  );

  notify(requestError.message, "error");
} finally {
  setLoading(false);
}
  }

  async function copyActive() {
  if (userPlan === "free") {
    const openOffers = await confirmAction({
      title: "Vorschau erfolgreich erstellt",
      message:
        "Das Kopieren des vollständigen Inserattexts ist nach der Freischaltung verfügbar. Das Einzelobjekt kostet einmalig CHF 9.90.",
      confirmLabel: "Angebote ansehen",
      cancelLabel: "Später",
      tone: "warning",
    });

    if (openOffers) {
      router.push("/#preise");
    }

    return;
  }

  if (!variants || variants.length === 0) {
    notify("Bitte zuerst eine Variante generieren.", "warning");
    return;
  }

  const active = variants[activeIndex];

  if (!active) {
    notify("Keine Variante gefunden.", "warning");
    return;
  }

  const fullText = `${active.title}\n\n${active.text}`;

  try {
    await navigator.clipboard.writeText(fullText);
    notify("Inserattext wurde kopiert.", "success");
  } catch (err) {
    console.error(err);
    notify("Kopieren ist fehlgeschlagen.", "error");
  }
}
  async function exportPdf() {
    if (userPlan === "free") {
      const openOffers = await confirmAction({
        title: "PDF nach Freischaltung",
        message:
          "Der vollständige PDF-Export gehört zum freigeschalteten Einzelobjekt für einmalig CHF 9.90 sowie zu Founder und Pro.",
        confirmLabel: "Angebote ansehen",
        cancelLabel: "Später",
        tone: "warning",
      });

      if (openOffers) {
        router.push("/#preise");
      }

      return;
    }

    if (!current) {
      notify("Bitte zuerst eine Variante generieren.", "warning");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      notify("Der PDF-Export wurde vom Browser blockiert. Bitte Pop-ups erlauben.", "warning");
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

  if (!canUseDashboardImages) {
    notify(
      "Bilder gehören nicht zur kostenlosen Demo. Nach der Freischaltung für CHF 9.90 kannst du bis zu 5 Bilder für diese Immobilie verwenden.",
      "warning"
    );

    event.target.value = "";
    return;
  }

  const remainingSlots = 10 - selectedImages.length;

  if (remainingSlots <= 0) {
    notify("Du kannst maximal 10 Fotos pro Objekt hochladen.", "warning");
    event.target.value = "";
    return;
  }

  const newFiles = Array.from(files).slice(0, remainingSlots);
  const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
const newAnalysisItems = newFiles.map(() =>
  createEmptyImageAnalysis()
);
setImageAnalyses((currentAnalyses) => [
  ...currentAnalyses,
  ...newAnalysisItems,
]);

setImageAnalysisMessage("");
localStorage.removeItem("inseratAiImageAnalysis");
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
  setImageAnalyses((current) =>
  current.filter((_, index) => index !== indexToRemove)
);

setImageAnalysisMessage("");
localStorage.removeItem("inseratAiImageAnalysis");
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
  <div className="leftCardScroll">
    <h2>Eingabe</h2>
  <p className="sectionText">
  Erfasse die wichtigsten Eckdaten der Immobilie. Inserat-AI erstellt daraus professionelle Titel, Beschreibungen und Varianten für dein Inserat.
  </p>
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

{!canUseDashboardImages && (
  <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
    <div className="font-black text-amber-300">
      🔒 Bilder sind in der kostenlosen Demo nicht enthalten
    </div>

    <div className="mt-1 text-slate-200">
      Bildfunktionen werden nach der Freischaltung dieser
      Immobilie für CHF 9.90 aktiviert. Danach kannst du
      bis zu 5 Bilder hochladen und analysieren lassen.
    </div>
  </div>
)}

<label className="uploadBox">
  <input
    type="file"
    accept="image/*"
    multiple
    disabled={!canUseDashboardImages}
    onChange={handleImageUpload}
  />

  <span>
    {selectedImages.length > 0
      ? `${selectedImages.length} Fotos ausgewählt`
      : "📷 Fotos auswählen"}
  </span>
</label>

{imagePreviews.length > 0 && (
  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
    {imagePreviews.map((preview, index) => {
      const analysisItem =
        imageAnalyses[index] || createEmptyImageAnalysis();

      return (
        <div
          key={`${preview}-${index}`}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => removeImage(index)}
              disabled={analyzingImage}
              aria-label={`Bild ${index + 1} entfernen`}
              className="absolute right-2 top-2 z-10 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ✕
            </button>

            <img
              src={preview}
              alt={`Objektfoto ${index + 1}`}
              className="h-44 w-full object-cover"
            />
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="text-xs font-black uppercase tracking-wide text-amber-300">
              Bild {index + 1}
            </div>

            <div className="mt-1 break-words text-xs text-slate-300">
              {selectedImages[index]?.name ||
                `Objektfoto ${index + 1}`}
            </div>

            {analysisItem.status === "idle" && (
              <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/20 p-3 text-sm text-slate-400">
                Dieses Foto wurde noch nicht analysiert.
              </div>
            )}

            {analysisItem.status === "analyzing" && (
              <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm font-bold text-amber-200">
                🔍 Dieses Foto wird ausführlich analysiert …
              </div>
            )}

            {analysisItem.status === "done" && (
              <div
                className="imageAnalysisScroll mt-3 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm leading-7 text-slate-200"
                style={{
                  whiteSpace: "pre-line",
                }}
              >
                {analysisItem.analysis}
              </div>
            )}

            {analysisItem.status === "error" && (
              <div className="mt-3 rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm leading-6 text-red-200">
                ✕ {analysisItem.error}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
)}

 

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
</div>
  <div className="divider" />

{saveProgress && (
  <div
    role="status"
    style={{
      marginTop: "14px",
      padding: "12px 14px",
      borderRadius: "12px",
      border: saveProgress.startsWith("✕")
        ? "1px solid rgba(248, 113, 113, 0.5)"
        : "1px solid rgba(52, 211, 153, 0.45)",
      background: saveProgress.startsWith("✕")
        ? "rgba(127, 29, 29, 0.25)"
        : "rgba(6, 78, 59, 0.3)",
      color: saveProgress.startsWith("✕")
        ? "#fecaca"
        : "#a7f3d0",
      fontSize: "13px",
      fontWeight: 800,
      lineHeight: 1.4,
      textAlign: "center",
    }}
  >
    {saveProgress}
  </div>
)}

<div className="actions">
  <div className="mainActions">
    <button
      onClick={generateText}
      disabled={loading}
      className="btn btn-primary"
      style={{
        background: "linear-gradient(135deg, #f59e0b, #f97316)",
        boxShadow: "0 16px 36px rgba(249, 115, 22, 0.35)",
        color: "#ffffff",
        border: "none",
      }}
    >
      {loading ? "Generiere..." : "✨ Generieren (3 Varianten)"}
    </button>

 <button
  type="button"
  onClick={saveListingAndOpenCockpit}
  disabled={
    savingListing ||
    !location.trim() ||
    !propertyType.trim()
  }
  className="saveCockpitButton"
>
  <span className="saveCockpitButtonLabel">
    Objekt speichern
  </span>

  <span className="saveCockpitButtonText">
    {savingListing
      ? "Objekt wird gespeichert..."
      : "Speichern & Cockpit öffnen"}
  </span>
</button>
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
      <div className="topStatValue">1 Demo</div>
      <div className="topStatLabel">kostenlose Generierung</div>
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
  height: 760px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.leftCardScroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 10px;
  scrollbar-width: thin;
  scrollbar-color: #f59e0b rgba(255, 255, 255, 0.08);
}

.leftCardScroll::-webkit-scrollbar {
  width: 8px;
}

.leftCardScroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.leftCardScroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #fbbf24, #f97316);
  border-radius: 999px;
}

.leftCard .divider,
.leftCard .actions {
  flex-shrink: 0;
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
   
 
  