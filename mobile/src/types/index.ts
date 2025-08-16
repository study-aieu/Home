// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name?: string;
}

// Provider Types
export interface Provider {
  id: string;
  name: string;
  description: string;
  website: string;
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

export interface Connection {
  id: string;
  userId: string;
  providerId: string;
  name: string;
  isActive: boolean;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

// Blog Content Types
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
  createdAt: string;
  updatedAt: string;
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
  publishedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  connection?: {
    id: string;
    name: string;
    providerId: string;
  };
  draft?: {
    id: string;
    title: string;
  };
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

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Drafts: undefined;
  DraftEditor: { draftId?: string };
  Connections: undefined;
  AddConnection: { providerId?: string };
  EditConnection: { connectionId: string };
  Providers: undefined;
  ProviderDetail: { providerId: string };
  Posts: undefined;
  PostDetail: { postId: string };
  Publish: { draftId: string };
  MultiPublish: { draftId: string };
  Profile: undefined;
  Settings: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Drafts: undefined;
  Connections: undefined;
  Posts: undefined;
  Profile: undefined;
};

// Form Types
export interface DraftForm {
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  categories: string[];
  featuredImage?: string;
}

export interface ConnectionForm {
  name: string;
  credentials: Record<string, string>;
}

export interface PublishForm {
  connectionId: string;
  publishAt?: Date;
}

export interface MultiPublishForm {
  connectionIds: string[];
  publishAt?: Date;
}

// App State
export interface AppState {
  auth: AuthState;
  providers: Provider[];
  connections: Connection[];
  drafts: Draft[];
  posts: Post[];
  isLoading: boolean;
  error: string | null;
}

// Utility Types
export interface ImageAsset {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export interface PublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
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