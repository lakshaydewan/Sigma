"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const MAX_NAME_LENGTH = 80;
/** Roughly 1.5 MB of base64 — far above what a 480px JPEG needs. */
const MAX_THUMBNAIL_LENGTH = 2_000_000;

const cleanName = (name: string) => name.trim().slice(0, MAX_NAME_LENGTH) || "Untitled";

/** Creates an empty design and opens it. The editor seeds the starter screen. */
export async function createDesign(name?: string) {
  const design = await prisma.design.create({
    data: { name: name ? cleanName(name) : "Untitled" },
  });

  revalidatePath("/dashboard");
  redirect(`/design/${design.id}`);
}

export async function renameDesign(id: string, name: string) {
  await prisma.design.update({
    where: { id },
    data: { name: cleanName(name) },
  });

  revalidatePath("/dashboard");
}

export async function deleteDesign(id: string) {
  await prisma.design.delete({ where: { id } });

  // The Liveblocks room outlives the row — deleting one needs a secret key,
  // which this app doesn't hold. Nothing links to it any more.
  revalidatePath("/dashboard");
}

/**
 * Stores the canvas preview shown on the dashboard. This is also what marks a
 * design as edited, since `updatedAt` moves with it.
 */
export async function saveThumbnail(id: string, thumbnail: string) {
  if (!thumbnail.startsWith("data:image/") || thumbnail.length > MAX_THUMBNAIL_LENGTH) {
    return;
  }

  // A design open in a tab while it is deleted elsewhere would throw here.
  await prisma.design.updateMany({ where: { id }, data: { thumbnail } });

  revalidatePath("/dashboard");
}
