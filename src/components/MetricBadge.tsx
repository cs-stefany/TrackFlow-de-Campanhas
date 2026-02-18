import { cn } from '@/lib/utils';
import { getMetricStatus, getMetricBgClass, type MetricType, type MetricStatus, type OfferThresholds } from '@/lib/metrics';

interface MetricBadgeProps {
  value: number;
  metricType: MetricType;
  thresholds: OfferThresholds;
  format?: (value: number) => string;
  className?: string;
}

export function MetricBadge({
  value,
  metricType,
  thresholds,
  format = (v) => v.toFixed(2),
  className,
}: MetricBadgeProps) {
  const status = getMetricStatus(value, metricType, thresholds);
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
        getMetricBgClass(status),
        className
      )}
    >
      {format(value)}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'testing' | 'paused' | 'archived';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    active: { label: 'Ativo', class: 'bg-success/10 text-success' },
    testing: { label: 'Em Teste', class: 'bg-info/10 text-info' },
    paused: { label: 'Pausado', class: 'bg-warning/10 text-warning' },
    archived: { label: 'Arquivado', class: 'bg-muted text-muted-foreground' },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
        config.class,
        className
      )}
    >
      {config.label}
    </span>
  );
}

interface HealthIndicatorProps {
  status: MetricStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HealthIndicator({ status, size = 'md', className }: HealthIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const colorClasses = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-muted-foreground',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        sizeClasses[size],
        colorClasses[status],
        className
      )}
    />
  );
}
