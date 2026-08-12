import { UserModel } from './user.model.js';

export const publicUser = (user: { _id: unknown; name: string; email: string; createdAt: Date }) => ({
  id: String(user._id), name: user.name, email: user.email, createdAt: user.createdAt
});

export async function findPublicUser(userId: string) {
  const user = await UserModel.findById(userId);
  return user ? publicUser(user) : null;
}
