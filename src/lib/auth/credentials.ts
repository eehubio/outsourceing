import bcrypt from 'bcryptjs';
import { getRepo } from '../repo';
import { HttpError } from './session';

const repo = () => getRepo();

export async function registerUser(input: { email: string; name: string; password: string; accountType: string }) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422, '邮箱格式不正确');
  if (input.password.length < 6) throw new HttpError(422, '密码至少 6 位');
  if (!input.name.trim()) throw new HttpError(422, '请填写姓名/团队名');
  if (!['provider', 'publisher'].includes(input.accountType)) throw new HttpError(422, '账户类型不合法');

  const existing = await repo().getUserByEmail(email);
  if (existing) throw new HttpError(409, '该邮箱已注册');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await repo().createUser({ email, name: input.name.trim(), passwordHash, accountType: input.accountType, platformRole: 'USER' });
  await repo().audit(user.id, 'user.register', 'User', user.id, { accountType: input.accountType });
  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await repo().getUserByEmail(email);
  // 统一错误信息，避免暴露邮箱是否存在
  if (!user || !user.passwordHash) throw new HttpError(401, '邮箱或密码错误');
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, '邮箱或密码错误');
  return user;
}
