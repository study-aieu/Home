import { Model, Optional } from 'sequelize';
interface BlogSiteAttributes {
    id: number;
    userId: number;
    name: string;
    url: string;
    username: string;
    applicationPassword: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
interface BlogSiteCreationAttributes extends Optional<BlogSiteAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> {
}
declare class BlogSite extends Model<BlogSiteAttributes, BlogSiteCreationAttributes> implements BlogSiteAttributes {
    id: number;
    userId: number;
    name: string;
    url: string;
    username: string;
    applicationPassword: string;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getApiBaseUrl(): string;
    getAuthHeader(): string;
    toJSON(): Omit<BlogSiteAttributes, 'applicationPassword'>;
}
export default BlogSite;
//# sourceMappingURL=BlogSite.d.ts.map