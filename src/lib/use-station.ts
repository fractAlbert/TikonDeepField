"use client";

import { useSyncExternalStore } from "react";
import {
  StationRecord,
  getServerStation,
  getStation,
  subscribeStation,
} from "./station";

/**
 * What the station remembers across careers.
 *
 * No `ensure` effect, unlike `usePlayer`: the record has nothing random in
 * it and nothing that has to exist before it is read, so the empty one is a
 * perfectly good answer until something is written.
 */
export function useStation(): StationRecord {
  return useSyncExternalStore(subscribeStation, getStation, getServerStation);
}
