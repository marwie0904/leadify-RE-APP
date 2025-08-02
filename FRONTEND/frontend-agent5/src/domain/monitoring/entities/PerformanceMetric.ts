export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  name: string;
  value: number;
  unit: MetricUnit;
  tags: Record<string, string>;
  type: MetricType;
}

export enum MetricUnit {
  MILLISECONDS = 'ms',
  SECONDS = 's',
  BYTES = 'bytes',
  KILOBYTES = 'kb',
  MEGABYTES = 'mb',
  COUNT = 'count',
  PERCENTAGE = 'percent'
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}