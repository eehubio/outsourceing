'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell, Pill, useMe, LoginPrompt } from '@/components/Shell';
import { api } from '@/components/client';
import { PROJECT_TYPES } from '@/lib/constants';

const typeLabel = (id: string) => PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;

export default function MyProjectsPage() {
  const router = useRouter();
  const { me } = useMe();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!me) { setLoading(false); return; }
    setLoading(true);
    api<{ projects: any[] }>('/api/outsourcing/projects?scope=mine')
      .then((d) => setProjects(d.projects))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [me?.id]);

  return (
    <Shell title="我发布的">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">我发布的项目</div>
          <div className="page-sub">管理草稿、审核状态、收到的申请、合作确认与 ezPLM 移交。</div>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/outsourcing/projects/new')}>＋ 发布新项目</button>
      </div>

      {!me ? <LoginPrompt /> : loading ? <div className="skeleton" style={{ height: 200 }} /> : projects.length === 0 ? (
        <div className="empty"><div className="ico">📋</div>还没有发布项目<div style={{ marginTop: 14 }}><button className="btn btn-primary" onClick={() => router.push('/outsourcing/projects/new')}>＋ 发布第一个项目</button></div></div>
      ) : (
        <div className="grid">
          {projects.map((p) => (
            <div key={p.id} className="card">
              <div className="card-body">
                <div className="card-row">
                  <span className="tag tag-blue">{typeLabel(p.projectType)}</span>
                  <Pill status={p.status} />
                </div>
                <div className="card-title">{p.title}</div>
                {p.status === 'rejected' && p.reviewNote && <div className="banner banner-warn" style={{ fontSize: 12, padding: 10 }}>驳回原因：{p.reviewNote}</div>}
                <div className="card-meta" style={{ borderTop: 'none', paddingTop: 8 }}>
                  <span>💰 {p.budgetRange}</span>
                  <span>💳 费用 ¥{p.feeTotal}{p.paid ? ' · 已付' : ' · 未付'}</span>
                  <span>📨 申请 {p.applicationCount ?? 0}</span>
                </div>
              </div>
              <div className="card-footer" style={{ flexWrap: 'wrap' }}>
                {(p.status === 'draft' || p.status === 'revision_required' || p.status === 'rejected') && (
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => router.push(`/outsourcing/projects/${p.id}/edit`)}>编辑 / 提交</button>
                )}
                {p.status === 'pending_review' && <button className="btn btn-ghost btn-sm btn-block" disabled>审核中…</button>}
                {['published', 'matched', 'cooperation_confirming'].includes(p.status) && (
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => router.push(`/outsourcing/projects/${p.id}/applications`)}>管理申请</button>
                )}
                {p.status === 'transferred_to_ezplm' && (
                  <button className="btn btn-outline btn-sm btn-block" onClick={() => router.push(`/outsourcing/projects/${p.id}/applications`)}>查看移交结果</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/outsourcing/projects/${p.id}`)}>预览</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
