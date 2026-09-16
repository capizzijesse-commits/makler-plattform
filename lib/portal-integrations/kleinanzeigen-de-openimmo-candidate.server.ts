import "server-only";

import {
  buildImmoweltDeOpenImmoCandidate,
} from "./immowelt-de-openimmo-candidate.server";


export const KLEINANZEIGEN_DE_OPENIMMO_MINIMUM_VERSION =
  "1.2.5" as const;


/*
 * Kleinanzeigen V1 verwendet zunächst
 * denselben konservativen DE-OpenImmo-
 * Mapping-Kern wie immowelt.
 *
 * Portal-spezifische Abweichungen können
 * später hier ergänzt werden, ohne den
 * immowelt-Adapter zu verändern.
 *
 * Keine Netzwerkverbindung.
 * Kein FTP.
 * Kein Publishing.
 */
export type KleinanzeigenDeOpenImmoCandidateInput =
  Parameters<
    typeof buildImmoweltDeOpenImmoCandidate
  >[0];


export type KleinanzeigenDeOpenImmoCandidate =
  ReturnType<
    typeof buildImmoweltDeOpenImmoCandidate
  >;


export function buildKleinanzeigenDeOpenImmoCandidate(
  input:
    KleinanzeigenDeOpenImmoCandidateInput
): KleinanzeigenDeOpenImmoCandidate {

  return buildImmoweltDeOpenImmoCandidate(
    input
  );
}