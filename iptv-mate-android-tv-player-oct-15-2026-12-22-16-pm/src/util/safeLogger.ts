import { LogEntry } from '../types/iptv';
import { sanitizeUrlForLogging } from './urlResolver';

type LogListener = (entry: LogEntry) => void;

class SafeLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 200;

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }

  private add(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const timestamp = new Date().toLocaleTimeString();
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      message: this.sanitize(entry.message),
      details: entry.details ? this.sanitize(entry.details) : undefined,
    };

    this.logs.unshift(newEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.listeners.forEach((listener) => listener(newEntry));
    console.log(`[${newEntry.module}] [${newEntry.level.toUpperCase()}] ${newEntry.message}`);
  }

  private sanitize(text: string): string {
    return text.replace(/https?:\/\/[^\s]+/g, (match) => sanitizeUrlForLogging(match));
  }

  public info(module: LogEntry['module'], message: string, details?: string) {
    this.add({ level: 'info', module, message, details });
  }

  public warn(module: LogEntry['module'], message: string, details?: string) {
    this.add({ level: 'warn', module, message, details });
  }

  public error(module: LogEntry['module'], message: string, details?: string) {
    this.add({ level: 'error', module, message, details });
  }

  public success(module: LogEntry['module'], message: string, details?: string) {
    this.add({ level: 'success', module, message, details });
  }
}

export const logger = new SafeLogger();
