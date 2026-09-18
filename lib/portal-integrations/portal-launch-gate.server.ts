import "server-only";

import {
  getGermanPortalReliabilityReport,
  type PortalReliabilityEnvironment,
} from "@/lib/portal-integrations/portal-reliability.server";

import {
  getPortalSafetyGateReport,
} from "@/lib/portal-integrations/portal-safety-gate.server";


export type PortalLaunchGateEnvironment =
  PortalReliabilityEnvironment;


export async function getPortalLaunchGateReport(
  input?: {
    environment?:
      PortalLaunchGateEnvironment;
  }
) {

  const environment =
    input?.environment ??
    "test";


  /*
   * Beide Reports sind rein lesend.
   *
   * Keine Queue.
   * Kein Worker.
   * Kein Transport.
   * Kein Publish.
   */
  const [
    reliability,
    safety,
  ] =
    await Promise.all([
      getGermanPortalReliabilityReport({
        environment,
      }),

      getPortalSafetyGateReport({
        environment,
      }),
    ]);


  /*
   * Gate 1:
   *
   * Alle deutschen Portale brauchen
   * mindestens 100 abgeschlossene Läufe
   * und >= 95 % automatischen Erfolg.
   */
  const operationalPassed =
    reliability
      .allOperationalGatesPassed ===
    true;


  /*
   * Gate 2:
   *
   * Safety muss tatsächlich gemessen
   * worden sein UND PASS sein.
   *
   * 0 Jobs => not_measured => kein PASS.
   */
  const safetyMeasured =
    safety
      .safetyGate
      .measured ===
    true;

  const safetyPassed =
    safetyMeasured &&
    safety
      .safetyGate
      .passed ===
    true;


  /*
   * Gate 3:
   *
   * Externe Idempotency kann NICHT allein
   * aus unserer Datenbank bewiesen werden.
   *
   * Dafür braucht jeder echte Portal-
   * Transport einen kontrollierten E2E-Test:
   *
   * - gleicher Request erneut
   * - Timeout / unklare Antwort
   * - Reconciliation
   * - keine Doppelpublikation beim Portal
   *
   * Bis diese Tests implementiert und
   * nachgewiesen sind, bleibt dieses
   * Hard-Gate bewusst geschlossen.
   */
  const externalIdempotencyGate = {
    measured:
      false,

    passed:
      false,

    state:
      "not_measured" as const,
  };


  /*
   * Launch Ready ist nur TRUE,
   * wenn ALLE Hard-Gates erfüllt sind.
   */
  const launchReady =
    operationalPassed &&
    safetyPassed &&
    externalIdempotencyGate
      .passed;


  const blockers:
    string[] =
    [];


  if (!operationalPassed) {

    blockers.push(
      "OPERATIONAL_RELIABILITY_GATE_NOT_PASSED"
    );
  }


  if (!safetyMeasured) {

    blockers.push(
      "SAFETY_GATE_NOT_MEASURED"
    );
  }
  else if (!safetyPassed) {

    blockers.push(
      "SAFETY_GATE_FAILED"
    );
  }


  if (
    !externalIdempotencyGate
      .measured
  ) {

    blockers.push(
      "EXTERNAL_IDEMPOTENCY_GATE_NOT_MEASURED"
    );
  }
  else if (
    !externalIdempotencyGate
      .passed
  ) {

    blockers.push(
      "EXTERNAL_IDEMPOTENCY_GATE_FAILED"
    );
  }


  return {
    generatedAt:
      new Date()
        .toISOString(),

    environment,

    policy: {
      requiredSuccessRate:
        95,

      requiredSettledRunsPerPortal:
        100,

      zeroCriticalSafetyViolationsRequired:
        true,

      externalIdempotencyProofRequired:
        true,
    },

    gates: {

      operational: {
        passed:
          operationalPassed,

        readyPortals:
          reliability
            .readyPortals,

        passingPortals:
          reliability
            .passingPortals,

        state:
          operationalPassed
            ? "pass"
            : "fail",
      },


      safety: {
        measured:
          safetyMeasured,

        passed:
          safetyPassed,

        criticalViolations:
          safety
            .criticalViolations,

        evidenceGaps:
          safety
            .evidenceGaps
            .total,

        state:
          safety
            .safetyGate
            .state,
      },


      externalIdempotency:
        externalIdempotencyGate,
    },

    blockers,

    launchReady,

    reliabilityReport:
      reliability,

    safetyReport:
      safety,
  };
}