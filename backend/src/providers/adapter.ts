export interface PublishInput {
  title: string;
  body: string;
  tags?: string[];
  categories?: string[];
  scheduledAt?: Date;
  images?: { url: string; id?: string }[];
}

export interface PublishResult {
  ok: boolean;
  postId?: string;
  url?: string;
  details?: any;
}

export interface CMSAdapter {
  id: string;
  name: string;
  verifyConnection(auth: any): Promise<{ ok: boolean; details?: any }>;
  listPosts(auth: any, opts?: { page?: number }): Promise<any[]>;
  createPost(auth: any, input: PublishInput): Promise<PublishResult>;
  updatePost(auth: any, postId: string, input: PublishInput): Promise<PublishResult>;
  deletePost(auth: any, postId: string): Promise<{ ok: boolean }>;
  uploadImage?: (auth: any, file: Buffer, filename: string) => Promise<{ url: string; id?: string }>;
  supports: {
    images: boolean;
    tags: boolean;
    scheduling: boolean;
    edit: boolean;
    delete: boolean;
  };
}