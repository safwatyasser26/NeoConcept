// This file contains a sample raw log string that can be used for testing and development purposes in the Log Analyzer application. The log entries include various HTTP requests with different status codes, response times, IP addresses, and user agents. This sample log can help developers to simulate real-world scenarios and ensure that the log parsing and analysis functionalities of the application are working correctly.

export const RAW_LOG = `2026-04-27T15:05:21.571Z [info]: POST /api/v1/auth/signup [201] - 274.5ms | ip=127.0.0.1 | size=96 | ua=Grafana k6/1.7.1
2026-04-27T15:05:22.804Z [info]: POST /api/v1/auth/login [200] - 331.5ms | ip=127.0.0.1 | size=540 | ua=Grafana k6/1.7.1
2026-04-27T15:05:23.310Z [warn]: GET /api/v1/auth [401] - 1.6ms | ip=127.0.0.1 | size=43 | ua=Grafana k6/1.7.1`;
