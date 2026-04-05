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
  Tooltip,
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
} from "../data/dashboard-helpers.js";

function HeaderStats({
  currentAggregate,
  currentKey,
  currentTimelineItemCount,
  data,
  range,
  categories,
}) {
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
    <section className="hero-card">
      <div className="hero-copy">
        <span className="hero-title-cn">生活轨迹</span>
        <span className="hero-title-cn">Life Tracking</span>
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
  selectedCategoryId,
  selectedSubcategoryId,
  styledSubcategories,
  onCategorySelect,
  onSubcategorySelect,
}) {
  return (
    <>
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
                      onClick={(entry) => onCategorySelect(entry.categoryId)}
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
                  onClick: () => onCategorySelect(category.categoryId),
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
                      onClick={(entry) => onSubcategorySelect(entry.subcategoryId)}
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
                  onClick: () => onSubcategorySelect(subcategory.subcategoryId),
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
    </>
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

export { AnalyticsPanels, HeaderStats };
