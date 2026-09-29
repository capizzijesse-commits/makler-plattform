import { notFound } from "next/navigation";

import PreviewAutomationClientV2 from "./PreviewAutomationClientV2";

export default function AutomationPreviewPage() {
  const previewAllowed =
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development";

  if (!previewAllowed) {
    notFound();
  }

  return <PreviewAutomationClientV2 />;
}
