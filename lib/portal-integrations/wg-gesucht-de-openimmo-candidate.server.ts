import "server-only";

import {
  buildImmoweltDeOpenImmoCandidate,
} from "./immowelt-de-openimmo-candidate.server";


/*
 * WG-Gesucht V1 verwendet zunächst
 * denselben konservativen deutschen
 * OpenImmo-Mapping-Kern wie unsere
 * anderen DE-OpenImmo-Portale.
 *
 * Der spätere Transport ist davon
 * bewusst getrennt:
 *
 * - kein API-Endpunkt angenommen
 * - kein Auth-Verfahren angenommen
 * - keine Partner-ID angenommen
 * - kein Netzwerkzugriff
 * - kein Upload
 * - kein Publishing
 *
 * Portal-spezifische Mapping-Regeln
 * können später hier ergänzt werden.
 */
export type WgGesuchtDeOpenImmoCandidateInput =
  Parameters<
    typeof buildImmoweltDeOpenImmoCandidate
  >[0];


export type WgGesuchtDeOpenImmoCandidate =
  ReturnType<
    typeof buildImmoweltDeOpenImmoCandidate
  >;


export function buildWgGesuchtDeOpenImmoCandidate(
  input:
    WgGesuchtDeOpenImmoCandidateInput
): WgGesuchtDeOpenImmoCandidate {

  return buildImmoweltDeOpenImmoCandidate(
    input
  );
}