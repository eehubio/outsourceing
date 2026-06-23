'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Shell, useMe, Toast } from '@/components/Shell';
import { api, COOP_STATUS_LABEL } from '@/components/client';

export default function CooperationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useMe();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };
  const load = async () => {
    try { const d = await api(`/api/outsourcing/cooperations/${id}`); setData(d); }
    catch (e) { flash((e as Error).message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const call = async (path: string, okMsg: string) => {
    setBusy(true);
    try { await api(path, { method: 'POST' }); flash(okMsg); load(); }
    catch (e) { flash((e as Error).message); } finally { setBusy(false); }
  };
  const transfer = async () => {
    setBusy(true);
    try { const r = await api<{ link: any; alreadyDone: boolean }>(`/api/outsourcing/cooperations/${id}/transfer`, { method: 'POST' }); flash(r.alreadyDone ? '已转入（幂等）' : '已成功转入 ezPLM'); load(); }
    catch (e) { flash((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <Shell title="合作确认"><div className="skeleton" style={{ height: 300 }} /></Shell>;
  if (!data) return <Shell title="合作确认"><div className="empty">无法访问</div></Shell>;

  const c = data.cooperation;
  const summary = c.summary || {};
  const role = data.myRole;
  const pubDone = !!c.publisherConfirmedAt;
  const provDone = !!c.providerConfirmedAt;
  const link = data.ezplmLink;

  return (
    <Shell title="合作确认">
      <Toast msg={toast} />
      <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ marginBottom: 14 }}>← 返回</button>
      <div className="page-head">
        <div className="page-title">合作意向确认</div>
        <div className="page-sub">{data.project?.title} · 当前状态：{COOP_STATUS_LABEL[c.status] || c.status}</div>
      </div>

      {c.status === 'transferred' && link?.link && (
        <div className="banner banner-ez">
          <div style={{ fontWeight: 700, fontSize: 15 }}>🎉 项目已正式进入 ezPLM</div>
          <div style={{ fontSize: 13, opacity: .95, marginTop: 4 }}>后续任务、文件、BOM、里程碑与交付将在项目组织空间中管理。ezPLM 项目号：{link.ezplmProjectId}</div>
          <a href={link.link} target="_blank" rel="noreferrer">进入 ezPLM 项目空间 →</a>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">📑 合作摘要</div>
        <div className="kv"><span className="k">项目范围</span><span>{summary.scope || '—'}</span></div>
        <div className="kv"><span className="k">不含事项</span><span>{summary.outOfScope || '—'}</span></div>
        <div className="kv"><span className="k">交付物</span><span>{Array.isArray(summary.deliverables) ? summary.deliverables.join('、') : '—'}</span></div>
        <div className="kv"><span className="k">预算</span><span>{summary.budget || '—'}</span></div>
        <div className="kv"><span className="k">周期</span><span>{summary.duration || '—'}</span></div>
        <div className="kv"><span className="k">知识产权</span><span>{summary.ip || '—'}</span></div>
        <div className="kv"><span className="k">保密要求</span><span>{summary.confidentiality || '—'}</span></div>
      </div>

      <div className="panel">
        <div className="panel-title">✅ 待确认事项</div>
        {data.items?.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>无</div> : data.items.map((it: any) => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.label}</div><div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{it.value || '—'}</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={'pill ' + (it.status === 'both_confirmed' ? 'pill-accepted' : 'pill-submitted')}>{it.status === 'both_confirmed' ? '双方确认' : it.status === 'publisher_confirmed' ? '发布方已确认' : it.status === 'provider_confirmed' ? '服务方已确认' : '待确认'}</span>
              {(role === 'publisher' || role === 'provider') && it.status !== 'both_confirmed' && c.status !== 'transferred' && c.status !== 'cancelled' && (
                (role === 'publisher' ? it.status !== 'publisher_confirmed' : it.status !== 'provider_confirmed') && (
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => {
                    try { await api(`/api/outsourcing/cooperations/${id}/items`, { method: 'POST', body: JSON.stringify({ itemId: it.id }) }); flash('已确认该项'); load(); }
                    catch (e) { flash((e as Error).message); }
                  }}>确认此项</button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">🤝 双方确认</div>
        <div className="banner banner-info" style={{ fontSize: 12.5 }}>需先逐项确认上方所有"待确认事项"（双方均确认），才能完成"确认合作"。</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="banner" style={{ flex: 1, minWidth: 200, marginBottom: 0, background: pubDone ? 'var(--green-bg)' : 'var(--bg)', color: pubDone ? 'var(--green)' : 'var(--text-muted)' }}>发布方：{pubDone ? '已确认 ✓' : '待确认'}</div>
          <div className="banner" style={{ flex: 1, minWidth: 200, marginBottom: 0, background: provDone ? 'var(--green-bg)' : 'var(--bg)', color: provDone ? 'var(--green)' : 'var(--text-muted)' }}>服务方：{provDone ? '已确认 ✓' : '待确认'}</div>
        </div>

        {(role === 'publisher' || role === 'provider') && c.status !== 'both_confirmed' && c.status !== 'transferred' && c.status !== 'cancelled' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" disabled={busy || (role === 'publisher' ? pubDone : provDone)} onClick={() => call(`/api/outsourcing/cooperations/${id}/confirm`, '已确认')}>
              {role === 'publisher' ? '发布方确认合作' : '服务方确认合作'}
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => call(`/api/outsourcing/cooperations/${id}/cancel`, '已取消，项目退回招募')}>取消合作</button>
          </div>
        )}

        {c.status === 'both_confirmed' && (
          <div>
            {c.ndaRequired && (
              <div className="banner" style={{ background: c.ndaSignedAt ? 'var(--green-bg)' : 'var(--amber-bg)', color: c.ndaSignedAt ? 'var(--green)' : 'var(--amber)' }}>
                <div>NDA：{c.ndaSignedAt ? `双方已确认（${c.ndaVersion}）` : '本项目要求双方分别确认 NDA 后方可转入 ezPLM'}</div>
                {!c.ndaSignedAt && (
                  <div style={{ fontSize: 12.5, marginTop: 6 }}>
                    发布方：{c.ndaPublisherSignedAt ? '已确认 ✓' : '待确认'} · 服务方：{c.ndaProviderSignedAt ? '已确认 ✓' : '待确认'}
                  </div>
                )}
                {!c.ndaSignedAt && (role === 'publisher' || role === 'provider') && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-outline btn-sm"
                      disabled={busy || (role === 'publisher' ? !!c.ndaPublisherSignedAt : !!c.ndaProviderSignedAt)}
                      onClick={() => call(`/api/outsourcing/cooperations/${id}/nda`, 'NDA 已确认')}>
                      {role === 'publisher' ? '发布方确认已签署 NDA' : '服务方确认已签署 NDA'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {role === 'publisher' ? (
              <button className="btn btn-primary" disabled={busy || (c.ndaRequired && !c.ndaSignedAt)} onClick={transfer}>创建 ezPLM 项目并移交 →</button>
            ) : (
              <div className="banner banner-info" style={{ marginBottom: 0 }}>双方已确认，等待发布方创建 ezPLM 项目。</div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
