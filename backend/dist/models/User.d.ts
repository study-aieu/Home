import { Model, Optional } from 'sequelize';
interface UserAttributes {
    id: number;
    email: string;
    password: string;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: number;
    email: string;
    password: string;
    name: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    validatePassword(password: string): Promise<boolean>;
    toJSON(): Omit<UserAttributes, 'password'>;
}
export default User;
//# sourceMappingURL=User.d.ts.map