import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  className?: string;
}

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-8 w-8',
  large: 'h-12 w-12',
};

export const LoadingSpinner = ({
  size = 'medium',
  color,
  text,
  className,
}: LoadingSpinnerProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2
        className={cn('animate-spin', sizeClasses[size])}
        style={color ? { color } : undefined}
      />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};
