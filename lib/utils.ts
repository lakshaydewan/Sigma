import jsPDF from "jspdf";
import { twMerge } from "tailwind-merge";
import { type ClassValue, clsx } from "clsx";

const adjectives = [
  "Happy",
  "Creative",
  "Energetic",
  "Lively",
  "Dynamic",
  "Radiant",
  "Joyful",
  "Vibrant",
  "Cheerful",
  "Sunny",
  "Sparkling",
  "Bright",
  "Shining",
];

const animals = [
  "Dolphin",
  "Tiger",
  "Elephant",
  "Penguin",
  "Kangaroo",
  "Panther",
  "Lion",
  "Cheetah",
  "Giraffe",
  "Hippopotamus",
  "Monkey",
  "Panda",
  "Crocodile",
];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomName(): string {
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];

  return `${randomAdjective} ${randomAnimal}`;
}

/** Maps a fabric object type to the icon key and display name used in the layers panel. */
export const getShapeInfo = (shapeType: string) => {
  switch (shapeType) {
    case "rect":
      return { icon: "rectangle", name: "Rectangle" };

    case "circle":
      return { icon: "circle", name: "Ellipse" };

    case "triangle":
      return { icon: "triangle", name: "Triangle" };

    case "line":
      return { icon: "line", name: "Line" };

    case "i-text":
    case "text":
      return { icon: "text", name: "Text" };

    case "image":
      return { icon: "image", name: "Image" };

    case "freeform":
    case "path":
      return { icon: "path", name: "Drawing" };

    default:
      return { icon: "rectangle", name: shapeType };
  }
};

/** Up to two letters for a presence avatar: "Happy Dolphin" reads as "HD". */
const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "3 minutes ago" — how a file list dates things. */
export function relativeTime(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 45) return "just now";

  for (const [unit, size] of RELATIVE_UNITS) {
    if (seconds >= size) return RELATIVE_TIME.format(-Math.round(seconds / size), unit);
  }

  return "just now";
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

/** Returns a `#rrggbb` string, or null when the input isn't a usable hex colour. */
export function normalizeHex(value: string): string | null {
  const raw = (value || "").trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")}`.toLowerCase();
  }

  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : null;
}

/** Renders the visible canvas into a one-page PDF named after the current file. */
export const exportToPdf = () => {
  const canvas = document.querySelector("canvas");

  if (!canvas) return;

  const doc = new jsPDF({
    orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);

  const fileName = window.localStorage.getItem("figma:file-name") || "Untitled";
  doc.save(`${fileName}.pdf`);
};
