import { createStorage } from "@/platform/storage-impl";
import type { StorageDriver } from "./types";

let cached: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  cached ??= createStorage();
  return cached;
}

export { parseRangeHeader } from "./types";
export type { RangeSpec, StoredObject, StorageDriver } from "./types";
