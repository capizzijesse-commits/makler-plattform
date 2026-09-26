import { notFound } from "next/navigation";

import PreviewAutomationClient from "./PreviewAutomationClient";

export default function AutomationPreviewPage() {
  const previewAllowed =
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development";

  if (!previewAllowed) {
    notFound();
  }

  return <PreviewAutomationClient />;
}
