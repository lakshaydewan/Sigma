import React, { useEffect, useState } from "react";
import { fabric } from "fabric";

import { Attributes, RightSidebarProps } from "@/types/type";
import {
  blendModeOptions,
  directionOptions,
  fontFamilyOptions,
  fontSizeOptions,
  fontWeightOptions,
  strokeStyleOptions,
  textAlignOptions,
} from "@/constants";
import { bringElement, modifyShape } from "@/lib/shapes";
import { exportToPdf, getShapeInfo, normalizeHex } from "@/lib/utils";
import Tooltip from "./Tooltip";
import {
  AngleIcon,
  BringForwardIcon,
  ChevronDownIcon,
  CloseIcon,
  CornerRadiusIcon,
  ExportIcon,
  IndependentCornersIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  LetterSpacingIcon,
  LineHeightIcon,
  OpacityIcon,
  PlusIcon,
  SendBackwardIcon,
  ShadowIcon,
  ShapeIcon,
  StrikethroughIcon,
  StrokeWeightIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  UnderlineIcon,
} from "./icons";

/** Properties fabric expects as numbers rather than strings. */
const NUMERIC_PROPS = new Set([
  "x",
  "y",
  "width",
  "height",
  "angle",
  "opacity",
  "strokeWidth",
  "fontSize",
  "lineHeight",
  "charSpacing",
]);

/** Display order is visual (TL, TR, BL, BR); the stored tuple is TL, TR, BR, BL. */
const CORNER_FIELDS = [
  { index: 0, label: "Top left radius", rotation: "" },
  { index: 1, label: "Top right radius", rotation: "rotate-90" },
  { index: 3, label: "Bottom left radius", rotation: "-rotate-90" },
  { index: 2, label: "Bottom right radius", rotation: "rotate-180" },
];

const TEXT_ALIGN_ICONS = {
  left: TextAlignLeftIcon,
  center: TextAlignCenterIcon,
  right: TextAlignRightIcon,
  justify: TextAlignJustifyIcon,
} as const;

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-b border-figma-border px-3 py-3">
      <div className="mb-2 flex h-5 items-center justify-between">
        <h3 className="fig-section-title">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  icon,
  label,
  children,
  title,
  suffix,
}: {
  icon?: React.ReactNode;
  label?: string;
  children: React.ReactNode;
  title?: string;
  suffix?: string;
}) {
  return (
    <label className="fig-field" title={title}>
      {icon ?? (
        <span className="w-3 shrink-0 select-none text-ui text-figma-text-secondary">
          {label}
        </span>
      )}
      {children}
      {suffix && (
        <span className="shrink-0 select-none text-ui text-figma-text-secondary">
          {suffix}
        </span>
      )}
    </label>
  );
}

function NumberField(props: {
  icon?: React.ReactNode;
  label?: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
}) {
  const {
    icon,
    label,
    title,
    value,
    onChange,
    onFocus,
    onBlur,
    min,
    max,
    step,
    suffix,
    placeholder,
  } = props;

  return (
    <Field icon={icon} label={label} title={title} suffix={suffix}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        aria-label={title}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(e) => e.stopPropagation()}
        className="fig-input tabular-nums"
      />
    </Field>
  );
}

function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="fig-field relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="fig-input cursor-pointer appearance-none pr-4"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        size={10}
        className="pointer-events-none absolute right-1.5 text-figma-text-secondary"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={`flex h-6 w-6 items-center justify-center rounded-figma-sm transition-colors ${
          active
            ? "bg-figma-blue-wash text-figma-blue"
            : "text-figma-text hover:bg-figma-hover"
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/**
 * Swatch plus hex field. The hex is edited as a draft so half-typed values don't
 * get pushed to the canvas, and the native picker sits invisibly over the swatch.
 */
function ColorRow({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "None",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const hex = normalizeHex(draft);
    if (hex) onChange(hex);
    else setDraft(value);
    onBlur();
  };

  return (
    <div className="fig-field">
      <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded-figma-sm ring-1 ring-inset ring-black/10">
        <span className="fig-checkerboard absolute inset-0" />
        <span className="absolute inset-0" style={{ backgroundColor: value || "transparent" }} />
        <input
          type="color"
          aria-label={`${label} colour`}
          value={normalizeHex(value) || "#d9d9d9"}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      <input
        aria-label={`${label} hex`}
        value={(draft || "").replace("#", "").toUpperCase()}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={onFocus}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="fig-input uppercase"
      />
    </div>
  );
}

function ExportSection() {
  return (
    <Section title="Export">
      <button
        type="button"
        onClick={exportToPdf}
        className="flex h-7 w-full items-center justify-center gap-1.5 rounded-figma
          bg-figma-hover text-ui font-medium text-figma-text transition-colors
          hover:bg-figma-border"
      >
        <ExportIcon size={13} />
        Export page as PDF
      </button>
    </Section>
  );
}

export default function RightSidebar({
  elementAttributes,
  setElementAttributes,
  fabricRef,
  activeObjectRef,
  isEditingRef,
  syncShapeInStorage,
  selection,
}: RightSidebarProps) {
  const hasSelection = selection !== null;
  const isText = selection?.type === "i-text" || selection?.type === "text";
  const isRect = selection?.type === "rect";
  const layerInfo = getShapeInfo(selection?.type ?? "");
  const [independentCorners, setIndependentCorners] = useState(false);

  const apply = (property: string, value: unknown) => {
    modifyShape({
      canvas: fabricRef.current as fabric.Canvas,
      property,
      value,
      activeObjectRef: activeObjectRef as React.MutableRefObject<fabric.Object | null>,
      syncShapeInStorage,
    });
  };

  const handleInputChange = (property: keyof Attributes, value: string | boolean) => {
    // isEditingRef is owned by the inputs' focus/blur handlers. Setting it here
    // would leave it stuck on after a toggle or a select, which has no blur —
    // and a stuck flag disables the canvas keyboard shortcuts.
    setElementAttributes((prev) => ({ ...prev, [property]: value }));
    apply(
      property,
      NUMERIC_PROPS.has(property) ? Number(value) : value
    );
  };

  const inputProps = {
    onFocus: () => {
      isEditingRef.current = true;
    },
    onBlur: () => {
      isEditingRef.current = false;
    },
  };

  /** Corner radii travel to fabric as one tuple, so compose all four on every edit. */
  const setCorners = (radii: string[]) => {
    const uniform = radii.every((r) => r === radii[0]) ? radii[0] : "";
    setElementAttributes((prev) => ({
      ...prev,
      cornerRadii: radii,
      cornerRadius: uniform,
    }));

    apply(
      "cornerRadii",
      radii.map((r) => Math.max(0, Number(r) || 0))
    );
  };

  /** The shadow is four fields that have to be pushed to fabric as one object. */
  const applyShadow = (patch: Partial<Attributes>) => {
    const next = { ...elementAttributes, ...patch };
    setElementAttributes((prev) => ({ ...prev, ...patch }));

    apply(
      "shadow",
      next.shadowEnabled
        ? {
            color: next.shadowColor || "#00000040",
            blur: Number(next.shadowBlur) || 0,
            offsetX: Number(next.shadowOffsetX) || 0,
            offsetY: Number(next.shadowOffsetY) || 0,
          }
        : null
    );
  };

  const toggle = (property: keyof Attributes) =>
    handleInputChange(property, !elementAttributes[property]);

  const cornersDiffer = !elementAttributes.cornerRadii.every(
    (r) => r === elementAttributes.cornerRadii[0]
  );
  // Unequal corners always show the four fields, whatever the toggle says.
  const showIndependentCorners = independentCorners || cornersDiffer;

  const opacityPercent = elementAttributes.opacity
    ? Math.round(Number(elementAttributes.opacity) * 100)
    : 100;

  if (!hasSelection) {
    return (
      <aside
        className="fig-scroll relative z-10 hidden h-full w-60 shrink-0 flex-col overflow-y-auto border-l
          border-figma-border bg-figma-panel md:flex"
        aria-label="Design"
      >
        <p className="border-b border-figma-border px-3 py-3 text-ui leading-4 text-figma-text-secondary">
          Select something on the canvas to edit its size, colour and text.
        </p>

        <Section title="Page">
          <div className="fig-field cursor-default">
            <span className="h-4 w-4 shrink-0 rounded-figma-sm bg-figma-canvas ring-1 ring-inset ring-black/10" />
            <span className="text-ui text-figma-text">F5F5F5</span>
          </div>
        </Section>

        <ExportSection />
      </aside>
    );
  }

  return (
    <aside
      className="fig-scroll relative z-10 hidden h-full w-60 shrink-0 flex-col overflow-y-auto border-l
        border-figma-border bg-figma-panel md:flex"
      aria-label="Design"
    >
      <Section title="Position">
        <div className="grid grid-cols-2 gap-1">
          <NumberField
            label="X"
            title="X position"
            value={elementAttributes.x}
            onChange={(v) => handleInputChange("x", v)}
            {...inputProps}
          />
          <NumberField
            label="Y"
            title="Y position"
            value={elementAttributes.y}
            onChange={(v) => handleInputChange("y", v)}
            {...inputProps}
          />
          <NumberField
            icon={<AngleIcon size={13} className="shrink-0 text-figma-text-secondary" />}
            title="Rotation"
            suffix="°"
            value={elementAttributes.angle || "0"}
            onChange={(v) => handleInputChange("angle", v)}
            {...inputProps}
          />
        </div>

        <div className="mt-1 flex items-center gap-1">
          <ToggleButton
            active={elementAttributes.flipX}
            onClick={() => toggle("flipX")}
            label="Flip horizontally"
          >
            <FlipHorizontalIcon size={14} />
          </ToggleButton>
          <ToggleButton
            active={elementAttributes.flipY}
            onClick={() => toggle("flipY")}
            label="Flip vertically"
          >
            <FlipVerticalIcon size={14} />
          </ToggleButton>

          <span className="mx-1 h-4 w-px bg-figma-border" />

          {directionOptions.map((opt) => (
            <Tooltip key={opt.value} label={opt.label}>
              <button
                type="button"
                aria-label={opt.label}
                onClick={() => {
                  const canvas = fabricRef.current as fabric.Canvas;
                  const active = canvas?.getActiveObject();

                  bringElement({ canvas, direction: opt.value, syncShapeInStorage });

                  // bringElement doesn't update activeObjectRef, so the next storage-driven
                  // re-render can't tell which object to keep selected — do it here instead.
                  if (active) {
                    (activeObjectRef as React.MutableRefObject<fabric.Object | null>).current =
                      active;
                  }
                }}
                className="flex h-6 w-6 items-center justify-center rounded-figma-sm
                  text-figma-text transition-colors hover:bg-figma-hover"
              >
                {opt.value === "front" ? (
                  <BringForwardIcon size={14} />
                ) : (
                  <SendBackwardIcon size={14} />
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </Section>

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-1">
          <NumberField
            label="W"
            title="Width"
            min={1}
            value={elementAttributes.width}
            onChange={(v) => handleInputChange("width", v)}
            {...inputProps}
          />
          <NumberField
            label="H"
            title="Height"
            min={1}
            value={elementAttributes.height}
            onChange={(v) => handleInputChange("height", v)}
            {...inputProps}
          />
        </div>

        {isRect && (
          <>
            <div className="mt-1 flex items-center gap-1">
              <div className="w-[calc(50%-2px)]">
                <NumberField
                  icon={
                    <CornerRadiusIcon
                      size={13}
                      className="shrink-0 text-figma-text-secondary"
                    />
                  }
                  title="Corner radius"
                  min={0}
                  placeholder={cornersDiffer ? "Mixed" : undefined}
                  value={elementAttributes.cornerRadius}
                  onChange={(v) => setCorners([v, v, v, v])}
                  {...inputProps}
                />
              </div>
              <ToggleButton
                active={showIndependentCorners}
                onClick={() => {
                  if (!showIndependentCorners) {
                    setIndependentCorners(true);
                    return;
                  }
                  // Collapsing relinks the corners to the top-left value.
                  setIndependentCorners(false);
                  if (cornersDiffer) {
                    setCorners(new Array(4).fill(elementAttributes.cornerRadii[0]));
                  }
                }}
                label="Independent corners"
              >
                <IndependentCornersIcon size={14} />
              </ToggleButton>
            </div>

            {showIndependentCorners && (
              <div className="mt-1 grid grid-cols-2 gap-1">
                {CORNER_FIELDS.map((corner) => (
                  <NumberField
                    key={corner.index}
                    icon={
                      <CornerRadiusIcon
                        size={13}
                        className={`shrink-0 text-figma-text-secondary ${corner.rotation}`}
                      />
                    }
                    title={corner.label}
                    min={0}
                    value={elementAttributes.cornerRadii[corner.index] ?? "0"}
                    onChange={(v) => {
                      const next = [...elementAttributes.cornerRadii];
                      next[corner.index] = v;
                      setCorners(next);
                    }}
                    {...inputProps}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="Appearance">
        <div className="grid grid-cols-2 gap-1">
          <NumberField
            icon={<OpacityIcon size={13} className="shrink-0 text-figma-text-secondary" />}
            title="Opacity"
            suffix="%"
            min={0}
            max={100}
            value={String(opacityPercent)}
            onChange={(v) =>
              handleInputChange(
                "opacity",
                String(Math.min(100, Math.max(0, Number(v))) / 100)
              )
            }
            {...inputProps}
          />
        </div>
        <div className="mt-1">
          <Select
            ariaLabel="Blend mode"
            value={elementAttributes.blendMode}
            onChange={(v) => handleInputChange("blendMode", v)}
            options={blendModeOptions}
          />
        </div>
      </Section>

      <Section title="Fill">
        <ColorRow
          label="Fill"
          value={elementAttributes.fill}
          onChange={(value) => handleInputChange("fill", value)}
          onFocus={inputProps.onFocus}
          onBlur={inputProps.onBlur}
        />
      </Section>

      <Section
        title="Stroke"
        action={
          elementAttributes.stroke ? (
            <Tooltip label="Remove stroke">
              <button
                type="button"
                aria-label="Remove stroke"
                onClick={() => {
                  handleInputChange("stroke", "");
                  handleInputChange("strokeWidth", "0");
                }}
                className="flex h-5 w-5 items-center justify-center rounded-figma-sm
                  text-figma-text-secondary transition-colors hover:bg-figma-hover
                  hover:text-figma-text"
              >
                <CloseIcon size={11} />
              </button>
            </Tooltip>
          ) : (
            <Tooltip label="Add stroke">
              <button
                type="button"
                aria-label="Add stroke"
                onClick={() => {
                  handleInputChange("stroke", "#1e1e1e");
                  handleInputChange("strokeWidth", "1");
                }}
                className="flex h-5 w-5 items-center justify-center rounded-figma-sm
                  text-figma-text-secondary transition-colors hover:bg-figma-hover
                  hover:text-figma-text"
              >
                <PlusIcon size={11} />
              </button>
            </Tooltip>
          )
        }
      >
        <ColorRow
          label="Stroke"
          value={elementAttributes.stroke}
          onChange={(value) => handleInputChange("stroke", value)}
          onFocus={inputProps.onFocus}
          onBlur={inputProps.onBlur}
        />
        {elementAttributes.stroke && (
          <div className="mt-1 grid grid-cols-2 gap-1">
            <NumberField
              icon={
                <StrokeWeightIcon size={13} className="shrink-0 text-figma-text-secondary" />
              }
              title="Stroke weight"
              min={0}
              value={elementAttributes.strokeWidth || "0"}
              onChange={(v) => handleInputChange("strokeWidth", v)}
              {...inputProps}
            />
            <Select
              ariaLabel="Stroke style"
              value={elementAttributes.strokeStyle}
              onChange={(v) => handleInputChange("strokeStyle", v)}
              options={strokeStyleOptions}
            />
          </div>
        )}
      </Section>

      <Section
        title="Effects"
        action={
          <ToggleButton
            active={elementAttributes.shadowEnabled}
            onClick={() => applyShadow({ shadowEnabled: !elementAttributes.shadowEnabled })}
            label={elementAttributes.shadowEnabled ? "Remove drop shadow" : "Add drop shadow"}
          >
            <ShadowIcon size={13} />
          </ToggleButton>
        }
      >
        {elementAttributes.shadowEnabled ? (
          <div className="flex flex-col gap-1">
            <ColorRow
              label="Shadow"
              value={elementAttributes.shadowColor}
              onChange={(value) => applyShadow({ shadowColor: value })}
              onFocus={inputProps.onFocus}
              onBlur={inputProps.onBlur}
            />
            <div className="grid grid-cols-3 gap-1">
              <NumberField
                label="X"
                title="Shadow X offset"
                value={elementAttributes.shadowOffsetX}
                onChange={(v) => applyShadow({ shadowOffsetX: v })}
                {...inputProps}
              />
              <NumberField
                label="Y"
                title="Shadow Y offset"
                value={elementAttributes.shadowOffsetY}
                onChange={(v) => applyShadow({ shadowOffsetY: v })}
                {...inputProps}
              />
              <NumberField
                label="B"
                title="Shadow blur"
                min={0}
                value={elementAttributes.shadowBlur}
                onChange={(v) => applyShadow({ shadowBlur: v })}
                {...inputProps}
              />
            </div>
          </div>
        ) : (
          <p className="text-ui text-figma-text-secondary">No effects on this layer.</p>
        )}
      </Section>

      {isText && (
        <Section title="Typography">
          <div className="flex flex-col gap-1">
            <Select
              ariaLabel="Font family"
              value={elementAttributes.fontFamily}
              onChange={(v) => handleInputChange("fontFamily", v)}
              options={fontFamilyOptions}
            />
            <div className="grid grid-cols-2 gap-1">
              <Select
                ariaLabel="Font weight"
                value={elementAttributes.fontWeight}
                onChange={(v) => handleInputChange("fontWeight", v)}
                options={fontWeightOptions}
              />
              <Select
                ariaLabel="Font size"
                value={String(elementAttributes.fontSize)}
                onChange={(v) => handleInputChange("fontSize", v)}
                options={fontSizeOptions}
              />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <NumberField
                icon={
                  <LineHeightIcon size={13} className="shrink-0 text-figma-text-secondary" />
                }
                title="Line height"
                step={0.1}
                min={0.5}
                value={elementAttributes.lineHeight}
                onChange={(v) => handleInputChange("lineHeight", v)}
                {...inputProps}
              />
              <NumberField
                icon={
                  <LetterSpacingIcon size={13} className="shrink-0 text-figma-text-secondary" />
                }
                title="Letter spacing"
                value={elementAttributes.charSpacing}
                onChange={(v) => handleInputChange("charSpacing", v)}
                {...inputProps}
              />
            </div>

            <div className="mt-1 flex items-center gap-1">
              {textAlignOptions.map((opt) => {
                const Glyph = TEXT_ALIGN_ICONS[opt.value as keyof typeof TEXT_ALIGN_ICONS];
                return (
                  <ToggleButton
                    key={opt.value}
                    active={elementAttributes.textAlign === opt.value}
                    onClick={() => handleInputChange("textAlign", opt.value)}
                    label={opt.label}
                  >
                    <Glyph size={14} />
                  </ToggleButton>
                );
              })}

              <span className="mx-1 h-4 w-px bg-figma-border" />

              <ToggleButton
                active={elementAttributes.underline}
                onClick={() => toggle("underline")}
                label="Underline"
              >
                <UnderlineIcon size={14} />
              </ToggleButton>
              <ToggleButton
                active={elementAttributes.linethrough}
                onClick={() => toggle("linethrough")}
                label="Strikethrough"
              >
                <StrikethroughIcon size={14} />
              </ToggleButton>
            </div>
          </div>
        </Section>
      )}

      <Section title="Layer">
        <div className="flex h-6 items-center gap-2 text-ui text-figma-text-secondary">
          <ShapeIcon name={layerInfo.icon} size={13} />
          {layerInfo.name}
        </div>
      </Section>

      <ExportSection />
    </aside>
  );
}
