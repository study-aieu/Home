import { Request } from 'express';

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

// Provider and Connection Types
export interface ProviderCredentials {
  [key: string]: any;
}

export interface Connection {
  id: string;
  userId: string;
  providerId: string;
  name: string;
  credentials: ProviderCredentials;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Blog Content Types
export interface PublishInput {
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  categories?: string[];
  featuredImage?: string;
  publishedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Draft {
  id: string;
  userId: string;
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  categories: string[];
  featuredImage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  draftId?: string;
  connectionId: string;
  externalId?: string;
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  categories: string[];
  featuredImage?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'FAILED';
  publishedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// CMS Adapter Interface
export interface CMSAdapter {
  id: string;
  name: string;
  description: string;
  website: string;
  
  // Core functionality
  verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }>;
  listPosts(auth: ProviderCredentials, opts?: { page?: number; limit?: number }): Promise<ExternalPost[]>;
  createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult>;
  updatePost(auth: ProviderCredentials, postId: string, input: PublishInput): Promise<PublishResult>;
  deletePost(auth: ProviderCredentials, postId: string): Promise<{ ok: boolean; error?: string }>;
  
  // Optional functionality
  uploadImage?(auth: ProviderCredentials, file: Buffer, filename: string): Promise<{ url: string; id?: string }>;
  getPost?(auth: ProviderCredentials, postId: string): Promise<ExternalPost>;
  
  // Capabilities
  supports: {
    images: boolean;
    tags: boolean;
    categories: boolean;
    scheduling: boolean;
    drafts: boolean;
    edit: boolean;
    delete: boolean;
    excerpt: boolean;
    featuredImage: boolean;
  };
  
  // Authentication requirements
  authFields: AuthField[];
}

export interface AuthField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'textarea';
  required: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ExternalPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  categories?: string[];
  featuredImage?: string;
  publishedAt?: Date;
  status?: string;
  url?: string;
  metadata?: Record<string, any>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// File Upload Types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Provider Registry
export interface ProviderRegistry {
  [providerId: string]: CMSAdapter;
}

// Multi-publish Types
export interface MultiPublishRequest {
  draftId: string;
  connectionIds: string[];
  publishAt?: Date;
}

export interface MultiPublishResult {
  draftId: string;
  results: Array<{
    connectionId: string;
    success: boolean;
    postId?: string;
    externalId?: string;
    url?: string;
    error?: string;
  }>;
}