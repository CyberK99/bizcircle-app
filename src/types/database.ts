export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type PostType = 'discussion' | 'question' | 'announcement' | 'poll';
export type MemberRole = 'member' | 'moderator' | 'admin';
export type EmergencyCategory = 'urgent_repair' | 'temporary_staff' | 'equipment_needed' | 'supply_shortage' | 'emergency_service' | 'other';
export type UrgencyLevel = 1 | 2 | 3; // 1=critical, 2=urgent, 3=same-day
export type EmergencyStatus = 'active' | 'responded' | 'fulfilled' | 'cancelled' | 'expired';
export type EmergencyResponseStatus = 'offered' | 'accepted' | 'declined' | 'completed';
export type ListingType = 'equipment' | 'supply' | 'space' | 'staff_available' | 'staff_needed' | 'group_deal';
export type ListingStatus = 'active' | 'pending' | 'fulfilled' | 'expired' | 'cancelled';
export type PriceType = 'fixed' | 'negotiable' | 'free' | 'per_hour' | 'per_day';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type DocumentType = 'business_license' | 'ein_letter' | 'secretary_of_state' | 'utility_bill' | 'insurance_cert' | 'other';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type ReferralStatus = 'open' | 'contacted' | 'won' | 'lost' | 'expired';
export type ReviewContextType = 'referral' | 'emergency' | 'listing' | 'general';
export type ListingResponseStatus = 'interested' | 'accepted' | 'declined';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Industry {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  naics_prefix: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  children?: Industry[];
}

export interface County {
  fips: string;
  name: string;
  state_code: string;
  state_name: string;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  is_pilot: boolean;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  zip: string | null;
  county_fips: string | null;
  county_name: string | null;
  latitude: number | null;
  longitude: number | null;
  industry_id: string | null;
  naics_code: string | null;
  employee_count: number | null;
  year_founded: number | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  trust_score: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  industry?: Industry;
  county?: County;
}

export interface Group {
  id: string;
  industry_id: string;
  county_fips: string;
  name: string;
  slug: string;
  description: string | null;
  member_count: number;
  created_at: string;
  // Joined fields
  industry?: Industry;
  county?: County;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  business_id: string;
  role: MemberRole;
  joined_at: string;
  is_muted: boolean;
  // Joined fields
  business?: Business;
  group?: Group;
}

export interface Post {
  id: string;
  group_id: string;
  author_id: string;
  parent_id: string | null;
  post_type: PostType;
  title: string | null;
  body: string;
  media_urls: string[];
  is_pinned: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: Business;
  replies?: Post[];
  is_liked?: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  participants?: ConversationParticipant[];
  last_message?: Message;
  other_participant?: Business;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  business_id: string;
  last_read_at: string;
  joined_at: string;
  // Joined fields
  business?: Business;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  media_urls: string[];
  created_at: string;
  // Joined fields
  sender?: Business;
}

export interface EmergencyRequest {
  id: string;
  requester_id: string;
  category: EmergencyCategory;
  title: string;
  description: string;
  urgency_level: UrgencyLevel;
  latitude: number | null;
  longitude: number | null;
  current_tier: number;
  status: EmergencyStatus;
  expires_at: string | null;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
  created_at: string;
  // Joined fields
  requester?: Business;
  responses?: EmergencyResponse[];
  response_count?: number;
}

export interface EmergencyResponse {
  id: string;
  request_id: string;
  responder_id: string;
  message: string | null;
  estimated_eta: string | null;
  estimated_cost: string | null;
  status: EmergencyResponseStatus;
  created_at: string;
  // Joined fields
  responder?: Business;
}

export interface Listing {
  id: string;
  business_id: string;
  group_id: string | null;
  listing_type: ListingType;
  title: string;
  description: string | null;
  media_urls: string[];
  condition: string | null;
  price: number | null;
  price_type: PriceType | null;
  role_title: string | null;
  hourly_rate: number | null;
  date_needed: string | null;
  duration: string | null;
  skills: string[] | null;
  target_quantity: number | null;
  current_signups: number;
  deal_deadline: string | null;
  supplier_name: string | null;
  status: ListingStatus;
  view_count: number;
  save_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  business?: Business;
  is_saved?: boolean;
}

export interface VerificationSubmission {
  id: string;
  business_id: string;
  document_type: DocumentType;
  document_url: string;
  status: SubmissionStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  target_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  requester?: Business;
  target?: Business;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Json;
  is_read: boolean;
  is_push_sent: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  context_type: ReviewContextType | null;
  context_id: string | null;
  rating: number;
  body: string | null;
  created_at: string;
  // Joined fields
  reviewer?: Business;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referred_to_id: string | null;
  group_id: string | null;
  category: string | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: ReferralStatus;
  created_at: string;
  updated_at: string;
}
