'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell, Pill, useMe } from '@/components/Shell';
import { api, PROJECT_STATUS_LABEL } from '@/components/client';
import { PROJECT_TYPES } from '@/lib/constants';

const typeLabel = (id: string) => PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;

export default function PlazaPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const router = useRouter();

  useEffect(() => {
    api<{ projects: any[] }>('/api/outsourcing/projects?scope=plaza')
      .then((d) => setProjects(d.projects)).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => {
    if (type && p.projectType !== type) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.title + (p.skills || []).join('') + (p.tags || []).join('') + (p.prd?.background || '')).toLowerCase().includes(s);
  });

  return (
    <Shell title="项目广场">
      <div className="page-head">
        <div className="page-title">外包项目广场</div>
        <div className="page-sub">浏览经平台审核的研发外包需求，提交承接申请并与发布方前期对接。</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 360 }} placeholder="🔍 搜索项目、技术方向、技能…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" style={{ maxWidth: 200 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">全部类型</option>
          {PROJECT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid">{[0, 1, 2].map((i) => <div key={i} className="card"><div className="card-body"><div className="skeleton" style={{ height: 120 }} /></div></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="ico">📭</div>没有符合条件的项目</div>
      ) : (
        <div className="grid">
          {filtered.map((p) => (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => router.push(`/outsourcing/projects/${p.id}`)}>
              <div className="card-body">
                <div className="card-row">
                  <span className="tag tag-blue">{typeLabel(p.projectType)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.needNda && <span className="pill pill-nda">需 NDA</span>}
                    <Pill status={p.status} />
                  </div>
                </div>
                <div className="card-title">{p.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', minHeight: 38 }}>{p.prd?.background || p.prd?.goals || '（摘要在登录/申请后可见）'}</div>
                <div className="tags">{(p.skills || []).slice(0, 4).map((s: string) => <span key={s} className="tag">{s}</span>)}</div>
                <div className="card-meta">
                  <span>💰 {p.budgetRange}</span>
                  <span>⏱️ {p.durationText || '待定'}</span>
                  <span>📍 {p.location}</span>
                  <span>👥 申请 {p.applicationCount ?? 0}</span>
                </div>
                {p.currentVersion && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>需求完整度 {p.currentVersion.completeness}%</div>
                    <div className="meter"><i style={{ width: `${p.currentVersion.completeness}%` }} /></div>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <button className="btn btn-primary btn-block" onClick={(e) => { e.stopPropagation(); router.push(`/outsourcing/projects/${p.id}`); }}>查看详情</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
