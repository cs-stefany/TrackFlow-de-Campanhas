import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  subLabel?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function KPICard({
  label,
  value,
  subValue,
  subLabel,
  icon: Icon,
  variant = 'default',
  className,
}: KPICardProps) {
  return (
    <Card
      className={cn(
        'p-4 shadow-card transition-shadow hover:shadow-card-hover',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="kpi-label">{label}</p>
          <p
            className={cn('kpi-value', {
              'text-success': variant === 'success',
              'text-warning': variant === 'warning',
              'text-danger': variant === 'danger',
            })}
          >
            {value}
          </p>
          {subValue && (
            <div className="flex items-center gap-1 pt-1">
              {subLabel && (
                <span className="text-xs text-muted-foreground">{subLabel}</span>
              )}
              <span className="text-sm font-medium text-foreground">{subValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              {
                'bg-muted text-muted-foreground': variant === 'default',
                'bg-success/10 text-success': variant === 'success',
                'bg-warning/10 text-warning': variant === 'warning',
                'bg-danger/10 text-danger': variant === 'danger',
              }
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

interface KPIDualCardProps {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  leftVariant?: 'default' | 'success' | 'warning' | 'danger';
  rightVariant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function KPIDualCard({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  leftVariant = 'default',
  rightVariant = 'default',
  className,
}: KPIDualCardProps) {
  return (
    <Card className={cn('overflow-hidden p-0 shadow-card', className)}>
      <div className="grid grid-cols-2 items-stretch">
        {/* Left section */}
        <div className="min-w-0 space-y-1 p-3.5 sm:p-4">
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px]">
            {leftLabel}
          </p>
          <p
            className={cn('whitespace-nowrap text-[15px] font-bold tabular-nums tracking-tight sm:text-base', {
              'text-success': leftVariant === 'success',
              'text-warning': leftVariant === 'warning',
              'text-danger': leftVariant === 'danger',
            })}
          >
            {leftValue}
          </p>
        </div>

        {/* Right section */}
        <div className="min-w-0 space-y-1 border-l border-border p-3.5 sm:p-4">
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px]">
            {rightLabel}
          </p>
          <p
            className={cn('whitespace-nowrap text-[15px] font-bold tabular-nums tracking-tight sm:text-base', {
              'text-success': rightVariant === 'success',
              'text-warning': rightVariant === 'warning',
              'text-danger': rightVariant === 'danger',
            })}
          >
            {rightValue}
          </p>
        </div>
      </div>
    </Card>
  );
}
