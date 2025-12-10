import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: 'no-data' | 'error' | 'no-permission';
  className?: string;
}

const typeColors = {
  'no-data': 'text-muted-foreground',
  error: 'text-destructive',
  'no-permission': 'text-warning',
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  type = 'no-data',
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div
        className={cn(
          'mb-4 p-3 rounded-full bg-muted',
          typeColors[type]
        )}
      >
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </div>
  );
};
