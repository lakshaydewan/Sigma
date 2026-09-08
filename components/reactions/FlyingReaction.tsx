import React from "react";

type Props = {
  x: number;
  y: number;
  timestamp: number;
  value: string;
};

export default function FlyingReaction({ x, y, timestamp, value }: Props) {
  return (
    <div
      key={timestamp}
      className="pointer-events-none absolute left-0 top-0 z-30 select-none text-2xl leading-none"
      style={{ transform: `translateX(${x}px) translateY(${y}px)` }}
    >
      <div className="reaction-fly-inner">{value}</div>
    </div>
  );
}
