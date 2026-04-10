// Saved search types matching docs/spec.md §5

import type { Timestamp } from "firebase/firestore";

export type SavedSearchFilters = {
  query?: string;
  genres?: string[];
  performanceType?: string[];
  targetAudience?: string[];
  themeTags?: string[];
  scriptTags?: string[];
  priceMin?: number;
  priceMax?: number;
  feeScheduleMax?: number;
  castMin?: number;
  castMax?: number;
  durationMin?: number;
  durationMax?: number;
  isFreeFullText?: boolean;
  sort?: string;
};

export type SavedSearchDoc = {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  createdAt: Timestamp | Date;
};

export type SerializedSavedSearch = {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  createdAt: string;
};
