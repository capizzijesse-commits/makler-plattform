"use client";

import {
  downloadPortalExportXml,
  type PortalExportData,
} from "@/lib/portalExportXml";

type PortalExportButtonProps = {
  data: PortalExportData;
};

export default function PortalExportButton({ data }: PortalExportButtonProps) {
  const hasRequiredData =
    data.ort &&
    data.objektart &&
    data.titel &&
    data.beschreibung;

  function handleDownload() {
    downloadPortalExportXml(data);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!hasRequiredData}
   style={{
  border: "1px solid rgba(245, 158, 11, 0.55)",
  background:
    "linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(251, 191, 36, 0.14))",
  color: "#fbbf24",
  borderRadius: "14px",
  padding: "13px 18px",
  fontWeight: 800,
  cursor: hasRequiredData ? "pointer" : "not-allowed",
  opacity: hasRequiredData ? 1 : 0.45,
  boxShadow: hasRequiredData
    ? "0 8px 22px rgba(245, 158, 11, 0.20)"
    : "none",
  transition: "all 0.2s ease",
}}
    >
      Portal-Export herunterladen
    </button>
  );
}