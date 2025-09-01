import { ObjectId } from "mongodb";

export type User = {
  _id: ObjectId;
  clerkId: string;
  name?: string;
  email?: string;
};

export type Message = {
  _id?: ObjectId;
  userId: ObjectId;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: number;
  editedAt?: number;
  metadata?: {
    attachments?: { url: string; mime: string; name?: string }[];
    source?: string;
  };
  parentMessageId?: ObjectId | null; // for conversation threading or edits
};

export type MemoryEntry = {
  _id?: ObjectId;
  userId: ObjectId;
  key: string;
  value: string;
  createdAt: number;
  updatedAt?: number;
};
