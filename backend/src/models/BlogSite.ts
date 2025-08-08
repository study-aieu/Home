import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './database';
import User from './User';

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

interface BlogSiteCreationAttributes extends Optional<BlogSiteAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> {}

class BlogSite extends Model<BlogSiteAttributes, BlogSiteCreationAttributes> implements BlogSiteAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public url!: string;
  public username!: string;
  public applicationPassword!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Method to get WordPress API base URL
  public getApiBaseUrl(): string {
    const cleanUrl = this.url.replace(/\/$/, '');
    return `${cleanUrl}/wp-json/wp/v2`;
  }

  // Method to get basic auth header for WordPress API
  public getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64');
    return `Basic ${credentials}`;
  }

  public toJSON(): Omit<BlogSiteAttributes, 'applicationPassword'> {
    const { applicationPassword, ...siteWithoutPassword } = super.toJSON() as BlogSiteAttributes;
    return siteWithoutPassword;
  }
}

BlogSite.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    applicationPassword: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'blog_sites',
  }
);

// Define associations
User.hasMany(BlogSite, { foreignKey: 'userId', as: 'blogSites' });
BlogSite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default BlogSite;