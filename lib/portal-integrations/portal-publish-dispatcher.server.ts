import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";


function dispatcherError(
  code:
    string,
  message:
    string
):
  Error {

  return Object.assign(
    new Error(
      message
    ),
    {
      code,
    }
  );
}


export function isPortalPublishTransportImplemented(
  _portal:
    string
):
  boolean {

  return false;
}


export async function executePortalPublishJob(
  job:
    PortalPublishWorkerJob
):
  Promise<
    PortalPublishExecutionResult
  > {

  switch (
    job.portal
  ) {

    case "immoscout24_de":
    case "immowelt_de":
    case "kleinanzeigen_de":
    case "wg_gesucht_de":
    case "immobilien_de":
    case "immoscout24_ch":
    case "homegate_ch":
    case "comparis_ch":
    case "flatfox_ch":
    case "newhome_ch":

      throw dispatcherError(
        "PORTAL_TRANSPORT_NOT_ENABLED",
        `Portal transport is not enabled for ${job.portal}.`
      );


    default:

      throw dispatcherError(
        "PORTAL_PROVIDER_UNSUPPORTED",
        `Unsupported portal: ${job.portal}`
      );
  }
}