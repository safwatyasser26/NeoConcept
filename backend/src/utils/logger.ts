import fs from "fs";
import path from "path";
import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;
const logsDir = path.resolve(process.cwd(), "logs");

// Checking if the logs directory exists, and if not, creating it to ensure that log files can be written without errors.
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formatting the Logs
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const onlyLevel = (level: string) =>
  winston.format((info) => {
    return info.level === level ? info : false;
  })();

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info"),
  format: combine(timestamp(), myFormat),
  transports: [
    // Log to the console with colorized output for better readability during development.
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), myFormat),
    }),
    // Write each log level to its own file for easier filtering and alerting.
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: combine(timestamp(), onlyLevel("error"), myFormat),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "warn.log"),
      level: "warn",
      format: combine(timestamp(), onlyLevel("warn"), myFormat),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "info.log"),
      level: "info",
      format: combine(timestamp(), onlyLevel("info"), myFormat),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "debug.log"),
      level: "debug",
      format: combine(timestamp(), onlyLevel("debug"), myFormat),
    }),
    new winston.transports.File({ filename: path.join(logsDir, "combined.log") }),
  ],
});
