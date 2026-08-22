import { z } from "zod";

export const LOG_LEVELS = [
  "EMERGENCY",
  "ALERT",
  "CRITICAL",
  "ERROR",
  "WARNING",
  "NOTICE",
  "INFO",
  "DEBUG",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_LINE_OPTIONS = [100, 200, 500, 1000] as const;
export const LOG_LINES_DEFAULT = 200;
export const LOG_LINES_MAX = 2000;

/** Basename permitido pela API (`laravel.log`, `laravel-2026-08-22.log`). */
export const LOG_NAME_REGEX = /^[A-Za-z0-9._-]+\.log$/;

export const platformLogFileSchema = z.object({
  name: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  modifiedAt: z.string(),
});

export const platformLogListSchema = z.object({
  files: z.array(platformLogFileSchema),
});

export const platformLogEntrySchema = z.object({
  timestamp: z.string().nullable(),
  env: z.string().nullable(),
  level: z.string().nullable(),
  message: z.string(),
  raw: z.string(),
});

export const platformLogViewSchema = z.object({
  name: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  modifiedAt: z.string(),
  linesRequested: z.number().int().positive(),
  lineCount: z.number().int().nonnegative(),
  truncated: z.boolean(),
  content: z.string(),
  entries: z.array(platformLogEntrySchema),
});

export type PlatformLogFile = z.infer<typeof platformLogFileSchema>;
export type PlatformLogList = z.infer<typeof platformLogListSchema>;
export type PlatformLogEntry = z.infer<typeof platformLogEntrySchema>;
export type PlatformLogView = z.infer<typeof platformLogViewSchema>;
