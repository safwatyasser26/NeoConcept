"use client";

import { useEffect, useMemo, useState } from "react";

import { RAW_LOG } from "@/data/rawLog";
import MiniBar from "@/components/log-analyzer/MiniBar";
import StatCard from "@/components/log-analyzer/StatCard";
import {
  buildStats,
  endpointColor,
  parseLogs,
  STATUS_COLORS,
} from "@/lib/log-analyzer";
import type { FilterLevel, SortBy, ViewTab } from "@/interfaces/log";

const LOG_FILE_URL = "/api/logs/combined";
const TABS: ViewTab[] = ["overview", "endpoints", "log"];
const FILTERS: FilterLevel[] = ["all", "info", "warn"];
const STATUS_CODES = [200, 201, 400, 401];

export default function LogAnalyzerPage() {
  const [logText, setLogText] = useState<string>(RAW_LOG);
  const [logSource, setLogSource] = useState<string>("inline sample");
  const [loadError, setLoadError] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  const [sortBy, setSortBy] = useState<SortBy>("duration");
  const [tab, setTab] = useState<ViewTab>("overview");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    fetch(LOG_FILE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!text.trim()) throw new Error("Log file is empty");
        setLogText(text);
        setLogSource(LOG_FILE_URL);
        setLoadError("");
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        setLoadError(`Could not load ${LOG_FILE_URL}: ${message}. Showing bundled sample logs.`);
      });
  }, []);

  const logs = useMemo(() => parseLogs(logText), [logText]);
  const stats = useMemo(() => buildStats(logs), [logs]);

  const filtered = useMemo(() => {
    let result = logs;
    if (filterLevel !== "all") result = result.filter((entry) => entry.level === filterLevel);

    if (search) {
      result = result.filter(
        (entry) => entry.path.includes(search) || entry.status.toString().includes(search),
      );
    }

    if (sortBy === "duration") result = [...result].sort((a, b) => b.duration - a.duration);
    else if (sortBy === "status") result = [...result].sort((a, b) => b.status - a.status);
    else if (sortBy === "time") result = [...result].sort((a, b) => a.ts.getTime() - b.ts.getTime());

    return result.slice(0, 50);
  }, [logs, filterLevel, sortBy, search]);

  const rpsArr = stats.rpsValues;
  const shownEntries = logs.filter(
    (entry) =>
      (filterLevel === "all" || entry.level === filterLevel) &&
      (!search || entry.path.includes(search)),
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0d14",
        color: "#e2e8f0",
        fontFamily: "monospace",
        padding: "24px 20px",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#00d4aa",
              boxShadow: "0 0 8px #00d4aa",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontSize: 11, color: "#00d4aa", letterSpacing: 2, textTransform: "uppercase" }}>
            Log Analyzer
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.5 }}>
          /api/v1/auth - k6 Load Test
        </h1>
        <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 12 }}>
          {stats.total} requests - {logs[0] ? logs[0].ts.toISOString().replace("T", " ").slice(0, 19) : "-"} UTC - source: {logSource}
        </p>
        {loadError && <p style={{ margin: "6px 0 0", color: "#f59e0b", fontSize: 12 }}>{loadError}</p>}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #1e2433" }}>
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              fontSize: 12,
              fontFamily: "monospace",
              color: tab === item ? "#00d4aa" : "#4b5563",
              borderBottom: tab === item ? "2px solid #00d4aa" : "2px solid transparent",
              transition: "all 0.2s",
            }}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <StatCard label="Total Reqs" value={stats.total} accent="#00d4aa" />
            <StatCard label="Errors" value={stats.errors} sub={`${stats.errorRate}% error rate`} accent="#f06292" />
            <StatCard label="Avg Latency" value={`${stats.avgDur}ms`} accent="#4fc3f7" />
            <StatCard label="P95 Latency" value={`${stats.p95}ms`} accent="#ffb74d" />
            <StatCard label="P99 Latency" value={`${stats.p99}ms`} accent="#ff7043" />
            <StatCard label="Max Latency" value={`${stats.maxDur}ms`} accent="#ef5350" />
          </div>

          <div
            style={{
              background: "#12151f",
              border: "1px solid #1e2433",
              borderRadius: 12,
              padding: "18px 22px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Requests / Second
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
              {rpsArr.map((value, index) => (
                <div
                  key={`${index}-${value}`}
                  style={{
                    flex: 1,
                    height: `${(value / stats.rpsMax) * 100}%`,
                    background: value === stats.rpsMax ? "#00d4aa" : "#1e3a52",
                    borderRadius: "2px 2px 0 0",
                    minHeight: 3,
                    transition: "height 0.3s",
                  }}
                  title={`${value} req/s`}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ color: "#374151", fontSize: 10 }}>Peak: {stats.rpsMax} req/s</span>
              <span style={{ color: "#374151", fontSize: 10 }}>
                Avg: {(stats.total / Math.max(1, rpsArr.length)).toFixed(1)} req/s
              </span>
            </div>
          </div>

          <div
            style={{
              background: "#12151f",
              border: "1px solid #1e2433",
              borderRadius: 12,
              padding: "18px 22px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Status Code Distribution
            </div>
            {STATUS_CODES.map((code) => {
              const count = logs.filter((entry) => entry.status === code).length;
              if (!count) return null;

              const color = STATUS_COLORS[code];
              return (
                <div key={code} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color, fontSize: 12 }}>{code}</span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      {count} ({((count / stats.total) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <MiniBar value={count} max={stats.total} color={color} />
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "endpoints" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stats.epStats.map((endpointStats) => (
            <div
              key={endpointStats.endpoint}
              style={{
                background: "#12151f",
                border: "1px solid #1e2433",
                borderRadius: 10,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: endpointColor(endpointStats.endpoint),
                    }}
                  />
                  <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "monospace" }}>
                    {endpointStats.endpoint}
                  </span>
                </div>
                <span style={{ color: "#6b7280", fontSize: 11 }}>{endpointStats.count} calls</span>
              </div>
              <MiniBar
                value={endpointStats.count}
                max={stats.maxEpCount}
                color={endpointColor(endpointStats.endpoint)}
              />
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                {[
                  ["avg", endpointStats.avg.toFixed(0)],
                  ["p95", endpointStats.p95.toFixed(0)],
                  ["max", endpointStats.max.toFixed(0)],
                ].map(([key, value]) => (
                  <span key={key} style={{ fontSize: 11, color: "#4b5563" }}>
                    <span style={{ color: "#6b7280" }}>{key}: </span>
                    <span style={{ color: Number.parseFloat(value) > 500 ? "#ffb74d" : "#94a3b8" }}>
                      {value}ms
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "log" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by path or status..."
              style={{
                flex: 1,
                minWidth: 180,
                background: "#12151f",
                border: "1px solid #1e2433",
                borderRadius: 6,
                padding: "6px 10px",
                color: "#e2e8f0",
                fontFamily: "monospace",
                fontSize: 12,
                outline: "none",
              }}
            />
            {FILTERS.map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                style={{
                  background: filterLevel === level ? "#1e2d3d" : "#12151f",
                  border: `1px solid ${filterLevel === level ? "#4fc3f7" : "#1e2433"}`,
                  borderRadius: 6,
                  padding: "6px 12px",
                  color: filterLevel === level ? "#4fc3f7" : "#4b5563",
                  fontFamily: "monospace",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {level.toUpperCase()}
              </button>
            ))}
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              style={{
                background: "#12151f",
                border: "1px solid #1e2433",
                borderRadius: 6,
                padding: "6px 10px",
                color: "#6b7280",
                fontFamily: "monospace",
                fontSize: 11,
              }}
            >
              <option value="time">Sort: Time</option>
              <option value="duration">Sort: Duration ↓</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {filtered.map((entry) => {
              const isWarn = entry.level === "warn";
              const isSlow = entry.duration > 500;

              return (
                <div
                  key={entry.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 38px 120px 60px 90px 1fr",
                    gap: 8,
                    padding: "7px 12px",
                    borderRadius: 6,
                    background: isWarn ? "#1a1015" : "#0e1118",
                    border: `1px solid ${isWarn ? "#2d1a20" : "#161b27"}`,
                    fontSize: 11,
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#374151" }}>{entry.ts.toISOString().slice(11, 19)}</span>
                  <span
                    style={{
                      color: entry.level === "warn" ? "#f59e0b" : "#10b981",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      fontSize: 9,
                    }}
                  >
                    {entry.level}
                  </span>
                  <span style={{ color: "#64748b" }}>{entry.method}</span>
                  <span
                    style={{
                      color: entry.status >= 400 ? "#ef4444" : "#22c55e",
                      fontWeight: 700,
                    }}
                  >
                    {entry.status}
                  </span>
                  <span style={{ color: isSlow ? "#f59e0b" : "#94a3b8" }}>{entry.duration}ms</span>
                  <span
                    style={{
                      color: "#475569",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.path.replace("/api/v1/auth", "")}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", color: "#374151", fontSize: 11, marginTop: 12 }}>
            Showing {filtered.length} of {shownEntries} entries
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0d14; }
        ::-webkit-scrollbar-thumb { background: #1e2433; border-radius: 2px; }
      `}</style>
    </div>
  );
}
