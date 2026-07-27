import { Region } from "@/lib/puzzle-types";
import { region2 } from "./region-2";

export const regions: Region[] = [region2];

export function getRegion(id: string): Region | undefined {
  return regions.find((r) => r.id === id);
}
