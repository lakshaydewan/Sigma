import { cache } from "react";

import { prisma } from "./prisma";

/**
 * The room the editor used before designs were stored in a database. It still
 * holds whatever was drawn back then, so one design points at it by name.
 */
export const LEGACY_DESIGN_ID = "legacy-my-room";
const LEGACY_ROOM_ID = "my-room";

/** The Liveblocks room a design's canvas lives in. */
export const roomIdFor = (designId: string) =>
  designId === LEGACY_DESIGN_ID ? LEGACY_ROOM_ID : `design_${designId}`;

/** What the dashboard needs. Thumbnails are large, so they are read separately. */
export type DesignSummary = {
  id: string;
  name: string;
  thumbnail: string | null;
  updatedAt: string;
};

export const listDesigns = async (): Promise<DesignSummary[]> => {
  const designs = await prisma.design.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, thumbnail: true, updatedAt: true },
  });

  // Dates don't survive the trip to a client component as Dates.
  return designs.map((design) => ({
    ...design,
    updatedAt: design.updatedAt.toISOString(),
  }));
};

/**
 * Cached for the render pass: the design route asks once for the page title and
 * once for the page itself, and that shouldn't cost two round trips to Neon.
 */
export const getDesign = cache((id: string) =>
  prisma.design.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
);
