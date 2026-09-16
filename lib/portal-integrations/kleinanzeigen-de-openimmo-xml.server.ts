import "server-only";

import {
  buildImmoweltDeOpenImmoXmlV1,
} from "./immowelt-de-openimmo-xml.server";


/*
 * Kleinanzeigen akzeptiert laut aktueller
 * Portal-Dokumentation OpenImmo ab 1.2.5.
 *
 * V1 verwendet unseren bereits lokal
 * geprüften OpenImmo-XML-Builder.
 *
 * Das bedeutet ausdrücklich NICHT,
 * dass ein Kleinanzeigen-Partnerprofil
 * bereits technisch verifiziert wurde.
 *
 * Keine Netzwerkverbindung.
 * Kein FTP.
 * Kein Upload.
 * Kein Publishing.
 */
export type KleinanzeigenDeOpenImmoXmlInput =
  Parameters<
    typeof buildImmoweltDeOpenImmoXmlV1
  >[0];


export type KleinanzeigenDeOpenImmoXmlResult =
  ReturnType<
    typeof buildImmoweltDeOpenImmoXmlV1
  >;


export function buildKleinanzeigenDeOpenImmoXmlV1(
  input:
    KleinanzeigenDeOpenImmoXmlInput
): KleinanzeigenDeOpenImmoXmlResult {

  return buildImmoweltDeOpenImmoXmlV1(
    input
  );
}