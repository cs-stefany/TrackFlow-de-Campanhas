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
    <Card className={cn('p-4 shadow-card', className)}>
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-0">
        {/* Left section */}
        <div className="flex-1 space-y-0.5 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground leading-tight">
            {leftLabel}
          </p>
          <p
            className={cn('text-base font-bold tracking-tight', {
              'text-success': leftVariant === 'success',
              'text-warning': leftVariant === 'warning',
              'text-danger': leftVariant === 'danger',
            })}
          >
            {leftValue}
          </p>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-border mx-2" />
        <div className="sm:hidden h-px bg-border w-full" />

        {/* Right section */}
        <div className="flex-1 space-y-0.5 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground leading-tight">
            {rightLabel}
          </p>
          <p
            className={cn('text-base font-bold tracking-tight', {
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
