// Schema maintained alongside migrations. Regenerate from Supabase after remote validation.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type profiles = { id: string; full_name: string; avatar_url: string | null; created_at: string };
export type spaces = { id: string; owner_id: string; name: string; type: 'personal' | 'family'; created_at: string };
export type space_members = { space_id: string; user_id: string; role: 'owner' | 'admin' | 'member'; invited_by: string | null; invited_at: string };
export type space_invitations = { id: string; space_id: string; email: string; token_hash: string; status: 'pending' | 'accepted' | 'declined'; created_at: string; expires_at: string };
export type accounts = { id: string; space_id: string; name: string; opening_cents: number; created_at: string };
export type categories = { id: string; space_id: string; name: string; kind: 'income' | 'expense' };
export type cards = { id: string; space_id: string; name: string; limit_cents: number; closing_day: number; due_day: number };
export type debts = { id: string; space_id: string; name: string; principal_cents: number; due_date: string };
export type transactions = { id: string; space_id: string; request_key: string; description: string; kind: 'income' | 'expense' | 'transfer' | 'card_payment' | 'debt_payment'; amount_cents: number; occurred_on: string; status: 'pending' | 'posted' | 'cancelled'; account_id: string | null; to_account_id: string | null; category_id: string | null; card_id: string | null; debt_id: string | null; created_by: string; created_at: string };
type Table<Row, Required extends keyof Row> = { Row: Row; Insert: Pick<Row, Required> & Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = { public: { Tables: {
 profiles: Table<profiles, 'id' | 'full_name'>;
 spaces: Table<spaces, 'owner_id' | 'name' | 'type'>;
 space_members: Table<space_members, 'space_id' | 'user_id'>;
 space_invitations: Table<space_invitations, 'space_id' | 'email' | 'token_hash'>;
 accounts: Table<accounts, 'space_id' | 'name'>;
 categories: Table<categories, 'space_id' | 'name' | 'kind'>;
 cards: Table<cards, 'space_id' | 'name' | 'limit_cents' | 'closing_day' | 'due_day'>;
 debts: Table<debts, 'space_id' | 'name' | 'principal_cents' | 'due_date'>;
 transactions: Table<transactions, 'space_id' | 'request_key' | 'description' | 'kind' | 'amount_cents' | 'occurred_on'>;
}; Views: {
 account_balances: { Row: accounts & { balance_cents: number }; Relationships: [] };
 card_balances: { Row: cards & { owed_cents: number }; Relationships: [] };
 debt_balances: { Row: debts & { remaining_cents: number }; Relationships: [] };
}; Functions: {
 finance_summary: { Args: { p_space_id: string; p_as_of: string }; Returns: Json };
 create_space_with_owner: { Args: { p_name: string; p_type: string }; Returns: string };
 accept_invitation_secure: { Args: { p_token_hash: string }; Returns: string };
 is_space_member: { Args: { p_space_id: string; p_user_id?: string }; Returns: boolean };
 is_space_manager: { Args: { p_space_id: string; p_user_id?: string }; Returns: boolean };
 is_space_owner: { Args: { p_space_id: string; p_user_id?: string }; Returns: boolean };
}; Enums: Record<string, never>; CompositeTypes: Record<string, never>; } };
