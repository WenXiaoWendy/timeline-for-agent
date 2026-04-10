import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  buildScaledDepthColor,
  formatCompactDuration,
  formatDateTime,
  formatMinutes,
  formatMinutesTick,
  formatPercent,
  formatRangeSelection,
} from "../lib/dashboard-helpers.js";
import { getTimelineText } from "../../infra/i18n/timeline-locale.js";

function HeaderStats({
  currentAggregate,
  currentKey,
  currentTimelineItemCount,
  data,
  locale,
  range,
  categories,
}) {
  const headlineStats = [
    {
      label: getTimelineText(locale, "lastUpdated"),
      value: formatDateTime(data?.meta?.updatedAt || data?.meta?.generatedAt, locale),
    },
    {
      label: getTimelineText(locale, "daysCovered"),
      value: `${data?.meta?.availableDates?.length || 0} ${getTimelineText(locale, "daysSuffix")}`,
    },
    {
      label: getTimelineText(locale, "currentRange"),
      value: currentAggregate?.label || formatRangeSelection(range, currentKey, locale) || getTimelineText(locale, "notSelected"),
    },
    {
      label: getTimelineText(locale, "totalTime"),
      value: currentAggregate ? formatMinutes(currentAggregate.totalMinutes, locale) : getTimelineText(locale, "noData"),
    },
    {
      label: getTimelineText(locale, "timeBlocks"),
      value: currentTimelineItemCount ? `${currentTimelineItemCount} ${getTimelineText(locale, "blocksSuffix")}` : getTimelineText(locale, "noData"),
    },
    {
      label: getTimelineText(locale, "categories"),
      value: categories.length ? `${categories.length}` : getTimelineText(locale, "noData"),
    },
  ];

  return (
    <section className="hero-card">
      <div className="hero-copy">
        <span className="hero-title-cn">{getTimelineText(locale, "personalTimeline")}</span>
        <span className="hero-title-cn">{getTimelineText(locale, "lifeTracking")}</span>
        <div className="hero-title-stack">
          <h1>Timeline</h1>
          {data?.meta?.isDemoData ? (
            <span className="hero-demo-pill">Demo Data</span>
          ) : null}
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
  );
}

function AnalyticsPanels({
  activeDetail,
  categories,
  categoryDetail,
  chartAxisStroke,
  chartGridStroke,
  currentAggregate,
  currentRangeLabel,
  locale,
  selectedCategoryId,
  selectedSubcategoryId,
  styledSubcategories,
  onCategorySelect,
  onSubcategorySelect,
}) {
  // Recharts renders pie charts as focusable SVG nodes. On WebKit, pointer clicks can
  // briefly leave a native blue focus ring on the sector/surface even after disabling
  // the accessibility layer. Clearing focus on pointer down/up keeps the pie charts
  // visually stable. Bar charts likely need a different fix, so keep this scoped to pie.
  const handlePieChartPointerDown = (event) => {
    if (event?.detail <= 0) {
      return;
    }
    if (event.target instanceof SVGElement) {
      event.preventDefault?.();
      event.target.blur?.();
    }
  };

  const handlePieChartPointerCommit = (event) => {
    if (event?.detail <= 0) {
      return;
    }
    requestAnimationFrame(() => {
      if (event.target instanceof SVGElement) {
        event.target.blur?.();
      }
      if (document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement) {
        document.activeElement.blur?.();
      }
    });
  };

  return (
    <>
      <section className="analytics-grid analytics-grid-top screenshot-target screenshot-target-analytics">
        <div className="panel chart-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>{getTimelineText(locale, "distribution")}</h2>
            </div>
            <span>{currentRangeLabel}</span>
          </div>
          {categories.length ? (
            <div className="pie-with-legend">
              <div className="pie-chart-shell">
                <ResponsiveContainer width="100%" height={248}>
                  <PieChart accessibilityLayer={false} onMouseDown={handlePieChartPointerDown} onMouseUp={handlePieChartPointerCommit}>
                    <Pie
                      data={categories}
                      dataKey="minutes"
                      nameKey="label"
                      rootTabIndex={null}
                      innerRadius={58}
                      outerRadius={98}
                      paddingAngle={2}
                      stroke="none"
                      style={{ outline: "none" }}
                      labelLine={{ stroke: "rgba(127, 140, 163, 0.6)", strokeWidth: 1 }}
                      label={renderPieLabel}
                      onClick={(entry) => onCategorySelect(entry.categoryId)}
                    >
                      {categories.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.color} stroke="none" style={{ outline: "none" }} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <PieLegend
                locale={locale}
                items={categories.map((category) => ({
                  id: category.categoryId,
                  kind: "category",
                  label: category.label,
                  color: category.color,
                  minutes: category.minutes,
                  percent: category.percent,
                  active: selectedCategoryId === category.categoryId,
                  onClick: () => onCategorySelect(category.categoryId),
                }))}
              />
            </div>
          ) : (
            <div className="empty-state small">{getTimelineText(locale, "noDistribution")}</div>
          )}
        </div>

        <div className="panel list-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>{getTimelineText(locale, "breakdown")}</h2>
              {categoryDetail ? (
                <span className="panel-context-pill" style={{ "--context-color": categoryDetail.color }}>
                  {categoryDetail.label}
                </span>
              ) : null}
            </div>
            <span>{categoryDetail ? getTimelineText(locale, "chooseSubcategory") : getTimelineText(locale, "selectCategoryFirst")}</span>
          </div>
          {styledSubcategories.length ? (
            <div className="pie-with-legend">
              <div className="pie-chart-shell">
                <ResponsiveContainer width="100%" height={248}>
                  <PieChart accessibilityLayer={false} onMouseDown={handlePieChartPointerDown} onMouseUp={handlePieChartPointerCommit}>
                    <Pie
                      data={styledSubcategories}
                      dataKey="minutes"
                      nameKey="label"
                      rootTabIndex={null}
                      innerRadius={58}
                      outerRadius={98}
                      paddingAngle={2}
                      stroke="none"
                      style={{ outline: "none" }}
                      labelLine={{ stroke: "rgba(127, 140, 163, 0.6)", strokeWidth: 1 }}
                      label={renderPieLabel}
                      onClick={(entry) => onSubcategorySelect(entry.subcategoryId)}
                    >
                      {styledSubcategories.map((entry) => (
                        <Cell key={entry.subcategoryId} fill={entry.shadeColor} stroke="none" style={{ outline: "none" }} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <PieLegend
                locale={locale}
                items={styledSubcategories.map((subcategory) => ({
                  id: subcategory.subcategoryId,
                  kind: "subcategory",
                  label: subcategory.label,
                  color: subcategory.shadeColor,
                  minutes: subcategory.minutes,
                  percent: subcategory.percent,
                  active: selectedSubcategoryId === subcategory.subcategoryId,
                  onClick: () => onSubcategorySelect(subcategory.subcategoryId),
                }))}
              />
            </div>
          ) : (
            <div className="empty-state small">{getTimelineText(locale, "noBreakdown")}</div>
          )}
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>{getTimelineText(locale, "trend")}</h2>
              {activeDetail ? (
                <span className="panel-context-pill" style={{ "--context-color": activeDetail.color }}>
                  {activeDetail.label}
                </span>
              ) : null}
            </div>
            <span>{activeDetail ? getTimelineText(locale, "distributionAcrossRange") : getTimelineText(locale, "selectCategoryOrSubcategoryFirst")}</span>
          </div>
          {activeDetail ? (
            <div className="trend-chart-shell">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={activeDetail.trend} margin={{ top: 28, right: 8, bottom: 6, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="label" stroke={chartAxisStroke} />
                  <YAxis stroke={chartAxisStroke} tickFormatter={formatMinutesTick} />
                  <Bar dataKey="minutes" fill={activeDetail.color} radius={[8, 8, 0, 0]}>
                    <LabelList dataKey="minutes" position="top" offset={8} formatter={formatCompactDuration} className="trend-bar-label" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state small">{getTimelineText(locale, "startWithCategory")}</div>
          )}
        </div>
      </section>

      <section className="detail-grid detail-grid-events screenshot-target screenshot-target-events">
        <div className="panel chart-panel event-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>{getTimelineText(locale, "events")}</h2>
              {activeDetail ? (
                <span className="panel-context-pill" style={{ "--context-color": activeDetail.color }}>
                  {activeDetail.label}
                </span>
              ) : null}
            </div>
            <span>{currentRangeLabel}</span>
          </div>
          {activeDetail?.events?.length ? (
            <EventBlockGrid events={activeDetail.events} color={activeDetail.color} />
          ) : (
            <div className="empty-state small">{getTimelineText(locale, "noEventDetails")}</div>
          )}
        </div>
      </section>
    </>
  );
}

function PieLegend({ items, locale }) {
  return (
    <div className="pie-legend">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`pie-legend-row ${item.active ? "active" : ""}`}
          onClick={item.onClick}
          data-legend-kind={item.kind || ""}
          data-legend-id={item.id}
          data-legend-label={item.label}
        >
          <span className="dot" style={{ backgroundColor: item.color }} />
          <span className="pie-legend-label">{item.label}</span>
          <span className="pie-legend-metrics">{formatMinutes(item.minutes, locale)} · {formatPercent(item.percent)}</span>
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

export { AnalyticsPanels, HeaderStats };
