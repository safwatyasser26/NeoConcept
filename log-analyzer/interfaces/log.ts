export type ViewTab = "overview" | "endpoints" | "log";

export type FilterLevel = "all" | "info" | "warn";

export type SortBy = "time" | "duration" | "status";

// The ParsedLog interface represents the structure of a parsed log entry, including fields such as id, timestamp, log level, HTTP method, path, endpoint, status code, duration, and a boolean indicating if it's an error.
export interface ParsedLog {
  id: number;
  ts: Date;
  level: string;
  method: string;
  path: string;
  endpoint: string;
  status: number;
  duration: number;
  isError: boolean;
}


// The EndpointStat interface represents the statistics for a specific endpoint, including the endpoint path, count of requests, average duration, 95th percentile duration, and maximum duration.
export interface EndpointStat {
  endpoint: string;
  count: number;
  avg: number;
  p95: number;
  max: number;
}

// The LogStats interface represents the overall statistics of the logs, including total number of log entries, number of errors, error rate, average duration, 95th percentile duration, maximum duration, statistics for each endpoint, maximum endpoint count, requests per second values, maximum requests per second, and a record of duration buckets.
export interface LogStats {
  total: number;
  errors: number;
  errorRate: string;
  avgDur: string;
  p95: string;
  p99: string;
  maxDur: string;
  epStats: EndpointStat[];
  maxEpCount: number;
  rpsValues: number[];
  rpsMax: number;
  buckets: Record<number, number>;
}
