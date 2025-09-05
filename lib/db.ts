import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("MONGODB_URI not set");

const cached: { client: MongoClient | null } = { client: null };

export async function getDb() {
  if (!cached.client) {
    const client = new MongoClient(uri);
    await client.connect();
    (cached as { client: MongoClient }).client = client;
  }
  return cached.client!.db(); // default DB from URI
}
