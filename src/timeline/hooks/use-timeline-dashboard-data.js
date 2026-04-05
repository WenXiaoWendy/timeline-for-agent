import { useEffect, useState } from "react";
import { buildTimelineViews } from "../../infra/timeline/timeline-analytics";

const EMPTY_DASHBOARD_DATA = {
  meta: { availableDates: [] },
  ranges: { day: {}, week: {}, month: {} },
  timelines: { day: {}, week: {} },
  taxonomy: { categories: [] },
};

function useTimelineDashboardData() {
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    let cancelled = false;
    const version = typeof window !== "undefined" && window.__TIMELINE_DEV_VERSION__
      ? `?v=${window.__TIMELINE_DEV_VERSION__}`
      : "";

    loadTimelineDashboardData(version)
      .then((nextData) => {
        if (cancelled) {
          return;
        }
        const latestDate = nextData?.meta?.latestDate || "";
        const weekKeys = Object.keys(nextData?.ranges?.week || {}).sort();
        const monthKeys = Object.keys(nextData?.ranges?.month || {}).sort();
        setData(nextData);
        setSelectedDate(latestDate);
        setSelectedWeek(weekKeys[weekKeys.length - 1] || "");
        setSelectedMonth(monthKeys[monthKeys.length - 1] || "");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setData(EMPTY_DASHBOARD_DATA);
        setSelectedDate("");
        setSelectedWeek("");
        setSelectedMonth("");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    data,
    selectedDate,
    selectedMonth,
    selectedWeek,
    setSelectedDate,
    setSelectedMonth,
    setSelectedWeek,
  };
}

async function loadTimelineDashboardData(version) {
  const runtimeData = await fetchJson(`./__timeline_source_data${version}`).catch(() => null);
  if (runtimeData?.state && runtimeData?.meta) {
    return buildTimelineViews(runtimeData.state, runtimeData.meta);
  }
  return fetchJson(`./dashboard-data.json${version}`);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  return response.json();
}

export { useTimelineDashboardData };
