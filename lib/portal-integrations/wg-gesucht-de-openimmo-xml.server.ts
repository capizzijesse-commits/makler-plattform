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
 * WG-Gesucht XML V1 bleibt absichtlich
 * fail-closed.
 *
 * Die OpenImmo-API-Grundlage ist bekannt,
 * aber folgende Partnerdetails sind noch
 * nicht technisch bestätigt:
 *
 * - API-Endpunkt
 * - Auth-Verfahren
 * - Provider-/Partner-ID-Profil
 * - konkrete Transportregeln
 *
 * Deshalb akzeptiert dieser Wrapper aktuell
 * bewusst keine openimmo_anid.
 *
 * Keine erfundene ID.
 * Kein Netzwerk.
 * Kein Upload.
 * Kein Publishing.
 */
export type WgGesuchtDeOpenImmoXmlInput = {
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


export type WgGesuchtDeOpenImmoXmlResult =
  BaseOpenImmoXmlResult & {
    apiProfileVerified:
      false;

    authProfileVerified:
      false;

    providerIdProfileVerified:
      false;

    portalBlocker:
      "WG_GESUCHT_DE_API_PROFILE_UNCONFIRMED";
  };


export function buildWgGesuchtDeOpenImmoXmlV1(
  input:
    WgGesuchtDeOpenImmoXmlInput
): WgGesuchtDeOpenImmoXmlResult {

  /*
   * openImmoAnid bleibt absichtlich null.
   *
   * Der gemeinsame OpenImmo-Builder
   * blockiert dadurch die XML-Erzeugung,
   * bis das echte WG-Gesucht Profil
   * bestätigt ist.
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

    apiProfileVerified:
      false,

    authProfileVerified:
      false,

    providerIdProfileVerified:
      false,

    portalBlocker:
      "WG_GESUCHT_DE_API_PROFILE_UNCONFIRMED",
  };
}