import type { EndpointStat, LogStats, ParsedLog } from "@/interfaces/log";

const AUTH_PREFIX = "/api/v1/auth";

const EMPTY_STATS: LogStats = {
  total: 0,
  errors: 0,
  errorRate: "0.0",
  avgDur: "0.0",
  p95: "0.0",
  p99: "0.0",
  maxDur: "0.0",
  epStats: [],
  maxEpCount: 1,
  rpsValues: [],
  rpsMax: 1,
  buckets: {},
};

export const STATUS_COLORS: Record<number, string> = {
  200: "#4fc3f7",
  201: "#00d4aa",
  400: "#ffb74d",
  401: "#f06292",
};

export const ENDPOINT_COLORS: Record<string, string> = {
  signup: "#00d4aa",
  login: "#4fc3f7",
  logout: "#b0bec5",
  "forgot-password": "#ffb74d",
  "resend-confirmation-email": "#f06292",
  other: "#ce93d8",
};

export function endpointColor(endpoint: string): string {
  for (const key of Object.keys(ENDPOINT_COLORS)) {
    if (endpoint.toLowerCase().includes(key)) return ENDPOINT_COLORS[key];
  }
  return ENDPOINT_COLORS.other;
}

export function parseLogs(raw: string): ParsedLog[] {
  if (!raw?.trim()) return [];

  const lines = raw.trim().split("\n");
  const re = /^(\S+)\s+\[(\w+)\]:\s+(\w+)\s+(\S+)\s+\[(\d+)\]\s+-\s+([\d.]+)ms/;

  return lines
    .map((line, i) => {
      const match = line.match(re);
      if (!match) return null;

      const endpointPath = match[4].replace(AUTH_PREFIX, "");
      const status = Number.parseInt(match[5], 10);

      return {
        id: i,
        ts: new Date(match[1]),
        level: match[2],
        method: match[3],
        path: match[4],
        endpoint: `${match[3]} ${endpointPath || "/"}`,
        status,
        duration: Number.parseFloat(match[6]),
        isError: status >= 400,
      } satisfies ParsedLog;
    })
    .filter((item): item is ParsedLog => item !== null);
}

function pct(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((sum, value) => sum + value, 0) / arr.length : 0;
}

export function buildStats(logs: ParsedLog[]): LogStats {
  if (!logs.length) return EMPTY_STATS;

  const durations = logs.map((entry) => entry.duration);
  const errors = logs.filter((entry) => entry.isError);

  const byEndpoint: Record<string, number[]> = {};
  logs.forEach((entry) => {
    if (!byEndpoint[entry.endpoint]) byEndpoint[entry.endpoint] = [];
    byEndpoint[entry.endpoint].push(entry.duration);
  });

  const epStats: EndpointStat[] = Object.entries(byEndpoint)
    .map(([endpoint, endpointDurations]) => ({
      endpoint,
      count: endpointDurations.length,
      avg: avg(endpointDurations),
      p95: pct(endpointDurations, 95),
      max: Math.max(...endpointDurations),
    }))
    .sort((a, b) => b.count - a.count);

  const maxEpCount = Math.max(1, ...epStats.map((entry) => entry.count));

  const buckets: Record<number, number> = {};
  logs.forEach((entry) => {
    const sec = Math.floor(entry.ts.getTime() / 1000);
    buckets[sec] = (buckets[sec] || 0) + 1;
  });

  const rpsValues = Object.values(buckets);
  const rpsMax = Math.max(1, ...rpsValues);

  return {
    total: logs.length,
    errors: errors.length,
    errorRate: ((errors.length / logs.length) * 100).toFixed(1),
    avgDur: avg(durations).toFixed(1),
    p95: pct(durations, 95).toFixed(1),
    p99: pct(durations, 99).toFixed(1),
    maxDur: Math.max(...durations).toFixed(1),
    epStats,
    maxEpCount,
    rpsValues,
    rpsMax,
    buckets,
  };
}
