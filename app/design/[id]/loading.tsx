import EditorSkeleton from "@/components/skeletons/EditorSkeleton";

// The design's name isn't known yet here; the room's fallback fills it in the
// moment the row arrives, without the frame around it changing.
export default function Loading() {
  return <EditorSkeleton />;
}
