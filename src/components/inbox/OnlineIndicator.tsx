import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline?: boolean;
  className?: string;
}

export const OnlineIndicator = ({ isOnline = false, className }: OnlineIndicatorProps) => {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        isOnline ? "bg-green-500" : "bg-gray-400",
        className
      )}
    />
  );
};
