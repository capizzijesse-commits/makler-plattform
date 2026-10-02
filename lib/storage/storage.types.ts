export type StorageObject = {
  pathname: string;
  url: string;
  contentType: string;
  size: number;
};

export type StoragePutInput = {
  pathname: string;
  body: Uint8Array;
  contentType: string;
};

export interface StorageProvider {
  put(
    input: StoragePutInput
  ): Promise<StorageObject>;

  head(
    pathname: string
  ): Promise<StorageObject>;

  getBytes(
    pathname: string
  ): Promise<Uint8Array>;

  delete(
    pathname:
      | string
      | string[]
  ): Promise<void>;
}
