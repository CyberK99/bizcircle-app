export const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#60a5fa',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  success: '#22c55e',
  successDark: '#16a34a',
  warning: '#f59e0b',
  warningDark: '#d97706',
  background: '#f9fafb',
  surface: '#ffffff',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
};

export const URGENCY_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'Urgent',
  3: 'Same Day',
};

export const URGENCY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#3b82f6',
};

export const EMERGENCY_CATEGORIES: Record<string, { label: string; icon: string }> = {
  urgent_repair: { label: 'Urgent Repair', icon: 'hammer' },
  temporary_staff: { label: 'Temporary Staff', icon: 'people' },
  equipment_needed: { label: 'Equipment Needed', icon: 'construct' },
  supply_shortage: { label: 'Supply Shortage', icon: 'cube' },
  emergency_service: { label: 'Emergency Service', icon: 'flash' },
  other: { label: 'Other', icon: 'help-circle' },
};

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  unverified: 'Unverified',
  pending: 'Pending Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  equipment: 'Equipment',
  supply: 'Supplies',
  space: 'Space',
  staff_available: 'Staff Available',
  staff_needed: 'Staff Needed',
  group_deal: 'Group Deal',
};

export const LISTING_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  equipment: { label: 'Equipment', icon: 'construct', color: '#6366f1' },
  supply: { label: 'Supplies', icon: 'cube', color: '#8b5cf6' },
  space: { label: 'Space', icon: 'business', color: '#0891b2' },
  staff_available: { label: 'Staff Available', icon: 'person', color: '#16a34a' },
  staff_needed: { label: 'Staff Needed', icon: 'people', color: '#ea580c' },
  group_deal: { label: 'Group Deal', icon: 'pricetags', color: '#dc2626' },
};

export const PRICE_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixed Price',
  negotiable: 'Negotiable',
  free: 'Free',
  per_hour: 'Per Hour',
  per_day: 'Per Day',
};

export const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts'] as const;

export const POST_TYPE_LABELS: Record<string, string> = {
  discussion: 'Discussion',
  question: 'Question',
  announcement: 'Announcement',
  poll: 'Poll',
};
