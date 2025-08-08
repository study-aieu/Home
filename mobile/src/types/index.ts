export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface BlogSite {
  id: number;
  userId: number;
  name: string;
  url: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: number;
  title: {
    rendered: string;
    raw?: string;
  };
  content: {
    rendered: string;
    raw?: string;
  };
  excerpt: {
    rendered: string;
    raw?: string;
  };
  status: 'draft' | 'publish' | 'private';
  date: string;
  modified: string;
  featured_media: number;
  link: string;
}

export interface MediaItem {
  id: number;
  title: {
    rendered: string;
  };
  source_url: string;
  media_type: string;
  mime_type: string;
  alt_text: string;
  caption: {
    rendered: string;
  };
  date: string;
}

export interface Draft {
  id: string;
  title: string;
  content: string;
  siteId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  errors?: Array<{
    msg: string;
    param: string;
    location: string;
  }>;
}