import { notFound } from "next/navigation";

import { Room } from "@/app/Room";
import Editor from "@/components/Editor";
import { getDesign, roomIdFor } from "@/lib/designs";

type Props = { params: { id: string } };

export const dynamic = "force-dynamic";

export default async function DesignPage({ params }: Props) {
  const design = await getDesign(params.id);
  if (!design) notFound();

  return (
    // The room is named after the design, so each one has its own canvas,
    // cursors and comment threads.
    <Room roomId={roomIdFor(design.id)} name={design.name}>
      <Editor designId={design.id} initialName={design.name} />
    </Room>
  );
}
