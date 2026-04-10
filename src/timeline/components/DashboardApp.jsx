import { ChevronDownIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import React, { useState } from "react";

import { AnalyticsPanels, HeaderStats } from "./DashboardSections.jsx";
import { TimelinePanel } from "./TimelinePanel.jsx";
import { useTimelineDashboardData } from "../hooks/use-timeline-dashboard-data.js";
import { useTimelineSelection } from "../hooks/use-timeline-selection.js";
import { formatRangeSelection } from "../lib/dashboard-helpers.js";
import { getTimelineText, resolveTimelineLocale } from "../../infra/i18n/timeline-locale.js";

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
  const locale = resolveTimelineLocale(data?.meta?.locale || "en");
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
  const currentRangeLabel = currentAggregate?.label || formatRangeSelection(range, currentKey, locale) || getTimelineText(locale, "notSelected");

  return (
    <div className="page-shell">
      <div className="page-bg" />
      <main className="page">
        <HeaderStats
          currentAggregate={currentAggregate}
          currentKey={currentKey}
          currentTimelineItemCount={currentTimelineItemCount}
          data={data}
          locale={locale}
          range={range}
          categories={categories}
        />

        <section className="panel screenshot-target screenshot-target-timeline">
          <div className="toolbar">
            <TabBar
              value={range}
              onChange={setRange}
              items={[
                { id: "day", label: getTimelineText(locale, "day") },
                { id: "week", label: getTimelineText(locale, "week") },
                { id: "month", label: getTimelineText(locale, "month") },
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
              locale={locale}
            />
          </div>

          {currentTimeline ? (
            <TimelinePanel timeline={currentTimeline} />
          ) : (
            <div className="empty-state">{getTimelineText(locale, "noTimeline")}</div>
          )}
        </section>

        <AnalyticsPanels
          activeDetail={activeDetail}
          categories={categories}
          categoryDetail={categoryDetail}
          chartAxisStroke={chartAxisStroke}
          chartGridStroke={chartGridStroke}
          currentAggregate={currentAggregate}
          currentRangeLabel={currentRangeLabel}
          locale={locale}
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
  locale,
}) {
  if (range === "day") {
    const dates = data?.meta?.availableDates || [];
    return (
      <RangeDropdown
        value={selectedDate}
        options={dates.map((date) => ({ value: date, label: date }))}
        onChange={onDateChange}
        locale={locale}
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
        locale={locale}
      />
    );
  }
  const months = Object.keys(data?.ranges?.month || {}).sort();
  return (
    <RangeDropdown
      value={selectedMonth}
      options={months.map((month) => ({ value: month, label: month }))}
      onChange={onMonthChange}
      locale={locale}
    />
  );
}

function RangeDropdown({ value, options, onChange, locale }) {
  const selected = options.find((option) => option.value === value) || options[0] || null;

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <div className="range-select">
        <Select.Trigger className="range-select-trigger" aria-label={getTimelineText(locale, "selectTimeRange")} data-range-trigger="true">
          <Select.Value>{selected?.label || getTimelineText(locale, "notSelected")}</Select.Value>
          <Select.Icon className="range-select-icon">
            <ChevronDownIcon aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="range-select-menu" position="popper" sideOffset={8}>
            <Select.Viewport className="range-select-viewport">
          {options.map((option) => (
            <Select.Item
              key={option.value}
              className="range-select-option"
              value={option.value}
              data-range-option-value={option.value}
              data-range-option-label={option.label}
            >
              <Select.ItemText>{option.label}</Select.ItemText>
            </Select.Item>
          ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </div>
    </Select.Root>
  );
}

function TabBar({ value, onChange, items }) {
  return (
    <div className="tabbar">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          data-range-id={item.id}
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
