import React, { useEffect, useRef, useState } from "react";

import { AnalyticsPanels, HeaderStats } from "./dashboard-sections.jsx";
import { TimelinePanel } from "./timeline-panel.jsx";
import { useTimelineDashboardData } from "../hooks/use-timeline-dashboard-data.js";
import { useTimelineSelection } from "../hooks/use-timeline-selection.js";

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

export { DashboardApp };
