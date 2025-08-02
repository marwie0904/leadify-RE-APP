'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useWebVitals, type WebVitalsMetric } from '@/components/performance/web-vitals-reporter';
import { Activity, Zap, Target, Eye, Clock, MousePointer } from 'lucide-react';

interface MetricData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  target: number;
  icon: React.ComponentType<{ className?: string }>;
  unit: string;
  description: string;
}

const metricConfig = {
  LCP: {
    target: 2500,
    icon: Eye,
    unit: 'ms',
    description: 'Largest Contentful Paint - Time for largest element to load'
  },
  FCP: {
    target: 1800,
    icon: Zap,
    unit: 'ms',
    description: 'First Contentful Paint - Time for first content to appear'
  },
  CLS: {
    target: 0.1,
    icon: Target,
    unit: '',
    description: 'Cumulative Layout Shift - Visual stability of the page'
  },
  TTFB: {
    target: 800,
    icon: Clock,
    unit: 'ms',
    description: 'Time to First Byte - Server response time'
  }
};

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Map<string, MetricData>>(new Map());
  const [isVisible, setIsVisible] = useState(false);

  const { getMetrics } = useWebVitals((metric: WebVitalsMetric) => {
    handleMetric(metric);
  });

  useEffect(() => {
    // Show dashboard in development or when explicitly enabled
    setIsVisible(process.env.NODE_ENV === 'development' || 
                 localStorage.getItem('performance-dashboard') === 'true');
  }, []);

  const handleMetric = (metric: WebVitalsMetric) => {
    const config = metricConfig[metric.name as keyof typeof metricConfig];
    if (!config) return;

    setMetrics(prev => {
      const updated = new Map(prev);
      updated.set(metric.name, {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        target: config.target,
        icon: config.icon,
        unit: config.unit,
        description: config.description
      });
      return updated;
    });
  };

  const getRatingColor = (rating: MetricData['rating']) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '') {
      return value.toFixed(3);
    }
    return Math.round(value).toString();
  };

  if (!isVisible) {
    return null;
  }

  const metricsArray = Array.from(metrics.values());

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Web Vitals Monitor
            </CardTitle>
            <button
              onClick={() => {
                setIsVisible(false);
                localStorage.setItem('performance-dashboard', 'false');
              }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {metricsArray.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Waiting for performance metrics...
            </div>
          ) : (
            metricsArray.map(metric => {
              const Icon = metric.icon;
              const progressValue = Math.min((metric.target / metric.value) * 100, 100);
              
              return (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{metric.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {formatValue(metric.value, metric.unit)}{metric.unit}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getRatingColor(metric.rating)}`}
                      >
                        {metric.rating === 'needs-improvement' ? 'OK' : metric.rating.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={progressValue} 
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500 leading-tight">
                    {metric.description}
                  </div>
                </div>
              );
            })
          )}
          
          {metricsArray.length > 0 && (
            <div className="pt-2 border-t text-xs text-gray-500 text-center">
              Target: LCP &lt;2.5s, FCP &lt;1.8s, CLS &lt;0.1, TTFB &lt;800ms
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}