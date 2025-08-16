// Core types and interfaces for Universal Blog Publisher

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser extends Omit<User, 'password'> {
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: AuthUser;
  message: string;
}

// Provider and Connection Types
export interface Provider {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  logo?: string;
  website?: string;
  category: ProviderCategory;
  features: ProviderFeatures;
  authType: AuthType;
  authFields: AuthField[];
  isActive: boolean;
}

export type ProviderCategory = 
  | 'website-builder' 
  | 'cms' 
  | 'static-generator' 
  | 'ecommerce' 
  | 'other';

export type AuthType = 
  | 'api-key' 
  | 'oauth' 
  | 'ftp' 
  | 'webhook' 
  | 'custom';

export interface ProviderFeatures {
  images: boolean;
  tags: boolean;
  scheduling: boolean;
  edit: boolean;
  delete: boolean;
  categories: boolean;
  excerpts: boolean;
  featuredImages: boolean;
  customFields: boolean;
}

export interface AuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

export interface Connection {
  id: string;
  userId: string;
  providerId: string;
  name: string;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
  provider?: Provider;
}

export interface CreateConnectionRequest {
  providerId: string;
  name: string;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
}

// Content Types
export interface Draft {
  id: string;
  userId: string;
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  tags: string[];
  categories: string[];
  status: DraftStatus;
  scheduledAt?: Date;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DraftStatus = 'draft' | 'published' | 'archived';

export interface CreateDraftRequest {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  tags?: string[];
  categories?: string[];
  scheduledAt?: Date;
  isPublic?: boolean;
}

export interface UpdateDraftRequest extends Partial<CreateDraftRequest> {
  status?: DraftStatus;
}

// Publishing Types
export interface PublishInput {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  tags?: string[];
  categories?: string[];
  status?: 'published' | 'draft' | 'private';
  scheduledAt?: Date;
  customFields?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  externalId?: string;
  url?: string;
  message: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Post {
  id: string;
  draftId?: string;
  userId: string;
  connectionId: string;
  externalId?: string;
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  tags: string[];
  categories: string[];
  status: PostStatus;
  publishedAt?: Date;
  lastSynced: Date;
  syncStatus: SyncStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  connection?: Connection;
}

export type PostStatus = 'published' | 'draft' | 'private' | 'deleted';
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'deleted';

export interface PublishJob {
  id: string;
  userId: string;
  draftId: string;
  status: JobStatus;
  progress: number;
  totalTargets: number;
  completed: number;
  failed: number;
  results?: Record<string, PublishResult>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Image Types
export interface Image {
  id: string;
  userId: string;
  postId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageUploadResult {
  success: boolean;
  image?: Image;
  error?: string;
}

// CMS Adapter Interface
export interface CMSAdapter {
  id: string;
  name: string;
  
  verifyConnection(auth: any): Promise<{ ok: boolean; details?: any }>;
  listPosts(auth: any, opts?: { page?: number; limit?: number }): Promise<any[]>;
  createPost(auth: any, input: PublishInput): Promise<PublishResult>;
  updatePost(auth: any, postId: string, input: PublishInput): Promise<PublishResult>;
  deletePost(auth: any, postId: string): Promise<{ ok: boolean; message?: string }>;
  uploadImage?(auth: any, file: Buffer, filename: string): Promise<{ url: string; id?: string }>;
  
  supports: ProviderFeatures;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
}

export type ErrorType = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;