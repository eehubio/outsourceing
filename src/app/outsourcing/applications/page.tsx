'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell, Pill, useMe, LoginPrompt } from '@/components/Shell';
import { api, APPLICATION_STATUS_LABEL } from '@/components/client';

export default function MyApplicationsPage() {
  const router = useRouter();
  const { me } = useMe();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) { setLoading(false); return; }
    setLoading(true);
    api<{ applications: any[] }>('/api/outsourcing/applications/mine')
      .then((d) => setApps(d.applications))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [me?.id]);

  return (
    <Shell title="我的申请">
      <div className="page-head">
        <div className="page-title">我的申请</div>
        <div className="page-sub">跟踪每个申请的状态，进入前期沟通工作台与发布方对接。</div>
      </div>
      {!me ? <LoginPrompt /> : loading ? <div className="skeleton" style={{ height: 160 }} /> : apps.length === 0 ? (
        <div className="empty"><div className="ico">📨</div>还没有申请<div style={{ marginTop: 14 }}><button className="btn btn-primary" onClick={() => router.push('/outsourcing')}>去项目广场看看</button></div></div>
      ) : apps.map((a) => (
        <div className="panel" key={a.id}>
          <div className="card-row">
            <div style={{ fontWeight: 700 }}>{a.projectTitle}</div>
            <Pill status={a.status} label={APPLICATION_STATUS_LABEL[a.status]} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0' }}>报价 {a.quote || '—'} · 周期 {a.durationText || '—'}</div>
          {a.status === 'invited' && <div className="banner banner-info" style={{ marginBottom: 10 }}>发布方已邀请你合作，请在工作台确认接受。</div>}
          {a.status === 'accepted' && <div className="banner banner-success" style={{ marginBottom: 10 }}>已接受合作，等待发布方发起合作确认。</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => router.push(`/outsourcing/workspace/${a.id}`)}>前期沟通工作台</button>
            {a.status === 'invited' && <button className="btn btn-outline btn-sm" onClick={async () => { await api(`/api/outsourcing/applications/${a.id}/transition`, { method: 'POST', body: JSON.stringify({ event: 'accept' }) }); location.reload(); }}>接受邀请</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/outsourcing/projects/${a.projectId}`)}>查看项目</button>
          </div>
        </div>
      ))}
    </Shell>
  );
}
