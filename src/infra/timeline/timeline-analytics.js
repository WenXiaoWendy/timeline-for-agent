function buildTimelineViews(state, metaOverrides = {}) {
  const dates = Object.keys(state.facts || {}).sort();
  const categoryMap = buildCategoryMap(state.taxonomy);
  const eventNodeMap = buildEventNodeMap(state.taxonomy);
  const dayTimelines = {};
  for (const date of dates) {
    dayTimelines[date] = buildDayTimeline(date, state.facts[date], categoryMap, eventNodeMap);
  }

  const weekRanges = buildWeekRanges(dates);
  const weekTimelines = {};
  for (const weekRange of weekRanges) {
    weekTimelines[weekRange.key] = buildWeekTimeline(weekRange, state.facts, categoryMap, eventNodeMap);
  }

  const rangeData = {
    day: buildDayRangeData(dates, state, categoryMap, eventNodeMap),
    week: buildWeekRangeData(weekRanges, state, categoryMap, eventNodeMap),
    month: buildMonthRangeData(dates, state, categoryMap, eventNodeMap),
  };

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      updatedAt: metaOverrides.updatedAt || "",
      taxonomyUpdatedAt: metaOverrides.taxonomyUpdatedAt || "",
      factsUpdatedAt: metaOverrides.factsUpdatedAt || "",
      isDemoData: Boolean(metaOverrides.isDemoData),
      timezone: state.timezone || "Asia/Shanghai",
      availableDates: dates,
      latestDate: dates[dates.length - 1] || "",
    },
    taxonomy: {
      categories: state.taxonomy.categories,
      eventNodes: state.taxonomy.eventNodes,
    },
    timelines: {
      day: dayTimelines,
      week: weekTimelines,
    },
    ranges: rangeData,
  };
}

const CATEGORY_THEME_COLORS = {
  life: "var(--cat-life)",
  work: "var(--cat-work)",
  study: "var(--cat-study)",
  exercise: "var(--cat-exercise)",
  entertainment: "var(--cat-entertainment)",
  health: "var(--cat-health)",
  social: "var(--cat-social)",
  care: "var(--cat-care)",
  travel: "var(--cat-travel)",
  rest: "var(--cat-rest)",
};

function buildDayTimeline(date, day, categoryMap) {
  const events = Array.isArray(day?.events) ? day.events : [];
  return {
    date,
    start: `${date}T00:00:00.000+08:00`,
    end: `${date}T23:59:59.999+08:00`,
    groups: [],
    items: events.map((event) => ({
      id: event.id,
      start: event.startAt,
      end: event.endAt,
      content: buildTimelineItemContent(event),
      style: buildItemStyle(categoryMap.get(event.subcategoryId)?.color || categoryMap.get(event.categoryId)?.color || "#4E79A7"),
      tooltip: {
        title: event.title,
        note: event.note || "",
        color: categoryMap.get(event.subcategoryId)?.color || categoryMap.get(event.categoryId)?.color || "var(--cat-life)",
        durationText: formatMinutes(durationMinutes(event.startAt, event.endAt)),
        timeText: `${formatShanghaiClockTime(event.startAt)} - ${formatShanghaiClockTime(event.endAt)}`,
      },
      className: `cat-${event.categoryId}`,
    })),
  };
}

function buildWeekTimeline(weekRange, facts, categoryMap) {
  const groups = weekRange.dates.map((date) => ({
    id: date,
    content: formatWeekday(date),
  }));
  const items = [];
  const anchorDate = "2000-01-01";
  for (const date of weekRange.dates) {
    const day = facts[date];
    for (const event of Array.isArray(day?.events) ? day.events : []) {
      const anchoredRange = anchorEventToReferenceDay(event.startAt, event.endAt, anchorDate);
      items.push({
        id: `${date}:${event.id}`,
        group: date,
        start: anchoredRange.start,
        end: anchoredRange.end,
        content: buildTimelineItemContent(event),
        style: buildItemStyle(categoryMap.get(event.subcategoryId)?.color || categoryMap.get(event.categoryId)?.color || "#4E79A7"),
        tooltip: {
          title: event.title,
          note: event.note || "",
          color: categoryMap.get(event.subcategoryId)?.color || categoryMap.get(event.categoryId)?.color || "var(--cat-life)",
          durationText: formatMinutes(durationMinutes(event.startAt, event.endAt)),
          timeText: `${formatShanghaiClockTime(event.startAt)} - ${formatShanghaiClockTime(event.endAt)}`,
          dateText: date,
        },
        className: `cat-${event.categoryId}`,
      });
    }
  }
  return {
    key: weekRange.key,
    label: weekRange.label,
    start: `${anchorDate}T00:00:00.000+08:00`,
    end: `${anchorDate}T23:59:59.999+08:00`,
    groups,
    items,
  };
}

function buildTimelineItemContent(event) {
  const durationText = formatCompactDuration(durationMinutes(event.startAt, event.endAt));
  return `${event.title} | ${durationText}`;
}

function buildDayRangeData(dates, state, categoryMap, eventNodeMap) {
  const output = {};
  for (const date of dates) {
    output[date] = buildDayAggregate(date, state.facts[date]?.events || [], categoryMap, eventNodeMap);
  }
  return output;
}

function buildWeekRangeData(weekRanges, state, categoryMap, eventNodeMap) {
  const output = {};
  for (const weekRange of weekRanges) {
    const events = [];
    for (const date of weekRange.dates) {
      events.push(...(state.facts[date]?.events || []));
    }
    output[weekRange.key] = buildRangeAggregate({
      key: weekRange.key,
      label: weekRange.label,
      unit: "day",
      events,
      categoryMap,
      eventNodeMap,
      allDates: weekRange.dates,
      timelineDates: weekRange.dates,
    });
  }
  return output;
}

function buildMonthRangeData(dates, state, categoryMap, eventNodeMap) {
  const grouped = new Map();
  for (const date of dates) {
    const monthKey = date.slice(0, 7);
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey).push(date);
  }
  const output = {};
  for (const [monthKey, monthDates] of grouped.entries()) {
    const events = [];
    for (const date of monthDates) {
      events.push(...(state.facts[date]?.events || []));
    }
    output[monthKey] = buildRangeAggregate({
      key: monthKey,
      label: monthKey,
      unit: "day",
      events,
      categoryMap,
      eventNodeMap,
      allDates: monthDates,
      timelineDates: monthDates,
    });
  }
  return output;
}

function buildRangeAggregate({ key, label, unit, events, categoryMap, eventNodeMap, allDates }) {
  const totalMinutes = events.reduce((sum, event) => sum + durationMinutes(event.startAt, event.endAt), 0);
  const categoryBuckets = new Map();
  const subcategoryBuckets = new Map();
  const subcategoryTrendBuckets = new Map();

  for (const date of allDates) {
    subcategoryTrendBuckets.set(date, new Map());
  }

  for (const event of events) {
    const minutes = durationMinutes(event.startAt, event.endAt);
    const category = categoryMap.get(event.categoryId);
    const subcategory = categoryMap.get(event.subcategoryId);
    const categoryId = event.categoryId;
    const dateKey = formatShanghaiDate(Date.parse(event.startAt));

    upsertBucket(categoryBuckets, categoryId, {
      categoryId,
      label: category?.label || categoryId,
      color: category?.color || buildCategoryThemeColor(categoryId),
      minutes: 0,
    }).minutes += minutes;

    if (event.subcategoryId) {
      upsertBucket(subcategoryBuckets, event.subcategoryId, {
        subcategoryId: event.subcategoryId,
        categoryId,
        label: subcategory?.label || event.subcategoryId,
        color: category?.color || buildCategoryThemeColor(categoryId),
        minutes: 0,
      }).minutes += minutes;
    }

    if (event.subcategoryId && subcategoryTrendBuckets.has(dateKey)) {
      const bucket = subcategoryTrendBuckets.get(dateKey);
      upsertBucket(bucket, event.subcategoryId, {
        subcategoryId: event.subcategoryId,
        minutes: 0,
      }).minutes += minutes;
    }
  }

  const categories = [...categoryBuckets.values()]
    .sort((left, right) => right.minutes - left.minutes)
    .map((bucket) => ({
      ...bucket,
      percent: totalMinutes > 0 ? Number((bucket.minutes / totalMinutes).toFixed(4)) : 0,
    }));

  const categoryDetails = {};
  for (const category of categories) {
    const relatedSubcategories = [...subcategoryBuckets.values()]
      .filter((subcategoryBucket) => subcategoryBucket.categoryId === category.categoryId)
      .sort((left, right) => right.minutes - left.minutes)
      .map((subcategoryBucket) => ({
        ...subcategoryBucket,
        percent: category.minutes > 0 ? Number((subcategoryBucket.minutes / category.minutes).toFixed(4)) : 0,
      }));
    const relatedEvents = buildEventBlocks(
      events.filter((event) => event.categoryId === category.categoryId),
      allDates.length > 1,
    );
    const trend = allDates.map((date) => {
      let minutes = 0;
      for (const event of events) {
        if (event.categoryId !== category.categoryId) {
          continue;
        }
        if (formatShanghaiDate(Date.parse(event.startAt)) === date) {
          minutes += durationMinutes(event.startAt, event.endAt);
        }
      }
      return { label: date.slice(5), key: date, minutes };
    });
    categoryDetails[category.categoryId] = {
      categoryId: category.categoryId,
      label: category.label,
      color: category.color,
      trend,
      subcategories: relatedSubcategories,
      events: relatedEvents,
    };
  }

  const subcategoryDetails = {};
  for (const subcategoryBucket of subcategoryBuckets.values()) {
    subcategoryDetails[subcategoryBucket.subcategoryId] = {
      subcategoryId: subcategoryBucket.subcategoryId,
      categoryId: subcategoryBucket.categoryId,
      label: subcategoryBucket.label,
      color: subcategoryBucket.color,
      trend: allDates.map((date) => ({
        key: date,
        label: date.slice(5),
        minutes: subcategoryTrendBuckets.get(date)?.get(subcategoryBucket.subcategoryId)?.minutes || 0,
      })),
      events: buildEventBlocks(
        events.filter((event) => event.subcategoryId === subcategoryBucket.subcategoryId),
        allDates.length > 1,
      ),
    };
  }

  return {
    key,
    label,
    unit,
    totalMinutes,
    categories,
    categoryDetails,
    subcategoryDetails,
  };
}

function buildDayAggregate(date, events, categoryMap, eventNodeMap) {
  const base = buildRangeAggregate({
    key: date,
    label: date,
    unit: "hour",
    events,
    categoryMap,
    eventNodeMap,
    allDates: [date],
  });

  const categoryDetails = {};
  for (const category of base.categories) {
    categoryDetails[category.categoryId] = {
      ...base.categoryDetails[category.categoryId],
      trend: buildHourlyDistribution(events.filter((event) => event.categoryId === category.categoryId)),
    };
  }

  const subcategoryDetails = {};
  for (const subcategoryId of Object.keys(base.subcategoryDetails || {})) {
    subcategoryDetails[subcategoryId] = {
      ...base.subcategoryDetails[subcategoryId],
      trend: buildHourlyDistribution(events.filter((event) => event.subcategoryId === subcategoryId)),
    };
  }

  return {
    ...base,
    categoryDetails,
    subcategoryDetails,
  };
}

function buildCategoryMap(taxonomy) {
  const map = new Map();
  for (const category of Array.isArray(taxonomy?.categories) ? taxonomy.categories : []) {
    map.set(category.id, {
      categoryId: category.id,
      label: category.label,
      color: buildCategoryThemeColor(category.id, category.color),
    });
    for (const child of Array.isArray(category.children) ? category.children : []) {
      map.set(child.id, {
        categoryId: category.id,
        label: child.label,
        color: buildCategoryThemeColor(category.id, category.color),
      });
    }
  }
  return map;
}

function buildEventNodeMap(taxonomy) {
  const map = new Map();
  for (const node of Array.isArray(taxonomy?.eventNodes) ? taxonomy.eventNodes : []) {
    map.set(node.id, node);
  }
  return map;
}

function buildWeekRanges(dates) {
  const grouped = new Map();
  for (const date of dates) {
    const startDate = getWeekStart(date);
    if (!grouped.has(startDate)) {
      grouped.set(startDate, []);
    }
    grouped.get(startDate).push(date);
  }
  return [...grouped.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([startDate, groupedDates]) => ({
      key: startDate,
      label: `${startDate} 当周`,
      start: `${startDate}T00:00:00.000+08:00`,
      end: `${offsetDate(startDate, 7)}T00:00:00.000+08:00`,
      dates: fillWeekDates(startDate, groupedDates),
    }));
}

function fillWeekDates(startDate, existingDates) {
  const existing = new Set(existingDates);
  const dates = [];
  for (let index = 0; index < 7; index += 1) {
    const date = offsetDate(startDate, index);
    dates.push(existing.has(date) ? date : date);
  }
  return dates;
}

function getWeekStart(date) {
  const timestamp = Date.parse(`${date}T00:00:00+08:00`);
  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(timestamp);
  const weekdayMap = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = weekdayMap[weekdayLabel] ?? 0;
  return offsetDate(date, -offset);
}

function offsetDate(date, dayDelta) {
  const timestamp = Date.parse(`${date}T00:00:00+08:00`);
  return formatShanghaiDate(timestamp + dayDelta * 24 * 60 * 60 * 1000);
}

function formatShanghaiDate(timestampMs) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestampMs);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(Date.parse(`${date}T00:00:00+08:00`));
}

function buildItemStyle(color) {
  return `background:${color};border-color:${color};color:var(--text);`;
}

function durationMinutes(startAt, endAt) {
  return Math.max(0, Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000));
}

function anchorEventToReferenceDay(startAt, endAt, anchorDate) {
  const startClock = formatShanghaiClockTime(startAt);
  const endClock = formatShanghaiClockTime(endAt);
  let anchoredStart = `${anchorDate}T${startClock}:00+08:00`;
  let anchoredEnd = `${anchorDate}T${endClock}:00+08:00`;
  if (Date.parse(anchoredEnd) <= Date.parse(anchoredStart)) {
    anchoredEnd = `${offsetDate(anchorDate, 1)}T${endClock}:00+08:00`;
  }
  return {
    start: anchoredStart,
    end: anchoredEnd,
  };
}

function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} 小时 ${remaining} 分钟` : `${hours} 小时`;
}

function formatCompactDuration(minutes) {
  const safeMinutes = Math.max(0, Number(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  if (hours <= 0) {
    return `${remaining}m`;
  }
  if (remaining <= 0) {
    return `${hours}h`;
  }
  return `${hours}h${remaining}m`;
}

function formatShanghaiClockTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(Date.parse(value));
}

function upsertBucket(map, key, createValue) {
  if (!map.has(key)) {
    map.set(key, createValue);
  }
  return map.get(key);
}

function buildHourlyDistribution(events) {
  const buckets = Array.from({ length: 24 }, (_, index) => ({
    key: String(index),
    label: `${String(index).padStart(2, "0")}:00`,
    minutes: 0,
  }));
  for (const event of events) {
    const start = Date.parse(event.startAt);
    const end = Date.parse(event.endAt);
    for (let index = 0; index < 24; index += 1) {
      const hourStart = Date.parse(`${formatShanghaiDate(start)}T${String(index).padStart(2, "0")}:00:00+08:00`);
      const hourEnd = hourStart + 60 * 60 * 1000;
      const overlap = Math.max(0, Math.min(end, hourEnd) - Math.max(start, hourStart));
      buckets[index].minutes += Math.round(overlap / 60_000);
    }
  }
  return buckets;
}

function buildEventBlocks(events, includeDate) {
  return [...events]
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))
    .map((event) => ({
      eventNodeId: event.id,
      label: event.title,
      dateLabel: includeDate ? formatShanghaiDate(Date.parse(event.startAt)).slice(5) : "",
      timeLabel: `${formatShanghaiClockTime(event.startAt)} - ${formatShanghaiClockTime(event.endAt)}`,
      compactDuration: formatCompactDuration(durationMinutes(event.startAt, event.endAt)),
      fullLabel: includeDate
        ? `${formatShanghaiDate(Date.parse(event.startAt)).slice(5)} ${formatShanghaiClockTime(event.startAt)} - ${formatShanghaiClockTime(event.endAt)} ${event.title}`
        : `${formatShanghaiClockTime(event.startAt)} - ${formatShanghaiClockTime(event.endAt)} ${event.title}`,
      note: event.note || "",
      status: event.eventNodeId ? "official" : "derived",
      categoryId: event.categoryId,
      subcategoryId: event.subcategoryId,
      subcategoryLabel: event.subcategoryId,
      minutes: durationMinutes(event.startAt, event.endAt),
    }));
}

function buildCategoryThemeColor(categoryId, fallback = "var(--cat-life)") {
  return CATEGORY_THEME_COLORS[categoryId] || fallback;
}

module.exports = {
  buildTimelineViews,
};
