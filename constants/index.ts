/** Presence colours, matched to Figma's multiplayer cursor palette. */
export const COLORS = ["#0d99ff", "#0acf83", "#a259ff", "#ff7262", "#ffc700", "#f24822"];

export const shapeElements = [
  { icon: "rectangle", name: "Rectangle", value: "rectangle", shortcut: "R" },
  { icon: "circle", name: "Ellipse", value: "circle", shortcut: "O" },
  { icon: "triangle", name: "Triangle", value: "triangle", shortcut: "" },
  { icon: "line", name: "Line", value: "line", shortcut: "L" },
  { icon: "image", name: "Place image…", value: "image", shortcut: "⇧⌘K" },
];

export const navElements = [
  { icon: "move", name: "Move", value: "select", shortcut: "V" },
  { icon: "rectangle", name: "Shape", value: shapeElements, shortcut: "R" },
  { icon: "freeform", name: "Pencil", value: "freeform", shortcut: "P" },
  { icon: "text", name: "Text", value: "text", shortcut: "T" },
  { icon: "comments", name: "Comment", value: "comments", shortcut: "C" },
];

export const defaultNavElement = {
  icon: "move",
  name: "Move",
  value: "select",
};

/** Single-key shortcuts that pick a tool, keyed by the lowercased key. */
export const toolShortcuts: Record<string, string> = {
  v: "select",
  r: "rectangle",
  o: "circle",
  l: "line",
  p: "freeform",
  t: "text",
  c: "comments",
};

export const directionOptions = [
  { label: "Bring to front", value: "front", icon: "front" },
  { label: "Send to back", value: "back", icon: "back" },
];

export const fontFamilyOptions = [
  { value: "Inter", label: "Inter" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Comic Sans MS", label: "Comic Sans MS" },
  { value: "Brush Script MT", label: "Brush Script MT" },
];

export const fontSizeOptions = [
  "10", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "64", "96",
].map((value) => ({ value, label: value }));

export const fontWeightOptions = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
];

export const strokeStyleOptions = [
  { value: "solid", label: "Solid" },
  { value: "dash", label: "Dash" },
  { value: "dot", label: "Dot" },
];

export const textAlignOptions = [
  { value: "left", label: "Align left" },
  { value: "center", label: "Align centre" },
  { value: "right", label: "Align right" },
  { value: "justify", label: "Justify" },
];

/** Canvas composite operations, labelled the way Figma labels its blend modes. */
export const blendModeOptions = [
  { value: "source-over", label: "Normal" },
  { value: "darken", label: "Darken" },
  { value: "multiply", label: "Multiply" },
  { value: "color-burn", label: "Colour burn" },
  { value: "lighten", label: "Lighten" },
  { value: "screen", label: "Screen" },
  { value: "color-dodge", label: "Colour dodge" },
  { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft light" },
  { value: "hard-light", label: "Hard light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "color", label: "Colour" },
  { value: "luminosity", label: "Luminosity" },
];

export const alignmentOptions = [
  { value: "left", label: "Align left", icon: "/assets/align-left.svg" },
  {
    value: "horizontalCenter",
    label: "Align horizontal centers",
    icon: "/assets/align-horizontal-center.svg",
  },
  { value: "right", label: "Align right", icon: "/assets/align-right.svg" },
  { value: "top", label: "Align top", icon: "/assets/align-top.svg" },
  {
    value: "verticalCenter",
    label: "Align vertical centers",
    icon: "/assets/align-vertical-center.svg",
  },
  { value: "bottom", label: "Align bottom", icon: "/assets/align-bottom.svg" },
];

/** Shown in the help menu; the source of truth is the handlers in lib/key-events.ts. */
export const shortcuts = [
  { key: "move", name: "Move tool", shortcut: "V" },
  { key: "shape", name: "Rectangle", shortcut: "R" },
  { key: "ellipse", name: "Ellipse", shortcut: "O" },
  { key: "line", name: "Line", shortcut: "L" },
  { key: "pencil", name: "Pencil", shortcut: "P" },
  { key: "text", name: "Text", shortcut: "T" },
  { key: "comment", name: "Comment", shortcut: "C" },
  { key: "chat", name: "Cursor chat", shortcut: "/" },
  { key: "reactions", name: "Reactions", shortcut: "E" },
  { key: "undo", name: "Undo", shortcut: "⌘Z" },
  { key: "redo", name: "Redo", shortcut: "⌘Y" },
  { key: "delete", name: "Delete selection", shortcut: "⌫" },
  { key: "zoom-in", name: "Zoom in", shortcut: "+" },
  { key: "zoom-out", name: "Zoom out", shortcut: "−" },
  { key: "zoom-reset", name: "Zoom to 100%", shortcut: "⇧0" },
];
