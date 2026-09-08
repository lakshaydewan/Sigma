/** Figma's pointer: a filled arrow in the user's colour with a white keyline. */
function CursorSVG({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="24"
      viewBox="0 0 20 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
      aria-hidden="true"
    >
      <path
        d="M2.6 1.4 15.9 13.4l-6.4.4-3.3 6.2z"
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CursorSVG;
