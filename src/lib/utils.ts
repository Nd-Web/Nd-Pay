import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  compact: boolean = false
): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`;
  }

  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'h:mm a')}`;
  }

  return format(date, 'MMM d, yyyy · h:mm a');
}

export function formatTimeAgo(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function maskAccountNumber(accountNumber: string): string {
  return '•••• ' + accountNumber.slice(-4);
}

export function parseTransferError(error: string): string {
  const errorMap: Record<string, string> = {
    INVALID_AMOUNT: 'Transfer amount must be greater than zero.',
    LIMIT_EXCEEDED: 'Transfer amount exceeds the maximum limit of $1,000,000.',
    SELF_TRANSFER: 'You cannot send money to yourself.',
    SENDER_NOT_FOUND: 'Your account was not found. Please sign in again.',
    PIN_NOT_SET: 'Please set up your 4-digit transaction PIN first.',
    INVALID_PIN: 'Incorrect transaction PIN. Please try again.',
    RECEIVER_NOT_FOUND: 'Recipient account not found.',
    WALLET_NOT_FOUND: 'Wallet not found. Please contact support.',
    INSUFFICIENT_FUNDS: "You don't have enough funds for this transfer.",
  };

  for (const [code, message] of Object.entries(errorMap)) {
    if (error.includes(code)) return message;
  }

  return error || 'Transfer failed. Please try again.';
}

export function generateAvatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-teal-500 to-emerald-600',
    'from-red-500 to-pink-600',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export function validateAmount(value: string): string | null {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return 'Please enter a valid amount';
  if (num <= 0) return 'Amount must be greater than $0';
  if (num > 1_000_000) return 'Maximum transfer limit is $1,000,000';
  if (!/^\d+(\.\d{0,2})?$/.test(value)) return 'Invalid amount format';
  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
