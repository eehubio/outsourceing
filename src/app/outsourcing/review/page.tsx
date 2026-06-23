'use client';

import { useEffect, useState } from 'react';
import { Shell, PrdView, useMe, Toast } from '@/components/Shell';
import { api } from '@/components/client';
import { PROJECT_TYPES } from '@/lib/constants';

const typeLabel = (id: string) => PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;

export default function ReviewPage() {
  const { me } = useMe();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const load = () => {
    if (!me) { setLoading(false); return; }
    setLoading(true);
    api<{ projects: any[] }>('/api/outsourcing/projects?scope=review')
      .then((d) => setProjects(d.projects))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [me?.id]);

  const isReviewer = me && (me.platformRole === 'REVIEWER' || me.platformRole === 'ADMIN');

  const decide = async (decision: string) => {
    if (decision === 'reject' && !note.trim()) { flash('驳回需填写原因'); return; }
    setBusy(true);
    try {
      await api(`/api/outsourcing/projects/${active.id}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) });
      flash(decision === 'approve' ? '已通过并上架' : decision === 'reject' ? '已驳回' : '已要求修改');
      setActive(null); setNote(''); load();
    } catch (e) { flash((e as Error).message); } finally { setBusy(false); }
  };

  if (!isReviewer) return <Shell title="审核台"><div className="empty">仅平台审核员可访问。请在右上角切换为审核员身份。</div></Shell>;

  return (
    <Shell title="审核台">
      <Toast msg={toast} />
      <div className="page-head">
        <div className="page-title">项目审核台</div>
        <div className="page-sub">审核发布方提交并已支付的项目需求规范，通过后在广场展示。</div>
      </div>

      {loading ? <div className="skeleton" style={{ height: 160 }} /> : active ? (
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => setActive(null)} style={{ marginBottom: 14 }}>← 返回列表</button>
          <div className="panel">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className="tag tag-blue">{typeLabel(active.projectType)}</span>
              <span className="tag">预算 {active.budgetRange}</span>
              <span className="tag">已付 ¥{active.feeTotal}</span>
              {active.currentVersion && <span className="tag">完整度 {active.currentVersion.completeness}%</span>}
            </div>
            <div className="page-title" style={{ fontSize: 18 }}>{active.title}</div>
          </div>
          <div className="panel"><div className="panel-title">需求规范</div><PrdView prd={active.prd} /></div>
          <div className="panel">
            <div className="field"><label>审核意见 <span className="hint">驳回/要求修改时填写</span></label><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled={busy} onClick={() => decide('approve')}>✓ 通过并上架</button>
              <button className="btn btn-outline" disabled={busy} onClick={() => decide('request_revision')}>要求修改</button>
              <button className="btn btn-danger" disabled={busy} onClick={() => decide('reject')}>驳回</button>
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty"><div className="ico">✅</div>没有待审核的项目</div>
      ) : (
        <div className="grid">
          {projects.map((p) => (
            <div key={p.id} className="card">
              <div className="card-body">
                <div className="card-row"><span className="tag tag-blue">{typeLabel(p.projectType)}</span><span className="pill pill-pending_review">待审核</span></div>
                <div className="card-title">{p.title}</div>
                <div className="card-meta" style={{ borderTop: 'none', paddingTop: 8 }}>
                  <span>💰 {p.budgetRange}</span><span>💳 ¥{p.feeTotal}</span>
                  {p.currentVersion && <span>📊 完整度 {p.currentVersion.completeness}%</span>}
                </div>
              </div>
              <div className="card-footer"><button className="btn btn-primary btn-block" onClick={async () => {
                const d = await api<{ project: any }>(`/api/outsourcing/projects/${p.id}`); setActive(d.project);
              }}>审核需求规范</button></div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
