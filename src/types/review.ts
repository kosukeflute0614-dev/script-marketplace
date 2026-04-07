// Review types matching docs/spec.md §5

import type { Timestamp } from "firebase/firestore";

export type ReviewDoc = {
  reviewerUid: string;
  reviewerDisplayName: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
};

export type SerializedReview = Omit<ReviewDoc, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
