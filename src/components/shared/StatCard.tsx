import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: LucideIcon;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const colorClasses = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent bg-accent/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  destructive: 'text-destructive bg-destructive/10',
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

export const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'primary',
  className,
}: StatCardProps) => {
  const TrendIcon = change ? trendIcons[change.trend] : null;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className={cn('p-2 rounded-lg', colorClasses[color])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change && TrendIcon && (
            <div className="flex items-center gap-1 text-sm">
              <TrendIcon className={cn('h-4 w-4', trendColors[change.trend])} />
              <span className={cn('font-medium', trendColors[change.trend])}>
                {Math.abs(change.value)}%
              </span>
              <span className="text-muted-foreground">vs período anterior</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
