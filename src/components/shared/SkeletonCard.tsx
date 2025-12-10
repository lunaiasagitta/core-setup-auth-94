import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  variant?: 'simple' | 'with-avatar' | 'with-image';
  rows?: number;
  className?: string;
}

export const SkeletonCard = ({
  variant = 'simple',
  rows = 3,
  className,
}: SkeletonCardProps) => {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="space-y-2">
        {variant === 'with-avatar' && (
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        )}
        {variant === 'with-image' && <Skeleton className="h-48 w-full rounded-md" />}
        {variant === 'simple' && (
          <>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
};
