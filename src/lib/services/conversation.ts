import { getRepo } from '../repo';
import { canAccessConversation, assert, roleInProject } from '../auth/permissions';
import type { SessionUser } from '../auth/session';

const repo = () => getRepo();

async function guardByApplication(user: SessionUser, applicationId: string) {
  const conv = await repo().ensureConversation(applicationId);
  const ok = await canAccessConversation(user, conv.id);
  assert(ok, 403, '无权进入该对话');
  return conv;
}

export async function getWorkspace(user: SessionUser, applicationId: string) {
  const app = await repo().getApplication(applicationId);
  assert(!!app, 404, '申请不存在');
  const conv = await guardByApplication(user, applicationId);
  const [messages, clarifications, project] = await Promise.all([
    repo().listMessages(conv.id),
    repo().listClarifications(conv.id),
    repo().getProject(app!.projectId),
  ]);
  const version = await repo().getCurrentVersion(app!.projectId);
  return {
    application: app,
    conversationId: conv.id,
    project,
    requirement: version?.requirement ?? {},
    requirementChanged: app!.versionId && version && app!.versionId !== version.id,
    messages,
    clarifications,
  };
}

export async function sendMessage(user: SessionUser, applicationId: string, body: string, kind: string) {
  const conv = await guardByApplication(user, applicationId);
  // 发送人来自 session，绝不信前端
  const msg = await repo().addMessage(conv.id, user.id, body, kind);
  await repo().audit(user.id, 'message.send', 'Conversation', conv.id);
  return msg;
}

export async function addClarification(user: SessionUser, applicationId: string, question: string, affectsScope: boolean) {
  const conv = await guardByApplication(user, applicationId);
  const q = await repo().addClarification(conv.id, user.id, question, affectsScope);
  await repo().audit(user.id, 'clarification.add', 'Conversation', conv.id);
  return q;
}

export async function answerClarification(user: SessionUser, applicationId: string, clarificationId: string, answer: string, status: string) {
  const conv = await guardByApplication(user, applicationId);
  // 防越权：澄清问题必须属于本对话，不能用本对话权限去改别处的问题
  const clr = await repo().getClarification(clarificationId);
  assert(!!clr && clr.conversationId === conv.id, 404, '问题不存在或不属于该对话');
  const q = await repo().answerClarification(clarificationId, user.id, answer, status);
  await repo().audit(user.id, 'clarification.answer', 'ClarificationQuestion', clarificationId);
  return q;
}
