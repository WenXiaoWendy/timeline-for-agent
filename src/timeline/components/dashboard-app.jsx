import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DataSet, Timeline } from "vis-timeline/standalone/esm/vis-timeline-graph2d.mjs";

import { AnalyticsPanels, HeaderStats } from "./dashboard-sections.jsx";
import { useTimelineDashboardData } from "../data/use-timeline-dashboard-data.js";
import { useTimelineSelection } from "../data/use-timeline-selection.js";

function DashboardApp() {
  const chartGridStroke = "var(--chart-grid)";
  const chartAxisStroke = "var(--chart-axis)";
  const {
    data,
    selectedDate,
    selectedMonth,
    selectedWeek,
    setSelectedDate,
    setSelectedMonth,
    setSelectedWeek,
  } = useTimelineDashboardData();
  const [range, setRange] = useState("week");
  const {
    activeDetail,
    categories,
    categoryDetail,
    currentAggregate,
    currentKey,
    currentTimeline,
    currentTimelineItemCount,
    selectedCategoryId,
    selectedSubcategoryId,
    selectCategory,
    selectSubcategory,
    styledSubcategories,
  } = useTimelineSelection({
    data,
    range,
    selectedDate,
    selectedMonth,
    selectedWeek,
  });

  return (
    <div className="page-shell">
      <div className="page-bg" />
      <main className="page">
        <HeaderStats
          currentAggregate={currentAggregate}
          currentKey={currentKey}
          currentTimelineItemCount={currentTimelineItemCount}
          data={data}
          range={range}
          categories={categories}
        />

        <section className="panel">
          <div className="toolbar">
            <TabBar
              value={range}
              onChange={setRange}
              items={[
                { id: "day", label: "日" },
                { id: "week", label: "周" },
                { id: "month", label: "月" },
              ]}
            />
            <RangeSelector
              range={range}
              selectedDate={selectedDate}
              selectedWeek={selectedWeek}
              selectedMonth={selectedMonth}
              onDateChange={setSelectedDate}
              onWeekChange={setSelectedWeek}
              onMonthChange={setSelectedMonth}
              data={data}
            />
          </div>

          {currentTimeline ? (
            <TimelinePanel timeline={currentTimeline} />
          ) : (
            <div className="empty-state">这个范围没有可渲染的时间轴，先生成当天数据。</div>
          )}
        </section>

        <AnalyticsPanels
          activeDetail={activeDetail}
          categories={categories}
          categoryDetail={categoryDetail}
          chartAxisStroke={chartAxisStroke}
          chartGridStroke={chartGridStroke}
          currentAggregate={currentAggregate}
          selectedCategoryId={selectedCategoryId}
          selectedSubcategoryId={selectedSubcategoryId}
          styledSubcategories={styledSubcategories}
          onCategorySelect={selectCategory}
          onSubcategorySelect={selectSubcategory}
        />
      </main>
    </div>
  );
}

function RangeSelector({
  range,
  selectedDate,
  selectedWeek,
  selectedMonth,
  onDateChange,
  onWeekChange,
  onMonthChange,
  data,
}) {
  if (range === "day") {
    const dates = data?.meta?.availableDates || [];
    return (
      <RangeDropdown
        value={selectedDate}
        options={dates.map((date) => ({ value: date, label: date }))}
        onChange={onDateChange}
      />
    );
  }
  if (range === "week") {
    const weeks = Object.keys(data?.ranges?.week || {}).sort();
    return (
      <RangeDropdown
        value={selectedWeek}
        options={weeks.map((week) => ({ value: week, label: week }))}
        onChange={onWeekChange}
      />
    );
  }
  const months = Object.keys(data?.ranges?.month || {}).sort();
  return (
    <RangeDropdown
      value={selectedMonth}
      options={months.map((month) => ({ value: month, label: month }))}
      onChange={onMonthChange}
    />
  );
}

function RangeDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0] || null;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`range-select ${open ? "open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="range-select-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : "false"}
      >
        <span>{selected?.label || "未选择"}</span>
        <span className="range-select-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="range-select-menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`range-select-option ${option.value === value ? "active" : ""}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TabBar({ value, onChange, items }) {
  return (
    <div className="tabbar">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={value === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TimelinePanel({ timeline }) {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const tooltipRef = useRef(null);
  const zoomLevelIndexRef = useRef(0);
  const windowRangeRef = useRef({ start: timeline?.start || "", end: timeline?.end || "" });
  const wheelDeltaAccumulatorRef = useRef(0);
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

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !timeline) {
      return undefined;
    }
    if (timelineRef.current) {
      timelineRef.current.destroy();
      timelineRef.current = null;
    }
    const zoomLevels = [
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
    zoomLevelIndexRef.current = 0;
    windowRangeRef.current = { start: timeline.start, end: timeline.end };
    wheelDeltaAccumulatorRef.current = 0;
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
      timeAxis: zoomLevels[zoomLevelIndexRef.current].timeAxis,
    };
    timelineRef.current = groups
      ? new Timeline(element, items, groups, baseOptions)
      : new Timeline(element, items, baseOptions);

    syncTimelineCornerGuides(element);

    const wheelTarget = element.querySelector(".vis-panel.vis-center") || element;

    const handleMove = (properties) => {
      const item = properties?.item ? items.get(properties.item) : null;
      renderTimelineTooltip(tooltipRef.current, item?.tooltip || null, properties?.event);
    };
    const handleHide = () => renderTimelineTooltip(tooltipRef.current, null);
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
      const nextIndex = Math.max(0, Math.min(zoomLevels.length - 1, zoomLevelIndexRef.current + direction));
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
      const nextDurationMs = zoomLevels[nextIndex].durationMs;
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
        timeAxis: zoomLevels[nextIndex].timeAxis,
      });
      timelineRef.current?.setWindow(nextStart, nextEnd, { animation: false });
      requestAnimationFrame(() => {
        syncTimelineCornerGuides(element);
      });
    };
    timelineRef.current.on("itemover", handleMove);
    timelineRef.current.on("itemout", handleHide);
    timelineRef.current.on("mouseMove", handleMove);
    wheelTarget.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      renderTimelineTooltip(tooltipRef.current, null);
      if (timelineRef.current) {
        timelineRef.current.off("itemover", handleMove);
        timelineRef.current.off("itemout", handleHide);
        timelineRef.current.off("mouseMove", handleMove);
        timelineRef.current.destroy();
        timelineRef.current = null;
      }
      wheelTarget.removeEventListener("wheel", handleWheel);
    };
  }, [timeline]);

  return (
    <div className="timeline-wrap">
      <div ref={containerRef} className="timeline-canvas" />
      <div className="timeline-corner" aria-hidden="true" />
      {tooltipHost ? createPortal(<div ref={tooltipRef} className="timeline-tooltip hidden" />, tooltipHost) : null}
    </div>
  );
}

function syncTimelineCornerGuides(element) {
  if (!element) {
    return;
  }
  const topPanel = element.querySelector(".vis-panel.vis-top");
  const leftPanel = element.querySelector(".vis-panel.vis-left");
  const headerHeight = Math.round(topPanel?.getBoundingClientRect().height || 24);
  const labelWidth = Math.round(leftPanel?.getBoundingClientRect().width || 36);
  element.style.setProperty("--timeline-header-height", `${headerHeight}px`);
  element.style.setProperty("--timeline-label-width", `${labelWidth}px`);
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

export { DashboardApp };
