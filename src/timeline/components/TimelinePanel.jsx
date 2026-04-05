import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DataSet, Timeline } from "vis-timeline/standalone/esm/vis-timeline-graph2d.mjs";

const TIMELINE_ZOOM_LEVELS = [
  { durationMs: 24 * 60 * 60 * 1000, timeAxis: { scale: "hour", step: 4 } },
  { durationMs: 18 * 60 * 60 * 1000, timeAxis: { scale: "hour", step: 3 } },
  { durationMs: 12 * 60 * 60 * 1000, timeAxis: { scale: "hour", step: 2 } },
  { durationMs: 8 * 60 * 60 * 1000, timeAxis: { scale: "hour", step: 2 } },
  { durationMs: 6 * 60 * 60 * 1000, timeAxis: { scale: "hour", step: 1 } },
  { durationMs: 4 * 60 * 60 * 1000, timeAxis: { scale: "minute", step: 30 } },
  { durationMs: 3 * 60 * 60 * 1000, timeAxis: { scale: "minute", step: 30 } },
  { durationMs: 2 * 60 * 60 * 1000, timeAxis: { scale: "minute", step: 20 } },
  { durationMs: 90 * 60 * 1000, timeAxis: { scale: "minute", step: 15 } },
  { durationMs: 60 * 60 * 1000, timeAxis: { scale: "minute", step: 10 } },
  { durationMs: 45 * 60 * 1000, timeAxis: { scale: "minute", step: 10 } },
  { durationMs: 30 * 60 * 1000, timeAxis: { scale: "minute", step: 5 } },
  { durationMs: 15 * 60 * 1000, timeAxis: { scale: "minute", step: 5 } },
];

function TimelinePanel({ timeline }) {
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  useVisTimeline({
    containerRef,
    timeline,
    tooltipRef,
  });

  return (
    <div className="timeline-wrap">
      <div ref={containerRef} className="timeline-canvas" />
      <TimelineTooltipPortal tooltipRef={tooltipRef} />
    </div>
  );
}

function useVisTimeline({
  containerRef,
  timeline,
  tooltipRef,
}) {
  const timelineRef = useRef(null);
  const { initialTimeAxis, resetZoom, bindWheelZoom } = useTimelineZoom({
    containerRef,
    timeline,
    timelineRef,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !timeline) {
      return undefined;
    }
    if (timelineRef.current) {
      timelineRef.current.destroy();
      timelineRef.current = null;
    }

    const items = new DataSet(timeline.items || []);
    const groups = Array.isArray(timeline.groups) && timeline.groups.length ? new DataSet(timeline.groups) : null;
    const baseOptions = {
      stack: false,
      horizontalScroll: false,
      orientation: "top",
      showCurrentTime: false,
      showTooltips: false,
      tooltip: { followMouse: true },
      zoomable: false,
      moveable: false,
      rollingMode: { follow: false },
      start: timeline.start,
      end: timeline.end,
      min: timeline.start,
      max: timeline.end,
      format: buildTimelineFormat(),
      timeAxis: initialTimeAxis,
    };
    timelineRef.current = groups
      ? new Timeline(element, items, groups, baseOptions)
      : new Timeline(element, items, baseOptions);

    resetZoom();

    const handleMove = (properties) => {
      const item = properties?.item ? items.get(properties.item) : null;
      renderTimelineTooltip(tooltipRef.current, item?.tooltip || null, properties?.event);
    };
    const handleHide = () => renderTimelineTooltip(tooltipRef.current, null);
    const cleanupZoom = bindWheelZoom(element);

    timelineRef.current.on("itemover", handleMove);
    timelineRef.current.on("itemout", handleHide);
    timelineRef.current.on("mouseMove", handleMove);

    return () => {
      cleanupZoom();
      renderTimelineTooltip(tooltipRef.current, null);
      if (timelineRef.current) {
        timelineRef.current.off("itemover", handleMove);
        timelineRef.current.off("itemout", handleHide);
        timelineRef.current.off("mouseMove", handleMove);
        timelineRef.current.destroy();
        timelineRef.current = null;
      }
    };
  }, [bindWheelZoom, containerRef, initialTimeAxis, resetZoom, timeline, tooltipRef]);

}

function useTimelineZoom({
  containerRef,
  timeline,
  timelineRef,
}) {
  const zoomLevelIndexRef = useRef(0);
  const windowRangeRef = useRef({ start: timeline?.start || "", end: timeline?.end || "" });
  const wheelDeltaAccumulatorRef = useRef(0);

  const resetZoom = useCallback(() => {
    zoomLevelIndexRef.current = 0;
    windowRangeRef.current = { start: timeline?.start || "", end: timeline?.end || "" };
    wheelDeltaAccumulatorRef.current = 0;
  }, [timeline]);

  const bindWheelZoom = useCallback((element) => {
    const wheelTarget = element.querySelector(".vis-panel.vis-center") || element;
    const handleWheel = (event) => {
      event.preventDefault();
      const normalizedDelta = Math.abs(event.deltaY) < 4
        ? event.deltaY * 12
        : event.deltaY;
      wheelDeltaAccumulatorRef.current += normalizedDelta;
      const threshold = 140;
      if (Math.abs(wheelDeltaAccumulatorRef.current) < threshold) {
        return;
      }
      const direction = wheelDeltaAccumulatorRef.current > 0 ? -1 : 1;
      wheelDeltaAccumulatorRef.current = 0;
      const nextIndex = Math.max(0, Math.min(TIMELINE_ZOOM_LEVELS.length - 1, zoomLevelIndexRef.current + direction));
      if (nextIndex === zoomLevelIndexRef.current) {
        return;
      }

      const fullStartMs = Date.parse(timeline.start);
      const fullEndMs = Date.parse(timeline.end);
      const currentStartMs = Date.parse(windowRangeRef.current.start);
      const currentEndMs = Date.parse(windowRangeRef.current.end);
      const centerPanel = element.querySelector(".vis-panel.vis-center");
      const rect = centerPanel?.getBoundingClientRect();
      const hasUsableRect = rect && rect.width > 0;
      const ratio = hasUsableRect
        ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
        : 0.5;
      const anchorMs = currentStartMs + ((currentEndMs - currentStartMs) * ratio);
      const nextDurationMs = TIMELINE_ZOOM_LEVELS[nextIndex].durationMs;
      let nextStartMs = Math.round(anchorMs - (nextDurationMs * ratio));
      let nextEndMs = nextStartMs + nextDurationMs;

      if (nextStartMs < fullStartMs) {
        nextStartMs = fullStartMs;
        nextEndMs = fullStartMs + nextDurationMs;
      }
      if (nextEndMs > fullEndMs) {
        nextEndMs = fullEndMs;
        nextStartMs = fullEndMs - nextDurationMs;
      }
      nextStartMs = Math.max(fullStartMs, nextStartMs);
      nextEndMs = Math.min(fullEndMs, nextEndMs);
      if (nextEndMs <= nextStartMs) {
        nextStartMs = fullStartMs;
        nextEndMs = fullEndMs;
      }

      const nextStart = new Date(nextStartMs).toISOString();
      const nextEnd = new Date(nextEndMs).toISOString();
      zoomLevelIndexRef.current = nextIndex;
      windowRangeRef.current = { start: nextStart, end: nextEnd };
      timelineRef.current?.setOptions({
        min: timeline.start,
        max: timeline.end,
        moveable: false,
        zoomable: false,
        timeAxis: TIMELINE_ZOOM_LEVELS[nextIndex].timeAxis,
      });
      timelineRef.current?.setWindow(nextStart, nextEnd, { animation: false });
    };

    wheelTarget.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      wheelTarget.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef, timeline, timelineRef]);

  return {
    bindWheelZoom,
    initialTimeAxis: TIMELINE_ZOOM_LEVELS[0].timeAxis,
    resetZoom,
  };
}

function TimelineTooltipPortal({ tooltipRef }) {
  const [tooltipHost, setTooltipHost] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    const host = document.createElement("div");
    host.className = "timeline-tooltip-layer";
    document.body.appendChild(host);
    setTooltipHost(host);
    return () => {
      host.remove();
      setTooltipHost(null);
    };
  }, []);

  if (!tooltipHost) {
    return null;
  }

  return createPortal(<div ref={tooltipRef} className="timeline-tooltip hidden" />, tooltipHost);
}

function renderTimelineTooltip(element, tooltip, event) {
  if (!element) {
    return;
  }
  if (!tooltip) {
    element.classList.add("hidden");
    element.innerHTML = "";
    return;
  }
  const tooltipAccent = tooltip.color || resolveTooltipAccentFromEvent(event);
  if (tooltipAccent) {
    element.style.setProperty("--tooltip-accent", tooltipAccent);
  } else {
    element.style.removeProperty("--tooltip-accent");
  }
  const metaParts = [
    tooltip.dateText ? `<span>${escapeHtml(tooltip.dateText)}</span>` : "",
    tooltip.timeText ? `<span>${escapeHtml(tooltip.timeText)}</span>` : "",
    tooltip.durationText ? `<span>${escapeHtml(tooltip.durationText)}</span>` : "",
  ].filter(Boolean);
  const noteHtml = tooltip.note
    ? `<div class="timeline-tooltip-note">${escapeHtml(tooltip.note)}</div>`
    : `<div class="timeline-tooltip-note timeline-tooltip-note-empty"></div>`;
  element.innerHTML = [
    `<strong>${escapeHtml(tooltip.title || "")}</strong>`,
    metaParts.length ? `<div class="timeline-tooltip-meta">${metaParts.join("")}</div>` : "",
    noteHtml,
  ].filter(Boolean).join("");
  element.classList.remove("hidden");
  if (event) {
    const viewportPadding = 12;
    const offset = 10;
    const clientX = Number.isFinite(event.clientX) ? event.clientX : event.pageX - window.scrollX;
    const clientY = Number.isFinite(event.clientY) ? event.clientY : event.pageY - window.scrollY;
    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding);
    const preferredTop = clientY + offset;
    const fallbackTop = clientY - rect.height - offset;
    const top = preferredTop + rect.height <= window.innerHeight - viewportPadding
      ? preferredTop
      : Math.max(viewportPadding, fallbackTop);
    const left = Math.min(Math.max(viewportPadding, clientX + offset), maxLeft);
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }
}

function resolveTooltipAccentFromEvent(event) {
  const target = event?.target;
  if (!(target instanceof Element)) {
    return "";
  }
  const item = target.closest(".vis-item");
  if (!item) {
    return "";
  }
  const categoryClasses = [
    "cat-life",
    "cat-work",
    "cat-study",
    "cat-exercise",
    "cat-entertainment",
    "cat-health",
    "cat-social",
    "cat-care",
    "cat-travel",
    "cat-rest",
  ];
  const matched = categoryClasses.find((className) => item.classList.contains(className));
  return matched ? `var(--${matched})` : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildTimelineFormat() {
  return {
    minorLabels: {
      millisecond: "HH:mm",
      second: "HH:mm",
      minute: "HH:mm",
      hour: "HH:mm",
    },
    majorLabels: {
      millisecond: "",
      second: "",
      minute: "",
      hour: "",
      day: "",
      weekday: "",
      month: "",
      year: "",
    },
  };
}

export { TimelinePanel };
