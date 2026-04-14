// =============================================================================
// NdPay — Core TypeScript Types
// =============================================================================

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';
export type TransactionType = 'transfer' | 'deposit' | 'withdrawal';
export type NotificationType = 'credit' | 'debit' | 'system' | 'security';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_number: string;
  avatar_url: string | null;
  pin_hash: string;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  full_name: string;
  email: string;
  account_number: string;
  avatar_url: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  reference: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  narration: string | null;
  type: TransactionType;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  // Joined fields
  sender?: PublicProfile;
  receiver?: PublicProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  metadata: {
    transaction_id?: string;
    reference?: string;
    amount?: number;
    counterpart_id?: string;
    counterpart_name?: string;
  } | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  nickname: string | null;
  created_at: string;
  contact?: PublicProfile;
}

// API Response types
export interface TransferResult {
  success: boolean;
  transaction: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: TransactionStatus;
    narration: string | null;
    sender: {
      id: string;
      full_name: string;
      account_number: string;
    };
    receiver: {
      id: string;
      full_name: string;
      account_number: string;
    };
    created_at: string;
    completed_at: string;
  };
  sender_balance: number;
}

export interface ApiError {
  code: string;
  message: string;
}

// UI State types
export interface SendMoneyState {
  step: 'search' | 'amount' | 'confirm' | 'pin' | 'success';
  recipient: PublicProfile | null;
  amount: string;
  narration: string;
  result: TransferResult | null;
}

export interface TransactionFilter {
  type?: TransactionType;
  status?: TransactionStatus;
  dateRange?: '7d' | '30d' | '90d' | 'all';
  direction?: 'sent' | 'received' | 'all';
}

// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      wallets: {
        Row: Wallet;
        Insert: Omit<Wallet, 'id' | 'updated_at'>;
        Update: Partial<Omit<Wallet, 'id' | 'user_id'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'sender_id' | 'receiver_id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Pick<Notification, 'is_read'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id' | 'created_at'>;
        Update: Partial<Pick<Contact, 'nickname'>>;
      };
    };
    Functions: {
      execute_transfer: {
        Args: {
          p_sender_id: string;
          p_receiver_id: string;
          p_amount: number;
          p_pin: string;
          p_narration?: string;
        };
        Returns: TransferResult;
      };
      search_users: {
        Args: { p_query: string };
        Returns: PublicProfile[];
      };
      set_transaction_pin: {
        Args: { p_user_id: string; p_pin: string };
        Returns: boolean;
      };
      mark_notifications_read: {
        Args: { p_user_id: string; p_notification_ids?: string[] };
        Returns: number;
      };
    };
  };
};
