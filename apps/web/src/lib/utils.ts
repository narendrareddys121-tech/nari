import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatTimeLeft(endsAt: string | Date): {
  text: string;
  isUrgent: boolean;
  isEnded: boolean;
} {
  const end = new Date(endsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { text: 'Ended', isUrgent: false, isEnded: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours < 1) {
    const text = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return { text, isUrgent: minutes < 10, isEnded: false };
  }

  if (hours < 24) {
    const text = `${hours}h ${minutes}m`;
    return { text, isUrgent: hours < 2, isEnded: false };
  }

  const days = Math.floor(hours / 24);
  return { text: `${days}d ${hours % 24}h`, isUrgent: false, isEnded: false };
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

export function getConditionLabel(condition: string): string {
  const map: Record<string, string> = {
    NEW: 'New',
    LIKE_NEW: 'Like New',
    GOOD: 'Good',
    FAIR: 'Fair',
    FOR_PARTS: 'For Parts',
  };
  return map[condition] ?? condition;
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'In Review',
    SCHEDULED: 'Scheduled',
    LIVE: 'Live',
    ENDED: 'Ended',
    AWAITING_PAYMENT: 'Awaiting Payment',
    SOLD: 'Sold',
    UNSOLD: 'Unsold',
    CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed',
  };
  return map[status] ?? status;
}
