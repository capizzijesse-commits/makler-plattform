/*
 * Development-only access gate for Inserat-AI E2E automation tests.
 *
 * IMPORTANT:
 * - production always returns false
 * - only the explicitly named synthetic test objects are allowed
 * - this is NOT a payment/unlock replacement
 */

export const DEVELOPMENT_E2E_PROJECT_NAME =
  "E2E Automation Test Oberlunkhofen";

export const DEVELOPMENT_E2E_PROJECT_NAME_DE =
  "E2E Automation Test Berlin";


export function isDevelopmentE2EListing(
  projectName: unknown
): boolean {

  return (
    process.env.NODE_ENV ===
      "development" &&
    (
      projectName ===
        DEVELOPMENT_E2E_PROJECT_NAME ||
      projectName ===
        DEVELOPMENT_E2E_PROJECT_NAME_DE
    )
  );
}
