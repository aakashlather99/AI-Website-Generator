export interface User {
  id: number;
  name: string;
  email: string;
  credits: number;
  role: 'user' | 'admin';
  subscription_tier: 'free' | 'pro' | 'enterprise';
  avatar_url?: string;
  created_at?: string;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Version {
  id: number;
  version_number: number;
  change_description: string;
  created_at: string;
}

export interface ProjectFile {
  id: number;
  file_path: string;
  file_type: string;
  updated_at: string;
}

export interface Project {
  id: number;
  title: string;
  prompt: string;
  html_code: string;
  framework: 'html' | 'react' | 'nextjs';
  is_published: boolean;
  is_multi_page: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  conversation?: Message[];
  versions?: Version[];
  files?: ProjectFile[];
}

export interface Template {
  id: number;
  title: string;
  description: string;
  category: string;
  thumbnail_url?: string;
  html_code?: string;
  prompt_hint?: string;
  framework: string;
  is_premium: boolean;
  usage_count: number;
}

export interface CreditTransaction {
  id: number;
  amount: number;
  type: 'purchase' | 'usage' | 'bonus' | 'refund';
  description: string;
  balance_after: number;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalGenerations: number;
  completed: number;
  failed: number;
}

export interface Framework {
  id: string;
  name: string;
  description: string;
}