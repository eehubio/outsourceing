import { describe, it, expect } from 'vitest';
import { next, can, StateMachineError, allowedEvents } from '@/lib/state-machines/engine';
import { projectMachine, applicationMachine, cooperationMachine } from '@/lib/state-machines/definitions';

describe('项目状态机', () => {
  it('draft -> submit -> pending_review（发布方）', () => {
    expect(next(projectMachine, 'draft', 'submit', 'publisher')).toBe('pending_review');
  });
  it('审核员可 approve 到 published', () => {
    expect(next(projectMachine, 'pending_review', 'approve', 'reviewer')).toBe('published');
  });
  it('发布方不能审核自己的项目（FORBIDDEN）', () => {
    expect(() => next(projectMachine, 'pending_review', 'approve', 'publisher')).toThrow(StateMachineError);
  });
  it('非法转换抛错', () => {
    expect(() => next(projectMachine, 'published', 'approve', 'reviewer')).toThrow(StateMachineError);
  });
});

describe('申请状态机', () => {
  it('完整链路 submitted->shortlisted->invited->accepted', () => {
    expect(next(applicationMachine, 'submitted', 'shortlist', 'publisher')).toBe('shortlisted');
    expect(next(applicationMachine, 'shortlisted', 'invite', 'publisher')).toBe('invited');
    expect(next(applicationMachine, 'invited', 'accept', 'provider')).toBe('accepted');
  });
  it('accepted 为终态，再 accept 抛错', () => {
    expect(() => next(applicationMachine, 'accepted', 'accept', 'provider')).toThrow();
  });
  it('服务方不能替发布方 shortlist', () => {
    expect(can(applicationMachine, 'submitted', 'shortlist', 'provider')).toBe(false);
  });
});

describe('合作确认状态机', () => {
  it('双方确认合流到 both_confirmed', () => {
    expect(next(cooperationMachine, 'not_started', 'publisher_confirm', 'publisher')).toBe('publisher_confirmed');
    expect(next(cooperationMachine, 'publisher_confirmed', 'provider_confirm', 'provider')).toBe('both_confirmed');
  });
  it('both_confirmed 可 transfer', () => {
    expect(next(cooperationMachine, 'both_confirmed', 'transfer', 'publisher')).toBe('transferred');
  });
  it('allowedEvents 反映角色', () => {
    expect(allowedEvents(cooperationMachine, 'not_started', 'publisher')).toContain('publisher_confirm');
    expect(allowedEvents(cooperationMachine, 'not_started', 'publisher')).not.toContain('provider_confirm');
  });
});
