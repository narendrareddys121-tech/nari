'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn, formatTimeLeft } from '@/lib/utils';

interface CountdownTimerProps {
  endsAt: string | Date;
  onEnd?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CountdownTimer({ endsAt, onEnd, className, size = 'md' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(endsAt));

  const tick = useCallback(() => {
    const result = formatTimeLeft(endsAt);
    setTimeLeft(result);
    if (result.isEnded) {
      onEnd?.();
    }
  }, [endsAt, onEnd]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  if (timeLeft.isEnded) {
    return (
      <span className={cn('text-gray-400 font-medium', className)}>
        Ended
      </span>
    );
  }

  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-2xl font-black',
  };

  return (
    <span
      className={cn(
        'countdown font-mono tabular-nums transition-colors',
        sizeClasses[size],
        timeLeft.isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-900',
        className
      )}
    >
      {timeLeft.isUrgent && '⏰ '}
      {timeLeft.text}
    </span>
  );
}
