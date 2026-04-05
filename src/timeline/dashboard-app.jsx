import "./css/dashboard.css";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

import React from "react";
import { createRoot } from "react-dom/client";

import { DashboardApp } from "./components/DashboardApp.jsx";

createRoot(document.getElementById("root")).render(<DashboardApp />);
