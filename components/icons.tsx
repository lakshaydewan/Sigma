import * as React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

/**
 * Every icon is a 1.2px-stroke line drawing on `currentColor` so the same glyph
 * works on the dark toolbar and in the light panels. Grids differ per icon; the
 * rendered size is always driven by `size`.
 */
function Svg({
  size = 16,
  viewBox = "0 0 16 16",
  children,
  strokeWidth = 1.2,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** The Figma mark, in its five brand colours. */
export function FigmaLogo({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={(size * 38) / 57}
      height={size}
      viewBox="0 0 38 57"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="#1ABCFE" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0Z" fill="#0ACF83" />
      <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19Z" fill="#FF7262" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
    </svg>
  );
}

export const MoveIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M5.6 2.3 15.9 12.6l-5.3.3-2.6 4.8z" />
  </Svg>
);

export const RectangleIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="1.6" />
  </Svg>
);

export const EllipseIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <circle cx="10" cy="10" r="6.8" />
  </Svg>
);

export const TriangleIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M10 3.4 17 16.6H3z" />
  </Svg>
);

export const LineIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M3.6 16.4 16.4 3.6" />
  </Svg>
);

export const ImageIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <rect x="3" y="4" width="14" height="12" rx="1.6" />
    <circle cx="7.3" cy="8.2" r="1.2" />
    <path d="M3.4 14.4 7.6 10.6l2.9 2.6 2.5-2.2 3.6 3.2" />
  </Svg>
);

export const PencilIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M13.4 3.5a1.9 1.9 0 0 1 2.7 2.7l-8.4 8.5-3.5 1 1-3.5z" />
    <path d="M12.3 4.7l2.7 2.7" />
  </Svg>
);

export const PathIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M4 14.5c4.5 0 3.5-9 8-9" />
    <rect x="2.2" y="12.7" width="3.6" height="3.6" rx="0.6" />
    <rect x="14.2" y="3.7" width="3.6" height="3.6" rx="0.6" />
  </Svg>
);

export const TextIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M4 5.6V4h12v1.6" />
    <path d="M10 4.2v11.6" />
    <path d="M7.4 16h5.2" />
  </Svg>
);

export const CommentIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M17 10.4c0 3.2-3.1 5.7-7 5.7-.8 0-1.6-.1-2.4-.3l-4.1 1.4 1.2-3.4a5.2 5.2 0 0 1-1.7-3.4C3 7.2 6.1 4.7 10 4.7s7 2.5 7 5.7Z" />
  </Svg>
);

export const FrameIcon = (p: IconProps) => (
  <Svg viewBox="0 0 20 20" {...p}>
    <path d="M6.4 2.6v14.8M13.6 2.6v14.8M2.6 6.4h14.8M2.6 13.6h14.8" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 6.5 8 10l3.5-3.5" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4.5 10 8l-3.5 3.5" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={1.4}>
    <path d="M3.4 8.4 6.4 11.4 12.6 4.8" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3.4v9.2M3.4 8h9.2" />
  </Svg>
);

export const MinusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.4 8h9.2" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.2 4.8h9.6" />
    <path d="M6.4 4.8V3.6c0-.4.3-.7.7-.7h1.8c.4 0 .7.3.7.7v1.2" />
    <path d="M4.8 4.8l.5 7.6c0 .5.4.8.8.8h3.8c.4 0 .8-.3.8-.8l.5-7.6" />
  </Svg>
);

export const ResetIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5L2.6 6.6" />
    <path d="M2.4 3.2v3.5h3.5" />
  </Svg>
);

export const BringForwardIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 12.8V3.4" />
    <path d="M4.6 6.8 8 3.4l3.4 3.4" />
  </Svg>
);

export const SendBackwardIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3.2v9.4" />
    <path d="M4.6 9.2 8 12.6l3.4-3.4" />
  </Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.8 4.4 2.6 7.6l3.2 3.2" />
    <path d="M2.6 7.6h6.6a3.8 3.8 0 0 1 0 7.6H6.4" />
  </Svg>
);

export const RedoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.2 4.4l3.2 3.2-3.2 3.2" />
    <path d="M13.4 7.6H6.8a3.8 3.8 0 0 0 0 7.6h2.8" />
  </Svg>
);

export const BackIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 12.5 5.5 8 10 3.5" />
  </Svg>
);

export const MoreIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const FileIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 2.5h5L12 5.5V13.5H4z" />
    <path d="M9 2.5v3h3" />
  </Svg>
);

export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.6 9.4a2.7 2.7 0 0 0 4 .3l2-2a2.7 2.7 0 0 0-3.8-3.8l-1.1 1.1" />
    <path d="M9.4 6.6a2.7 2.7 0 0 0-4-.3l-2 2a2.7 2.7 0 0 0 3.8 3.8l1.1-1.1" />
  </Svg>
);

export const ExportIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.6v7.8" />
    <path d="M5 7.4 8 10.4l3-3" />
    <path d="M2.8 12.8h10.4" />
  </Svg>
);

export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.9 8S4.3 3.9 8 3.9 14.1 8 14.1 8 11.7 12.1 8 12.1 1.9 8 1.9 8Z" />
    <circle cx="8" cy="8" r="1.7" />
  </Svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.2 4.3A5.6 5.6 0 0 1 8 4c3.7 0 6.1 4 6.1 4a11 11 0 0 1-2 2.4" />
    <path d="M4.2 5.4A11.3 11.3 0 0 0 1.9 8S4.3 12 8 12c.8 0 1.5-.2 2.2-.4" />
    <path d="M3 3l10 10" />
  </Svg>
);

export const OpacityIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.4" />
    <path d="M8 2.6a5.4 5.4 0 0 1 0 10.8z" fill="currentColor" stroke="none" />
  </Svg>
);

export const AngleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13h10M3 13V3" />
    <path d="M3 8.4A4.6 4.6 0 0 1 7.6 13" />
  </Svg>
);

export const CornerRadiusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13V7a4 4 0 0 1 4-4h6" />
    <circle cx="12.6" cy="12.6" r="0.8" fill="currentColor" stroke="none" />
  </Svg>
);

export const IndependentCornersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6V4.5A1.5 1.5 0 0 1 4.5 3H6" />
    <path d="M10 3h1.5A1.5 1.5 0 0 1 13 4.5V6" />
    <path d="M13 10v1.5a1.5 1.5 0 0 1-1.5 1.5H10" />
    <path d="M6 13H4.5A1.5 1.5 0 0 1 3 11.5V10" />
  </Svg>
);

export const StrokeWeightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4.5h10" />
    <path d="M3 8h10" strokeWidth={1.8} />
    <path d="M3 12h10" strokeWidth={2.6} />
  </Svg>
);

export const FlipHorizontalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.5v11" strokeDasharray="2 2" />
    <path d="M6 5 3 8l3 3z" />
    <path d="M10 5l3 3-3 3z" />
  </Svg>
);

export const FlipVerticalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 8h11" strokeDasharray="2 2" />
    <path d="M5 6 8 3l3 3z" />
    <path d="M5 10l3 3 3-3z" />
  </Svg>
);

export const ShadowIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.6" cy="6.6" r="3.6" />
    <path d="M9.4 9.4a3.6 3.6 0 0 1-2.8 2.8 3.6 3.6 0 0 0 5.6-5.6 3.6 3.6 0 0 1-2.8 2.8Z" fill="currentColor" stroke="none" />
  </Svg>
);

export const TextAlignLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h10M3 7h6M3 10h9M3 13h5" />
  </Svg>
);

export const TextAlignCenterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h10M5 7h6M3.5 10h9M5.5 13h5" />
  </Svg>
);

export const TextAlignRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h10M7 7h6M4 10h9M8 13h5" />
  </Svg>
);

export const TextAlignJustifyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h10M3 7h10M3 10h10M3 13h10" />
  </Svg>
);

export const UnderlineIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 2.8v4.6a3.5 3.5 0 0 0 7 0V2.8" />
    <path d="M3.5 13.2h9" />
  </Svg>
);

export const StrikethroughIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h10" />
    <path d="M11.5 4.6C10.9 3.6 9.6 3 8 3 6.1 3 4.8 3.9 4.8 5.3c0 1 .7 1.7 2 2.2" />
    <path d="M5 11.2c.6 1.1 1.8 1.8 3.3 1.8 2 0 3.2-.9 3.2-2.3 0-.9-.5-1.6-1.5-2.1" />
  </Svg>
);

export const LineHeightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.8 3.2v9.6M1.6 4.4 2.8 3.2l1.2 1.2M1.6 11.6l1.2 1.2 1.2-1.2" />
    <path d="M6.4 4.4h7.2M6.4 8h7.2M6.4 11.6h7.2" />
  </Svg>
);

export const LetterSpacingIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.2 13.2V3.4M12.8 13.2V3.4" />
    <path d="M5.6 8h4.8M6.6 6.9 5.5 8l1.1 1.1M9.4 6.9 10.5 8l-1.1 1.1" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.2" cy="7.2" r="4.2" />
    <path d="M10.4 10.4 13.4 13.4" />
  </Svg>
);

/** Maps a shape key (from `getShapeInfo` / the nav constants) to its glyph. */
export const SHAPE_ICONS: Record<string, (p: IconProps) => React.JSX.Element> = {
  move: MoveIcon,
  rectangle: RectangleIcon,
  circle: EllipseIcon,
  triangle: TriangleIcon,
  line: LineIcon,
  image: ImageIcon,
  freeform: PencilIcon,
  path: PathIcon,
  text: TextIcon,
  comments: CommentIcon,
  frame: FrameIcon,
  delete: TrashIcon,
  reset: ResetIcon,
};

export function ShapeIcon({ name, ...props }: IconProps & { name: string }) {
  const Glyph = SHAPE_ICONS[name] ?? RectangleIcon;
  return <Glyph {...props} />;
}
