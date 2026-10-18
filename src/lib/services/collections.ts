import { db } from "../db";

export async function getCollections() {
  return db.collection.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getCollectionBySlug(slug: string) {
  return db.collection.findUnique({
    where: { slug },
  });
}
