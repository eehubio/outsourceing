import type { Definition } from './engine';

// 项目状态机
export const projectMachine: Definition = {
  draft: {
    submit: { to: 'pending_review', roles: ['publisher'] },
    cancel: { to: 'cancelled', roles: ['publisher'] },
  },
  pending_review: {
    approve: { to: 'published', roles: ['reviewer', 'admin'] },
    reject: { to: 'rejected', roles: ['reviewer', 'admin'] },
    request_revision: { to: 'revision_required', roles: ['reviewer', 'admin'] },
  },
  revision_required: {
    submit: { to: 'pending_review', roles: ['publisher'] },
    cancel: { to: 'cancelled', roles: ['publisher'] },
  },
  rejected: {
    submit: { to: 'pending_review', roles: ['publisher'] },
  },
  published: {
    pause: { to: 'paused', roles: ['publisher', 'admin'] },
    match: { to: 'matched', roles: ['publisher'] },
    close: { to: 'closed', roles: ['publisher', 'admin'] },
  },
  paused: {
    resume: { to: 'published', roles: ['publisher', 'admin'] },
    close: { to: 'closed', roles: ['publisher', 'admin'] },
  },
  matched: {
    start_cooperation: { to: 'cooperation_confirming', roles: ['publisher'] },
    reopen: { to: 'published', roles: ['publisher'] },
  },
  cooperation_confirming: {
    transfer: { to: 'transferred_to_ezplm', roles: ['publisher', 'system'] },
    cancel_cooperation: { to: 'published', roles: ['publisher'] },
  },
  transferred_to_ezplm: {
    close: { to: 'closed', roles: ['publisher', 'admin'] },
  },
};

// 申请状态机
export const applicationMachine: Definition = {
  draft: {
    submit: { to: 'submitted', roles: ['provider'] },
    withdraw: { to: 'withdrawn', roles: ['provider'] },
  },
  submitted: {
    discuss: { to: 'under_discussion', roles: ['publisher', 'provider'] },
    shortlist: { to: 'shortlisted', roles: ['publisher'] },
    reject: { to: 'rejected', roles: ['publisher'] },
    withdraw: { to: 'withdrawn', roles: ['provider'] },
  },
  under_discussion: {
    shortlist: { to: 'shortlisted', roles: ['publisher'] },
    reject: { to: 'rejected', roles: ['publisher'] },
    withdraw: { to: 'withdrawn', roles: ['provider'] },
  },
  shortlisted: {
    invite: { to: 'invited', roles: ['publisher'] },
    reject: { to: 'rejected', roles: ['publisher'] },
    withdraw: { to: 'withdrawn', roles: ['provider'] },
  },
  invited: {
    accept: { to: 'accepted', roles: ['provider'] },
    reject: { to: 'rejected', roles: ['publisher'] },
    withdraw: { to: 'withdrawn', roles: ['provider'] },
  },
  rejected: {
    // 取消合作或重新选择时，发布方可重新邀请此前被拒/被自动关闭的候选
    invite: { to: 'invited', roles: ['publisher'] },
  },
  accepted: {
    // 终态（合作确认在 cooperation 机内推进）
  },
};

// 合作确认状态机（事件携带是哪一方确认）
export const cooperationMachine: Definition = {
  not_started: {
    publisher_confirm: { to: 'publisher_confirmed', roles: ['publisher'] },
    provider_confirm: { to: 'provider_confirmed', roles: ['provider'] },
    cancel: { to: 'cancelled', roles: ['publisher', 'provider'] },
  },
  publisher_confirmed: {
    provider_confirm: { to: 'both_confirmed', roles: ['provider'] },
    cancel: { to: 'cancelled', roles: ['publisher', 'provider'] },
  },
  provider_confirmed: {
    publisher_confirm: { to: 'both_confirmed', roles: ['publisher'] },
    cancel: { to: 'cancelled', roles: ['publisher', 'provider'] },
  },
  both_confirmed: {
    transfer: { to: 'transferred', roles: ['publisher', 'system'] },
    cancel: { to: 'cancelled', roles: ['publisher', 'provider'] },
  },
};
