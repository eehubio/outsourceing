import { z } from 'zod';
import { BUDGET_RANGES } from './constants';

export const prdSchema = z.object({
  background: z.string().optional(),
  goals: z.string().optional(),
  scenarios: z.string().optional(),
  scope: z.string().optional(),
  functional: z.string().optional(),
  performance: z.string().optional(),
  io: z.string().optional(),
  interfaces: z.string().optional(),
  environment: z.string().optional(),
  dimensions: z.string().optional(),
  power: z.string().optional(),
  costTarget: z.string().optional(),
  budget: z.string().optional(),
  duration: z.string().optional(),
  existingBase: z.string().optional(),
  contractorWork: z.string().optional(),
  outOfScope: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  acceptance: z.string().optional(),
  ip: z.string().optional(),
  confidentiality: z.string().optional(),
  skills: z.string().optional(),
  risks: z.string().optional(),
});

export const createProjectSchema = z.object({
  title: z.string().min(2, '标题至少 2 个字'),
  projectType: z.string().min(1),
  industry: z.string().optional(),
  budgetRange: z.enum(BUDGET_RANGES),
  durationText: z.string().optional(),
  skills: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  location: z.string().default('远程'),
  visibility: z.string().default('summary_apply'),
  needNda: z.boolean().default(false),
  orgId: z.string().optional(), // 可选；缺省用用户默认组织
  prd: prdSchema.default({}),
});

export const updateProjectSchema = createProjectSchema.partial();

export const applicationProposalSchema = z.object({
  realName: z.string().optional(),
  contact: z.string().optional(),
  identityType: z.string().optional(),
  region: z.string().optional(),
  yearsExperience: z.string().optional(),
  relevantExperience: z.string().optional(),
  matchedSkills: z.string().optional(),
  familiarMcuEda: z.string().optional(),
  toolchain: z.string().optional(),
  understanding: z.string().optional(),
  approach: z.string().optional(),
  milestones: z.string().optional(),
  risks: z.string().optional(),
  questions: z.string().optional(),
  cases: z.string().optional(),
  excludes: z.string().optional(),
  availableFrom: z.string().optional(),
  canInvoice: z.boolean().optional(),
  supportsProduction: z.boolean().optional(),
  supportsOnsite: z.boolean().optional(),
});

export const createApplicationSchema = z.object({
  proposal: applicationProposalSchema.default({}),
  quote: z.string().default(''),
  durationText: z.string().default(''),
  validUntil: z.string().optional(),
});

export const messageSchema = z.object({
  body: z.string().min(1, '消息不能为空').max(4000),
  kind: z.enum(['text', 'file']).default('text'),
});

export const clarificationSchema = z.object({
  question: z.string().min(1),
  affectsScope: z.boolean().default(false),
});

export const answerClarificationSchema = z.object({
  answer: z.string().min(1),
  status: z.enum(['answered', 'confirmed', 'deferred']).default('answered'),
});

export const confirmationItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().optional(),
});

export const transitionSchema = z.object({
  event: z.string().min(1),
  note: z.string().optional(),
});
