// 通用状态机引擎：定义 = 当前态 -> { 事件: { to, roles } }
// 转换时校验：当前态允许该事件、操作者角色被许可。

export type Role = 'publisher' | 'provider' | 'reviewer' | 'admin' | 'system';

export interface Transition {
  to: string;
  roles: Role[];
}
export type Definition = Record<string, Record<string, Transition>>;

export class StateMachineError extends Error {
  constructor(public code: 'INVALID_TRANSITION' | 'FORBIDDEN', message: string) {
    super(message);
  }
}

export function can(def: Definition, from: string, event: string, role: Role): boolean {
  const t = def[from]?.[event];
  if (!t) return false;
  return t.roles.includes(role);
}

export function next(def: Definition, from: string, event: string, role: Role): string {
  const t = def[from]?.[event];
  if (!t) throw new StateMachineError('INVALID_TRANSITION', `不能从「${from}」执行「${event}」`);
  if (!t.roles.includes(role)) throw new StateMachineError('FORBIDDEN', `角色「${role}」无权执行「${event}」`);
  return t.to;
}

export function allowedEvents(def: Definition, from: string, role: Role): string[] {
  const m = def[from] || {};
  return Object.keys(m).filter((ev) => m[ev].roles.includes(role));
}
