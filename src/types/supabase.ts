export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows generic fallback when typing RPC or dynamic table queries
  [key: string]: any;
};
