import bcrypt from 'bcryptjs';
import { UserModel } from '../users/user.model.js';

export async function createUser(input: { name: string; email: string; password: string }) {
  const existing = await UserModel.exists({ email: input.email });
  if (existing) return null;
  return UserModel.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) });
}

export async function authenticateUser(email: string, password: string) {
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return user;
}
