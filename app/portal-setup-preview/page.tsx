import { notFound } from "next/navigation";

import PortalSetupPreviewClient from "./PortalSetupPreviewClient";

export default function PortalSetupPreviewPage() {
  const previewAllowed =
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development";

  if (!previewAllowed) {
    notFound();
  }

  return <PortalSetupPreviewClient />;
}
