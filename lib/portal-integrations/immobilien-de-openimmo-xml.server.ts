import "server-only";

import {
  buildImmoweltDeOpenImmoXmlV1,
} from "./immowelt-de-openimmo-xml.server";


type BaseOpenImmoXmlInput =
  Parameters<
    typeof buildImmoweltDeOpenImmoXmlV1
  >[0];


type BaseOpenImmoXmlResult =
  ReturnType<
    typeof buildImmoweltDeOpenImmoXmlV1
  >;


/*
 * Immobilien.de XML V1 bleibt absichtlich
 * fail-closed.
 *
 * Die OpenImmo-/FTP-Grundlage ist bekannt,
 * aber das konkrete Immobilien.de-Profil
 * für openimmo_anid ist noch nicht bestätigt.
 *
 * Deshalb akzeptiert dieser Wrapper aktuell
 * bewusst KEINE Anbieter-ID.
 *
 * Erst nach Bestätigung durch Immobilien.de
 * wird die echte Portal-ID freigeschaltet.
 *
 * Keine erfundene ID.
 * Kein FTP.
 * Kein Netzwerk.
 * Kein Upload.
 * Kein Publishing.
 */
export type ImmobilienDeOpenImmoXmlInput = {
  candidate:
    BaseOpenImmoXmlInput["candidate"];

  updatedAt:
    BaseOpenImmoXmlInput["updatedAt"];

  provider:
    Omit<
      BaseOpenImmoXmlInput["provider"],
      "openImmoAnid"
    >;
};


export type ImmobilienDeOpenImmoXmlResult =
  BaseOpenImmoXmlResult & {
    portalProfileVerified:
      false;

    providerIdProfileVerified:
      false;

    portalBlocker:
      "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_UNCONFIRMED";
  };


export function buildImmobilienDeOpenImmoXmlV1(
  input:
    ImmobilienDeOpenImmoXmlInput
): ImmobilienDeOpenImmoXmlResult {

  /*
   * openImmoAnid bleibt absichtlich null.
   *
   * Dadurch blockiert der gemeinsame
   * OpenImmo-Builder die XML-Erzeugung
   * sicher, bis Immobilien.de das reale
   * Anbieter-ID-Profil bestätigt.
   */
  const result =
    buildImmoweltDeOpenImmoXmlV1({
      candidate:
        input.candidate,

      updatedAt:
        input.updatedAt,

      provider: {
        ...input.provider,

        openImmoAnid:
          null,
      },
    });


  return {
    ...result,

    portalProfileVerified:
      false,

    providerIdProfileVerified:
      false,

    portalBlocker:
      "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_UNCONFIRMED",
  };
}