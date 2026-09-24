import "server-only";

import type {
  KleinanzeigenDeLocalTransferArtifactV1,
} from "./kleinanzeigen-de-transport-foundation.server";

import type {
  KleinanzeigenDeFtpTestConfig,
} from "./kleinanzeigen-de-ftp-config.server";


export type KleinanzeigenDeFtpMockUploadOutcome =
  | {
      state:
        "uploaded";

      remotePath:
        string;
    }
  | {
      state:
        "failed_before_transfer";

      message?:
        string;
    }
  | {
      state:
        "ambiguous_after_transfer_start";

      message?:
        string;
    };


export type KleinanzeigenDeFtpMockClient = {
  mode:
    "mock";

  upload:
    (
      input: {
        host:
          string;

        username:
          string;

        password:
          string;

        fileName:
          string;

        contents:
          string;

        sha256:
          string;
      }
    ) =>
      Promise<
        KleinanzeigenDeFtpMockUploadOutcome
      >;
};


export type KleinanzeigenDeFtpMockResult = {
  portal:
    "kleinanzeigen_de";

  environment:
    "test";

  mode:
    "ftp_mock_only";

  networkAttempted:
    false;

  uploaded:
    true;

  fileName:
    string;

  remotePath:
    string;

  sha256:
    string;
};


export class KleinanzeigenDeFtpTransportError
  extends Error {

  readonly code:
    | "KLEINANZEIGEN_FTP_MOCK_ONLY"
    | "KLEINANZEIGEN_FTP_UPLOAD_FAILED_BEFORE_TRANSFER"
    | "PORTAL_RECONCILIATION_REQUIRED";


  constructor(
    code:
      | "KLEINANZEIGEN_FTP_MOCK_ONLY"
      | "KLEINANZEIGEN_FTP_UPLOAD_FAILED_BEFORE_TRANSFER"
      | "PORTAL_RECONCILIATION_REQUIRED",

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "KleinanzeigenDeFtpTransportError";

    this.code =
      code;
  }
}


export async function executeKleinanzeigenDeFtpMockUploadV1(
  input: {
    artifact:
      KleinanzeigenDeLocalTransferArtifactV1;

    config:
      KleinanzeigenDeFtpTestConfig;

    client:
      KleinanzeigenDeFtpMockClient;
  }
):
  Promise<
    KleinanzeigenDeFtpMockResult
  > {

  const {
    artifact,
    config,
    client,
  } =
    input;


  /*
   * V1 akzeptiert ausschließlich
   * einen expliziten Mock-Client.
   *
   * Kein echter FTP-Client kann
   * versehentlich hineingereicht werden.
   */
  if (
    client.mode !==
    "mock"
  ) {
    throw new KleinanzeigenDeFtpTransportError(
      "KLEINANZEIGEN_FTP_MOCK_ONLY",
      "FTP Transport V1 erlaubt ausschließlich den lokalen Mock-Client."
    );
  }


  if (
    artifact.environment !==
      "test" ||
    artifact.portal !==
      "kleinanzeigen_de"
  ) {
    throw new KleinanzeigenDeFtpTransportError(
      "KLEINANZEIGEN_FTP_MOCK_ONLY",
      "FTP Mock Transport ist ausschließlich für Kleinanzeigen-DE Testartefakte erlaubt."
    );
  }


  const outcome =
    await client.upload({
      host:
        config.host,

      username:
        config.username,

      password:
        config.password,

      fileName:
        artifact.fileName,

      contents:
        artifact.xml,

      sha256:
        artifact.sha256,
    });


  if (
    outcome.state ===
    "failed_before_transfer"
  ) {

    throw new KleinanzeigenDeFtpTransportError(
      "KLEINANZEIGEN_FTP_UPLOAD_FAILED_BEFORE_TRANSFER",
      outcome.message ??
      "FTP Upload ist vor Transferbeginn fehlgeschlagen."
    );
  }


  /*
   * Sobald nicht mehr sicher beweisbar ist,
   * ob die Datei beim Portal angekommen ist,
   * darf NICHT blind erneut gesendet werden.
   *
   * Der Worker kennt diesen Code bereits
   * und schickt den Job in Reconciliation.
   */
  if (
    outcome.state ===
    "ambiguous_after_transfer_start"
  ) {

    throw new KleinanzeigenDeFtpTransportError(
      "PORTAL_RECONCILIATION_REQUIRED",
      outcome.message ??
      "FTP Uploadzustand ist nach Transferbeginn unklar."
    );
  }


  return {
    portal:
      "kleinanzeigen_de",

    environment:
      "test",

    mode:
      "ftp_mock_only",

    networkAttempted:
      false,

    uploaded:
      true,

    fileName:
      artifact.fileName,

    remotePath:
      outcome.remotePath,

    sha256:
      artifact.sha256,
  };
}
