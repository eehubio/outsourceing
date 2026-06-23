'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Shell, Pill, Toast } from '@/components/Shell';
import { api, APPLICATION_STATUS_LABEL } from '@/components/client';

export default function ProjectApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [compare, setCompare] = useState(false);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const load = async () => {
    const [p, a] = await Promise.all([
      api<{ project: any }>(`/api/outsourcing/projects/${id}`),
      api<{ applications: any[] }>(`/api/outsourcing/projects/${id}/applications`).catch(() => ({ applications: [] })),
    ]);
    setProject(p.project); setApps(a.applications); setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const act = async (appId: string, event: string) => {
    try { await api(`/api/outsourcing/applications/${appId}/transition`, { method: 'POST', body: JSON.stringify({ event }) }); flash('操作成功'); load(); }
    catch (e) { flash((e as Error).message); }
  };
  const toggleSelect = async (appId: string, selected: boolean) => {
    try { await api(`/api/outsourcing/applications/${appId}/select`, { method: 'POST', body: JSON.stringify({ selected }) }); flash(selected ? '已选为合适人选' : '已取消选择'); load(); }
    catch (e) { flash((e as Error).message); }
  };
  const startCoop = async (appId: string) => {
    try {
      const d = await api<{ cooperation: any }>('/api/outsourcing/cooperations', { method: 'POST', body: JSON.stringify({ projectId: id, applicationId: appId }) });
      router.push(`/outsourcing/cooperations/${d.cooperation.id}`);
    } catch (e) { flash((e as Error).message); }
  };

  if (loading) return <Shell title="管理申请"><div className="skeleton" style={{ height: 240 }} /></Shell>;

  return (
    <Shell title="管理申请">
      <Toast msg={toast} />
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/outsourcing/projects')} style={{ marginBottom: 14 }}>← 返回我发布的</button>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="page-title">{project.title}</div>
          <div className="page-sub">{project.applicationCount ?? apps.length} 份申请{apps.filter((a) => a.selected).length > 0 ? ` · 已选 ${apps.filter((a) => a.selected).length} 位合适人选` : ''} · 状态 <Pill status={project.status} /></div>
        </div>
        {apps.length > 1 && <button className="btn btn-outline btn-sm" onClick={() => setCompare((v) => !v)}>{compare ? '列表视图' : '横向比较候选'}</button>}
      </div>

      {apps.length === 0 ? <div className="empty"><div className="ico">📭</div>暂无申请</div> :
        compare ? <CompareTable apps={apps} /> : (
        apps.map((a) => (
          <div className={'panel' + (a.selected ? ' app-card-selected' : '')} key={a.id}>
            <div className="card-row" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>
                {a.applicantName} <span className="pill" style={{ marginLeft: 6 }}><Pill status={a.status} label={APPLICATION_STATUS_LABEL[a.status]} /></span>
                {a.selected && <span className="sel-badge" style={{ marginLeft: 8 }}>★ 合适人选</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{a.quote || '报价面议'} · {a.durationText || '周期待定'}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
              {a.proposal?.contact && <div className="kv"><span className="k">联系方式</span><span>{a.proposal.contact}</span></div>}
              {(a.proposal?.identityType || a.proposal?.region) && <div className="kv"><span className="k">身份/地区</span><span>{[a.proposal?.identityType, a.proposal?.region, a.proposal?.yearsExperience].filter(Boolean).join(' · ')}</span></div>}
              {a.proposal?.matchedSkills && <div className="kv"><span className="k">匹配技能</span><span>{a.proposal.matchedSkills}</span></div>}
              {a.proposal?.familiarMcuEda && <div className="kv"><span className="k">熟悉 MCU</span><span>{a.proposal.familiarMcuEda}</span></div>}
              {a.proposal?.relevantExperience && <div className="kv"><span className="k">相关经验</span><span>{a.proposal.relevantExperience}</span></div>}
              {a.proposal?.approach && <div className="kv"><span className="k">技术方案</span><span>{a.proposal.approach}</span></div>}
              {a.proposal?.milestones && <div className="kv"><span className="k">里程碑</span><span>{a.proposal.milestones}</span></div>}
              {a.proposal?.questions && <div className="kv"><span className="k">待确认</span><span>{a.proposal.questions}</span></div>}
              {(a.proposal?.canInvoice || a.proposal?.supportsProduction || a.proposal?.supportsOnsite) && (
                <div className="kv"><span className="k">服务能力</span><span>{[a.proposal?.canInvoice && '可开票', a.proposal?.supportsProduction && '支持生产', a.proposal?.supportsOnsite && '支持现场'].filter(Boolean).join(' · ')}</span></div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className={'btn btn-sm ' + (a.selected ? 'btn-primary' : 'btn-outline')} onClick={() => toggleSelect(a.id, !a.selected)}>{a.selected ? '★ 已选 (点击取消)' : '☆ 选为合适人选'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/outsourcing/workspace/${a.id}`)}>前期沟通工作台</button>
              {['submitted', 'under_discussion'].includes(a.status) && <button className="btn btn-outline btn-sm" onClick={() => act(a.id, 'shortlist')}>加入候选</button>}
              {a.status === 'shortlisted' && <button className="btn btn-primary btn-sm" onClick={() => act(a.id, 'invite')}>邀请合作</button>}
              {!['rejected', 'withdrawn', 'accepted'].includes(a.status) && <button className="btn btn-danger btn-sm" onClick={() => act(a.id, 'reject')}>拒绝</button>}
              {a.status === 'accepted' && <button className="btn btn-primary btn-sm" onClick={() => startCoop(a.id)}>发起合作确认 →</button>}
            </div>
            {a.status === 'invited' && <div className="banner banner-info" style={{ marginTop: 10, marginBottom: 0 }}>已邀请，等待服务方接受。</div>}
          </div>
        ))
      )}
    </Shell>
  );
}

function CompareTable({ apps }: { apps: any[] }) {
  const rows: { k: string; get: (a: any) => string }[] = [
    { k: '报价', get: (a) => a.quote || '—' },
    { k: '周期', get: (a) => a.durationText || '—' },
    { k: '相关经验', get: (a) => a.proposal?.relevantExperience || '—' },
    { k: '技术方案', get: (a) => a.proposal?.approach || '—' },
    { k: '里程碑', get: (a) => a.proposal?.milestones || '—' },
    { k: '风险', get: (a) => a.proposal?.risks || '—' },
    { k: '状态', get: (a) => APPLICATION_STATUS_LABEL[a.status] || a.status },
  ];
  return (
    <div className="panel" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr><th style={{ textAlign: 'left', padding: 8, color: 'var(--text-muted)' }}>维度</th>{apps.map((a) => <th key={a.id} style={{ textAlign: 'left', padding: 8 }}>{a.applicantName}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.k} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{r.k}</td>
            {apps.map((a) => <td key={a.id} style={{ padding: 8, verticalAlign: 'top' }}>{r.get(a)}</td>)}
          </tr>
        ))}</tbody>
      </table>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>横向比较为人工决策辅助；后续可接入 AI 方案分析（解释匹配理由、不替代决策）。</div>
    </div>
  );
}
