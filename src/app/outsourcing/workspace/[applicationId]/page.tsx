'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Shell, PrdView, useMe, Toast } from '@/components/Shell';
import { api } from '@/components/client';

export default function WorkspacePage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const router = useRouter();
  const { me } = useMe();
  const [ws, setWs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'req' | 'clarify' | 'chat'>('req');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [affects, setAffects] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); };
  const load = async () => {
    try { const d = await api(`/api/outsourcing/workspace/${applicationId}`); setWs(d); }
    catch (e) { flash((e as Error).message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [applicationId]);
  useEffect(() => { if (tab === 'chat' && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [ws, tab]);

  const send = async () => {
    if (!text.trim()) return;
    try { await api(`/api/outsourcing/workspace/${applicationId}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) }); setText(''); load(); }
    catch (e) { flash((e as Error).message); }
  };
  const ask = async () => {
    if (!q.trim()) return;
    try { await api(`/api/outsourcing/workspace/${applicationId}/clarifications`, { method: 'POST', body: JSON.stringify({ question: q, affectsScope: affects }) }); setQ(''); setAffects(false); load(); }
    catch (e) { flash((e as Error).message); }
  };
  const answer = async (clarificationId: string, ans: string, status: string) => {
    try { await api(`/api/outsourcing/workspace/${applicationId}/clarifications`, { method: 'PATCH', body: JSON.stringify({ clarificationId, answer: ans, status }) }); load(); }
    catch (e) { flash((e as Error).message); }
  };

  if (loading) return <Shell title="前期沟通工作台"><div className="skeleton" style={{ height: 300 }} /></Shell>;
  if (!ws) return <Shell title="前期沟通工作台"><div className="empty">无法访问该工作台</div></Shell>;

  return (
    <Shell title="前期沟通工作台">
      <Toast msg={toast} />
      <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ marginBottom: 14 }}>← 返回</button>
      <div className="page-head">
        <div className="page-title">{ws.project?.title}</div>
        <div className="page-sub">承接方：{ws.application?.applicantName} · 报价 {ws.application?.quote || '—'} · 周期 {ws.application?.durationText || '—'}</div>
      </div>

      {ws.requirementChanged && <div className="banner banner-warn">提示：项目需求已更新到新版本，申请时所见内容可能已变化。</div>}

      <div className="tabs">
        <button className={'tab' + (tab === 'req' ? ' active' : '')} onClick={() => setTab('req')}>需求摘要</button>
        <button className={'tab' + (tab === 'clarify' ? ' active' : '')} onClick={() => setTab('clarify')}>问题澄清{ws.clarifications?.length ? ` (${ws.clarifications.length})` : ''}</button>
        <button className={'tab' + (tab === 'chat' ? ' active' : '')} onClick={() => setTab('chat')}>消息沟通{ws.messages?.length ? ` (${ws.messages.length})` : ''}</button>
      </div>

      {tab === 'req' && <div className="panel"><PrdView prd={ws.requirement} /></div>}

      {tab === 'clarify' && (
        <div className="panel">
          <div className="field"><label>提出澄清问题</label>
            <textarea className="textarea" value={q} onChange={(e) => setQ(e.target.value)} placeholder="例如：是否需要提供上位机？测试夹具是否包含在交付？" />
            <label className="check" style={{ marginTop: 8, display: 'inline-flex' }}><input type="checkbox" checked={affects} onChange={(e) => setAffects(e.target.checked)} />该问题可能影响项目范围</label>
          </div>
          <button className="btn btn-primary btn-sm" onClick={ask}>提交问题</button>
          <div className="divider" />
          {(!ws.clarifications || ws.clarifications.length === 0) ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>还没有澄清问题。</div> : ws.clarifications.map((c: any) => (
            <div key={c.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span className={'pill ' + (c.status === 'open' ? 'pill-pending_review' : c.status === 'confirmed' ? 'pill-accepted' : 'pill-submitted')}>{c.status === 'open' ? '待回答' : c.status === 'answered' ? '已回答' : c.status === 'confirmed' ? '已确认' : '已搁置'}</span>
                {c.affectsScope && <span className="tag" style={{ color: 'var(--amber)' }}>影响范围</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>Q：{c.question}</div>
              {c.answer ? <div style={{ fontSize: 13, marginTop: 4 }}>A：{c.answer}</div> : (
                <AnswerBox onAnswer={(ans, status) => answer(c.id, ans, status)} />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'chat' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="chat-log" ref={logRef} style={{ maxHeight: 380 }}>
            {(!ws.messages || ws.messages.length === 0) ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>还没有消息，开始沟通吧</div> :
              ws.messages.map((m: any) => (
                <div key={m.id} className={'bubble ' + (m.kind === 'system' ? 'system' : m.senderId === me?.id ? 'me' : 'them')}>
                  {m.kind !== 'system' && <div className="who">{m.senderName} · {new Date(m.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                  {m.body}
                </div>
              ))}
          </div>
          <div className="chat-input">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="输入消息…" />
            <button className="btn btn-primary btn-sm" onClick={send}>发送</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function AnswerBox({ onAnswer }: { onAnswer: (ans: string, status: string) => void }) {
  const [a, setA] = useState('');
  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
      <input className="input" value={a} onChange={(e) => setA(e.target.value)} placeholder="回答此问题…" />
      <button className="btn btn-primary btn-sm" disabled={!a.trim()} onClick={() => onAnswer(a, 'answered')}>回答</button>
    </div>
  );
}
