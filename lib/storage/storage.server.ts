import {
  createR2PresignedReadUrl,
  r2Storage,
} from "./r2-storage.server";

import type {
  StorageObject,
  StorageProvider,
  StoragePutInput,
} from "./storage.types";

export type StorageProviderName =
  | "r2";

function configuredProviderName():
  StorageProviderName {
  const raw =
    process.env.STORAGE_PROVIDER
      ?.trim()
      .toLowerCase();

  if (
    !raw ||
    raw === "r2"
  ) {
    return "r2";
  }

  throw new Error(
    `Unsupported storage provider: ${raw}`
  );
}

function providerFor(
  name: StorageProviderName
): StorageProvider {
  switch (name) {
    case "r2":
      return r2Storage;
  }
}

function currentProvider():
  StorageProvider {
  return providerFor(
    configuredProviderName()
  );
}

export async function putObject(
  input: StoragePutInput
): Promise<StorageObject> {
  return currentProvider().put(
    input
  );
}

export async function headObject(
  pathname: string
): Promise<StorageObject> {
  return currentProvider().head(
    pathname
  );
}

export async function getObjectBytes(
  pathname: string
): Promise<Uint8Array> {
  return currentProvider().getBytes(
    pathname
  );
}

export async function deleteObjects(
  pathname:
    | string
    | string[]
): Promise<void> {
  await currentProvider().delete(
    pathname
  );
}

export async function createStorageReadUrl(
  pathname: string,
  expiresInSeconds = 300
): Promise<string> {
  switch (
    configuredProviderName()
  ) {
    case "r2":
      return createR2PresignedReadUrl({
        pathname,
        expiresInSeconds,
      });
  }
}

export function storageProviderName():
  StorageProviderName {
  return configuredProviderName();
}
