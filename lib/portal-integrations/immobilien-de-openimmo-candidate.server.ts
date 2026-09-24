import "server-only";

import {
  buildImmoweltDeOpenImmoCandidate,
} from "./immowelt-de-openimmo-candidate.server";


/*
 * Immobilien.de unterstützt laut
 * aktueller Portalgrundlage die
 * Übertragung aus Maklersoftware
 * über OpenImmo per FTP.
 *
 * Candidate V1 verwendet zunächst
 * denselben konservativen deutschen
 * OpenImmo-Mapping-Kern wie die
 * anderen OpenImmo-Portale.
 *
 * Portal-spezifische Regeln bleiben
 * in diesem Adapter isoliert.
 *
 * Keine FTP-Verbindung.
 * Kein Netzwerkzugriff.
 * Kein Upload.
 * Kein Publishing.
 */
export type ImmobilienDeOpenImmoCandidateInput =
  Parameters<
    typeof buildImmoweltDeOpenImmoCandidate
  >[0];


export type ImmobilienDeOpenImmoCandidate =
  ReturnType<
    typeof buildImmoweltDeOpenImmoCandidate
  >;


export function buildImmobilienDeOpenImmoCandidate(
  input:
    ImmobilienDeOpenImmoCandidateInput
): ImmobilienDeOpenImmoCandidate {

  return buildImmoweltDeOpenImmoCandidate(
    input
  );
}