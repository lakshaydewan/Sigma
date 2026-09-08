import React from "react";

const reactions = ["👍", "❤️", "😂", "🔥", "🎉", "😢"];

type Props = {
  setReaction: (reaction: string) => void;
};

export default function ReactionSelector({ setReaction }: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Reactions"
      className="fig-pop absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5
        rounded-full bg-figma-menu px-2 py-1.5 shadow-figma-menu"
      style={{ ["--fig-pop-origin" as string]: "bottom center" }}
      onPointerMove={(e) => e.stopPropagation()}
    >
      {reactions.map((reaction) => (
        <button
          key={reaction}
          type="button"
          aria-label={`React with ${reaction}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none
            transition-transform hover:scale-125 focus-visible:scale-125"
          onPointerDown={() => setReaction(reaction)}
        >
          {reaction}
        </button>
      ))}
      <span className="ml-1 mr-1 select-none text-ui text-figma-on-dark-secondary">
        hold to spray
      </span>
    </div>
  );
}
