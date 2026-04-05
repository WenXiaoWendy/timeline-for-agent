import "./dashboard.css";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataSet, Timeline } from "vis-timeline/standalone/esm/vis-timeline-graph2d.mjs";

function App() {
  const chartGridStroke = "var(--chart-grid)";
  const chartAxisStroke = "var(--chart-axis)";
  const [data, setData] = useState(null);
  const [range, setRange] = useState("week");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  useEffect(() => {
    const version = typeof window !== "undefined" && window.__TIMELINE_DEV_VERSION__
      ? `?v=${window.__TIMELINE_DEV_VERSION__}`
      : "";
    fetch(`./dashboard-data.json${version}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((nextData) => {
        setData(nextData);
        const latestDate = nextData?.meta?.latestDate || "";
        const weekKeys = Object.keys(nextData?.ranges?.week || {}).sort();
        const monthKeys = Object.keys(nextData?.ranges?.month || {}).sort();
        setSelectedDate(latestDate);
        setSelectedWeek(weekKeys[weekKeys.length - 1] || "");
        setSelectedMonth(monthKeys[monthKeys.length - 1] || "");
      })
      .catch(() => {
        setData({ meta: { availableDates: [] }, ranges: { day: {}, week: {}, month: {} }, timelines: { day: {}, week: {} }, taxonomy: { categories: [] } });
      });
  }, []);

  const currentKey = range === "day" ? selectedDate : range === "week" ? selectedWeek : selectedMonth;
  const currentAggregate = data?.ranges?.[range]?.[currentKey] || null;
  const currentTimeline = useMemo(() => {
    if (range === "day") {
      return data?.timelines?.day?.[selectedDate] || null;
    }
    if (range === "week") {
      return data?.timelines?.week?.[selectedWeek] || null;
    }
    return buildMonthTimeline(data, selectedMonth);
  }, [data, range, selectedDate, selectedWeek, selectedMonth]);

  const categories = currentAggregate?.categories || [];

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategoryId("");
      return;
    }
    const defaultCategoryId = categories.some((item) => item.categoryId === "life")
      ? "life"
      : categories[0].categoryId;
    if (!selectedCategoryId || !categories.some((item) => item.categoryId === selectedCategoryId)) {
      setSelectedCategoryId(defaultCategoryId);
    }
  }, [selectedCategoryId, categories]);

  const categoryDetail = currentAggregate?.categoryDetails?.[selectedCategoryId] || null;
  const subcategoryDetail = currentAggregate?.subcategoryDetails?.[selectedSubcategoryId] || null;
  const subcategories = categoryDetail?.subcategories || [];
  const styledSubcategories = useMemo(() => {
    const maxMinutes = Math.max(...subcategories.map((item) => Number(item.minutes || 0)), 1);
    return subcategories.map((subcategory) => ({
      ...subcategory,
      shadeColor: buildScaledDepthColor(subcategory.color, Number(subcategory.minutes || 0) / maxMinutes),
    }));
  }, [subcategories]);

  useEffect(() => {
    if (!styledSubcategories.length) {
      setSelectedSubcategoryId("");
      return;
    }
    if (selectedSubcategoryId && !styledSubcategories.some((item) => item.subcategoryId === selectedSubcategoryId)) {
      setSelectedSubcategoryId("");
    }
  }, [selectedSubcategoryId, styledSubcategories]);

  const activeDetail = subcategoryDetail && subcategoryDetail.categoryId === selectedCategoryId
    ? subcategoryDetail
    : categoryDetail;
  const currentTimelineItemCount = Array.isArray(currentTimeline?.items) ? currentTimeline.items.length : 0;
  const headlineStats = [
    {
      label: "最近更新",
      value: formatDateTime(data?.meta?.updatedAt || data?.meta?.generatedAt),
    },
    {
      label: "覆盖天数",
      value: `${data?.meta?.availableDates?.length || 0} 天`,
    },
    {
      label: "当前范围",
      value: currentAggregate?.label || formatRangeSelection(range, currentKey) || "未选择",
    },
    {
      label: "总时长",
      value: currentAggregate ? formatMinutes(currentAggregate.totalMinutes) : "暂无数据",
    },
    {
      label: "时间块",
      value: currentTimelineItemCount ? `${currentTimelineItemCount} 条` : "暂无数据",
    },
    {
      label: "分类数",
      value: categories.length ? `${categories.length} 类` : "暂无数据",
    },
  ];
  return (
    <div className="page-shell">
      <div className="page-bg" />
      <main className="page">
        <section className="hero-card">
          <div className="hero-copy">
            <span className="hero-title-cn">生活轨迹</span>
            <span className="hero-title-cn">Life Tracking</span>
            <div className="hero-title-stack">
              <h1>Timeline</h1>
            </div>
          </div>
          <div className="hero-meta-grid">
            {headlineStats.map((item) => (
              <div key={item.label} className="hero-stat-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

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

        <section className="analytics-grid analytics-grid-top">
          <div className="panel chart-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h2>分布</h2>
              </div>
              <span>{currentAggregate ? formatMinutes(currentAggregate.totalMinutes) : "暂无数据"}</span>
            </div>
            {categories.length ? (
              <div className="pie-with-legend">
                <div className="pie-chart-shell">
                  <ResponsiveContainer width="100%" height={248}>
                    <PieChart>
                      <Pie
                        data={categories}
                      dataKey="minutes"
                      nameKey="label"
                      innerRadius={58}
                      outerRadius={98}
                      paddingAngle={2}
                      stroke="none"
                      labelLine={{ stroke: "rgba(127, 140, 163, 0.6)", strokeWidth: 1 }}
                      label={renderPieLabel}
                      onClick={(entry) => {
                        setSelectedCategoryId(entry.categoryId);
                        setSelectedSubcategoryId("");
                      }}
                      >
                        {categories.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <PieLegend
                  items={categories.map((category) => ({
                    id: category.categoryId,
                    label: category.label,
                    color: category.color,
                    minutes: category.minutes,
                    percent: category.percent,
                    active: selectedCategoryId === category.categoryId,
                    onClick: () => {
                      setSelectedCategoryId(category.categoryId);
                      setSelectedSubcategoryId("");
                    },
                  }))}
                />
              </div>
            ) : (
              <div className="empty-state small">当前范围还没有统计数据。</div>
            )}
          </div>

          <div className="panel list-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h2>明细</h2>
                {categoryDetail ? (
                  <span className="panel-context-pill" style={{ "--context-color": categoryDetail.color }}>
                    {categoryDetail.label}
                  </span>
                ) : null}
              </div>
              <span>{categoryDetail ? "点击子类查看趋势和事件" : "先选一个类别"}</span>
            </div>
            {styledSubcategories.length ? (
              <div className="pie-with-legend">
                <div className="pie-chart-shell">
                  <ResponsiveContainer width="100%" height={248}>
                    <PieChart>
                      <Pie
                        data={styledSubcategories}
                      dataKey="minutes"
                      nameKey="label"
                      innerRadius={58}
                      outerRadius={98}
                      paddingAngle={2}
                      stroke="none"
                      labelLine={{ stroke: "rgba(127, 140, 163, 0.6)", strokeWidth: 1 }}
                      label={renderPieLabel}
                      onClick={(entry) => setSelectedSubcategoryId(entry.subcategoryId)}
                    >
                        {styledSubcategories.map((entry) => (
                          <Cell key={entry.subcategoryId} fill={entry.shadeColor} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <PieLegend
                  items={styledSubcategories.map((subcategory) => ({
                    id: subcategory.subcategoryId,
                    label: subcategory.label,
                    color: subcategory.shadeColor,
                    minutes: subcategory.minutes,
                    percent: subcategory.percent,
                    active: selectedSubcategoryId === subcategory.subcategoryId,
                    onClick: () => setSelectedSubcategoryId(subcategory.subcategoryId),
                  }))}
                />
              </div>
            ) : (
              <div className="empty-state small">这个类别下还没有子类明细。</div>
            )}
          </div>
          <div className="panel chart-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h2>趋势</h2>
                {activeDetail ? (
                  <span className="panel-context-pill" style={{ "--context-color": activeDetail.color }}>
                    {activeDetail.label}
                  </span>
                ) : null}
              </div>
              <span>{activeDetail ? "按时间范围分布" : "先选一个类别或子类"}</span>
            </div>
            {activeDetail ? (
              <div className="trend-chart-shell">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={activeDetail.trend} margin={{ top: 28, right: 8, bottom: 6, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="label" stroke={chartAxisStroke} />
                    <YAxis stroke={chartAxisStroke} tickFormatter={formatMinutesTick} />
                    <Tooltip formatter={(value) => formatMinutes(value)} />
                    <Bar dataKey="minutes" fill={activeDetail.color} radius={[8, 8, 0, 0]}>
                      <LabelList dataKey="minutes" position="top" offset={8} formatter={formatCompactDuration} className="trend-bar-label" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state small">先从上面的类别里选一个。</div>
            )}
          </div>
        </section>

        <section className="detail-grid detail-grid-events">
          <div className="panel chart-panel event-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h2>事件</h2>
                {activeDetail ? (
                  <span className="panel-context-pill" style={{ "--context-color": activeDetail.color }}>
                    {activeDetail.label}
                  </span>
                ) : null}
              </div>
              <span>{activeDetail ? "按时间块展示" : "等待类别或子类选择"}</span>
            </div>
            {activeDetail?.events?.length ? (
              <EventBlockGrid events={activeDetail.events} color={activeDetail.color} />
            ) : (
              <div className="empty-state small">当前层级下还没有事件明细。</div>
            )}
          </div>
        </section>
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

function PieLegend({ items }) {
  return (
    <div className="pie-legend">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`pie-legend-row ${item.active ? "active" : ""}`}
          onClick={item.onClick}
        >
          <span className="dot" style={{ backgroundColor: item.color }} />
          <span className="pie-legend-label">{item.label}</span>
          <span className="pie-legend-metrics">{formatMinutes(item.minutes)} · {formatPercent(item.percent)}</span>
        </button>
      ))}
    </div>
  );
}

function renderPieLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
}) {
  const RADIAN = Math.PI / 180;
  const radius = Number(outerRadius || 0) + 18;
  const x = Number(cx || 0) + radius * Math.cos(-midAngle * RADIAN);
  const y = Number(cy || 0) + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x >= Number(cx || 0) ? "start" : "end";
  return (
    <text
      x={x}
      y={y}
      fill="var(--muted)"
      fontSize="12"
      fontWeight="500"
      textAnchor={textAnchor}
      dominantBaseline="central"
    >
      {`${name} ${formatPercent(percent)}`}
    </text>
  );
}

function EventBlockGrid({ events, color }) {
  const maxMinutes = Math.max(...events.map((event) => Number(event.minutes || 0)), 1);
  return (
    <div className="event-block-grid">
      {events.map((event) => {
        const ratio = Math.max(0, Math.min(1, Number(event.minutes || 0) / maxMinutes));
        const background = buildScaledDepthColor(color, ratio);
        return (
          <div
            key={event.eventNodeId}
            className="event-block"
            style={{ background }}
            title={`${event.fullLabel}\n${event.compactDuration}\n${event.note || ""}`}
          >
            <div className="event-block-meta">
              <span>
                {event.dateLabel ? `${event.dateLabel} | ` : ""}{event.timeLabel}
              </span>
            </div>
            <div className="event-block-title-row">
              <div className="event-block-title">{event.label}</div>
              <span className="event-block-duration">| {event.compactDuration}</span>
            </div>
            {event.note ? <div className="event-block-note">{event.note}</div> : null}
          </div>
        );
      })}
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

function buildMonthTimeline(data, monthKey) {
  if (!data || !monthKey) {
    return null;
  }
  const dates = (data?.meta?.availableDates || []).filter((date) => date.startsWith(monthKey)).sort();
  if (!dates.length) {
    return null;
  }
  const anchorDate = "2000-01-01";
  return {
    key: monthKey,
    label: monthKey,
    start: `${anchorDate}T00:00:00.000+08:00`,
    end: `${anchorDate}T23:59:59.999+08:00`,
    groups: dates.map((date) => ({
      id: date,
      content: formatMonthGroupLabel(date),
    })),
    items: dates.flatMap((date) => {
      const dayTimeline = data?.timelines?.day?.[date];
      const dayItems = Array.isArray(dayTimeline?.items) ? dayTimeline.items : [];
      return dayItems.map((item) => {
        const anchored = anchorItemRangeToReferenceDay(item.start, item.end, anchorDate);
        return {
          ...item,
          id: `${date}:${item.id}`,
          group: date,
          start: anchored.start,
          end: anchored.end,
          tooltip: {
            ...(item.tooltip || {}),
            dateText: date,
          },
        };
      });
    }),
  };
}

function anchorItemRangeToReferenceDay(startAt, endAt, anchorDate) {
  const startClock = formatClockFromIso(startAt);
  const endClock = formatClockFromIso(endAt);
  let anchoredStart = `${anchorDate}T${startClock}:00+08:00`;
  let anchoredEnd = `${anchorDate}T${endClock}:00+08:00`;
  if (Date.parse(anchoredEnd) <= Date.parse(anchoredStart)) {
    anchoredEnd = `${offsetShanghaiDate(anchorDate, 1)}T${endClock}:00+08:00`;
  }
  return { start: anchoredStart, end: anchoredEnd };
}

function formatMonthGroupLabel(date) {
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(Date.parse(`${date}T00:00:00+08:00`));
  return `${date.slice(5)} ${weekday}`;
}

function formatClockFromIso(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(Date.parse(value));
}

function offsetShanghaiDate(date, dayDelta) {
  const timestamp = Date.parse(`${date}T00:00:00+08:00`);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp + dayDelta * 24 * 60 * 60 * 1000);
}

function formatDateTime(value) {
  if (!value) {
    return "暂无";
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatRangeSelection(range, value) {
  if (!value) {
    return "";
  }
  if (range === "day") {
    return value;
  }
  if (range === "week") {
    return `周 ${value}`;
  }
  return `${value} 月`;
}

function formatMinutes(value) {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes)) {
    return "0 分钟";
  }
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} 小时 ${remaining} 分钟` : `${hours} 小时`;
}

function formatMinutesTick(value) {
  const minutes = Number(value || 0);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

function formatCompactDuration(value) {
  const minutes = Math.max(0, Number(value || 0));
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours <= 0) {
    return `${remaining}m`;
  }
  if (remaining <= 0) {
    return `${hours}h`;
  }
  return `${hours}h${remaining}m`;
}

function formatPercent(value) {
  const percent = Number(value || 0) * 100;
  if (!Number.isFinite(percent)) {
    return "0%";
  }
  return `${percent >= 10 ? percent.toFixed(0) : percent.toFixed(1)}%`;
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

function buildScaledDepthColor(color, ratio) {
  const normalized = Math.max(0, Math.min(1, Number(ratio || 0)));
  const curved = normalized ** 1.8;
  const colorWeight = Math.round(22 + (curved * 70));
  const whiteWeight = 100 - colorWeight;
  return `color-mix(in srgb, ${color} ${colorWeight}%, white ${whiteWeight}%)`;
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

createRoot(document.getElementById("root")).render(<App />);
