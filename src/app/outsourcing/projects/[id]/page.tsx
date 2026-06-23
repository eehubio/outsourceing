'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Shell, Pill, PrdView, useMe } from '@/components/Shell';
import { api } from '@/components/client';
import { PROJECT_TYPES } from '@/lib/constants';

const typeLabel = (id: string) => PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [myApp, setMyApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    api<{ project: any }>(`/api/outsourcing/projects/${id}`).then((d) => setProject(d.project)).finally(() => setLoading(false));
    api<{ applications: any[] }>('/api/outsourcing/applications/mine').then((d) => {
      setMyApp(d.applications.find((a) => a.projectId === id) || null);
    }).catch(() => {});
  };
  useEffect(load, [id]);

  if (loading) return <Shell title="项目详情"><div className="skeleton" style={{ height: 300 }} /></Shell>;
  if (!project) return <Shell title="项目详情"><div className="empty">项目不存在</div></Shell>;

  const isOwner = me && project.creatorId === me.id;

  return (
    <Shell title="项目详情">
      <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ marginBottom: 16 }}>← 返回</button>

      <div className="panel">
        <div className="card-row">
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="tag tag-blue">{typeLabel(project.projectType)}</span>
              <Pill status={project.status} />
              {project.needNda && <span className="pill pill-nda">需 NDA</span>}
              {!project.fullAccess && <span className="tag">摘要视图</span>}
            </div>
            <div className="page-title">{project.title}</div>
          </div>
        </div>
        <div className="card-meta" style={{ borderTop: 'none', paddingTop: 12 }}>
          <span>💰 预算 {project.budgetRange}</span>
          <span>⏱️ 周期 {project.durationText || '待定'}</span>
          <span>📍 {project.location}</span>
          <span>👥 申请 {project.applicationCount ?? 0}</span>
          {project.industry && <span>🏭 {project.industry}</span>}
        </div>
        {project.currentVersion && (
          <div style={{ marginTop: 10, maxWidth: 280 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>需求完整度 {project.currentVersion.completeness}%</div>
            <div className="meter"><i style={{ width: `${project.currentVersion.completeness}%` }} /></div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">📋 需求规范{!project.fullAccess && <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>（完整内容需登录并申请后查看）</span>}</div>
        <PrdView prd={project.prd} />
      </div>

      {!me ? (
        <div className="banner banner-info">请在右上角选择演示身份后申请。</div>
      ) : isOwner ? (
        <div className="banner banner-info">这是你发布的项目。前往「我发布的」管理申请与合作确认。</div>
      ) : myApp ? (
        <div className="banner banner-success">
          你已申请该项目，当前状态：{myApp.status}。
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => router.push(`/outsourcing/workspace/${myApp.id}`)}>进入前期沟通工作台</button>
          </div>
        </div>
      ) : project.status !== 'published' ? (
        <div className="banner banner-warn">该项目当前不在招募中。</div>
      ) : !applying ? (
        <button className="btn btn-primary" onClick={() => setApplying(true)}>提交承接申请</button>
      ) : (
        <ApplyForm projectId={project.id} onCancel={() => setApplying(false)} onDone={(appId) => { setApplying(false); load(); router.push(`/outsourcing/workspace/${appId}`); }} setMsg={setMsg} />
      )}
      {msg && <div className="banner banner-warn" style={{ marginTop: 12 }}>{msg}</div>}
    </Shell>
  );
}

function ApplyForm({ projectId, onCancel, onDone, setMsg }: { projectId: string; onCancel: () => void; onDone: (id: string) => void; setMsg: (s: string) => void }) {
  const [f, setF] = useState<Record<string, any>>({
    realName: '', contact: '', identityType: '个人工程师', region: '', yearsExperience: '',
    relevantExperience: '', matchedSkills: '', familiarMcuEda: '', toolchain: '',
    understanding: '', approach: '', milestones: '', risks: '', questions: '', cases: '', excludes: '', availableFrom: '',
    canInvoice: false, supportsProduction: false, supportsOnsite: false,
  });
  const [quote, setQuote] = useState('');
  const [durationText, setDuration] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.realName.trim()) { setMsg('请填写姓名 / 团队名'); return; }
    if (!f.contact.trim()) { setMsg('请填写联系方式'); return; }
    if (!f.relevantExperience.trim() && !f.approach.trim()) { setMsg('请至少填写相关经验或初步方案'); return; }
    setBusy(true);
    try {
      const d = await api<{ application: any }>(`/api/outsourcing/projects/${projectId}/applications`, {
        method: 'POST', body: JSON.stringify({ proposal: f, quote, durationText }),
      });
      onDone(d.application.id);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="panel">
      <div className="panel-title">📝 承接申请</div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '4px 0 10px' }}>基本信息</div>
      <div className="row">
        <div className="field"><label>姓名 / 团队名 <span className="req">*</span></label><input className="input" value={f.realName} onChange={(e) => set('realName', e.target.value)} placeholder="张工 / 某某工作室" /></div>
        <div className="field"><label>联系方式 <span className="req">*</span></label><input className="input" value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder="手机 / 微信 / 邮箱" /></div>
      </div>
      <div className="row">
        <div className="field"><label>身份类型</label><select className="select" value={f.identityType} onChange={(e) => set('identityType', e.target.value)}>{['个人工程师', '设计工作室', '研发公司', '制造服务商', '高校团队'].map((o) => <option key={o}>{o}</option>)}</select></div>
        <div className="field"><label>所在地</label><input className="input" value={f.region} onChange={(e) => set('region', e.target.value)} placeholder="如：深圳" /></div>
      </div>
      <div className="row">
        <div className="field"><label>从业年限</label><input className="input" value={f.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} placeholder="如：5 年" /></div>
        <div className="field"><label>可开始时间</label><input className="input" value={f.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} placeholder="如：两周内" /></div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '14px 0 10px' }}>专业能力</div>
      <div className="field"><label>相关项目经验 <span className="req">*</span></label><textarea className="textarea" value={f.relevantExperience} onChange={(e) => set('relevantExperience', e.target.value)} placeholder="与本项目相关的过往项目与成果" /></div>
      <div className="row">
        <div className="field"><label>匹配技能</label><input className="input" value={f.matchedSkills} onChange={(e) => set('matchedSkills', e.target.value)} placeholder="PCB设计、I2S、嵌入式音频…" /></div>
        <div className="field"><label>熟悉的 MCU / FPGA</label><input className="input" value={f.familiarMcuEda} onChange={(e) => set('familiarMcuEda', e.target.value)} placeholder="ESP32-S3、STM32、Lattice…" /></div>
      </div>
      <div className="field"><label>工具链 / EDA</label><input className="input" value={f.toolchain} onChange={(e) => set('toolchain', e.target.value)} placeholder="KiCAD、Altium、SolidWorks…" /></div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '14px 0 10px' }}>方案与报价</div>
      <div className="field"><label>对需求的理解</label><textarea className="textarea" value={f.understanding} onChange={(e) => set('understanding', e.target.value)} /></div>
      <div className="field"><label>初步技术方案 <span className="req">*</span></label><textarea className="textarea" value={f.approach} onChange={(e) => set('approach', e.target.value)} /></div>
      <div className="field"><label>建议里程碑</label><textarea className="textarea" value={f.milestones} onChange={(e) => set('milestones', e.target.value)} /></div>
      <div className="row">
        <div className="field"><label>报价</label><input className="input" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="如：2.5万 / 面议" /></div>
        <div className="field"><label>预计周期</label><input className="input" value={durationText} onChange={(e) => setDuration(e.target.value)} placeholder="如：6周" /></div>
      </div>
      <div className="field"><label>报价不包含项</label><input className="input" value={f.excludes} onChange={(e) => set('excludes', e.target.value)} placeholder="如：不含量产、不含认证费用" /></div>
      <div className="field"><label>需甲方确认的问题</label><textarea className="textarea" value={f.questions} onChange={(e) => set('questions', e.target.value)} placeholder="需要发布方确认的问题…" /></div>
      <div className="field"><label>风险提示</label><textarea className="textarea" value={f.risks} onChange={(e) => set('risks', e.target.value)} /></div>
      <div className="field"><label>相关案例 / 作品链接</label><input className="input" value={f.cases} onChange={(e) => set('cases', e.target.value)} placeholder="GitHub / 作品集链接" /></div>

      <div className="field"><label>服务能力</label>
        <div className="checks">
          <label className="check"><input type="checkbox" checked={f.canInvoice} onChange={(e) => set('canInvoice', e.target.checked)} />可开发票</label>
          <label className="check"><input type="checkbox" checked={f.supportsProduction} onChange={(e) => set('supportsProduction', e.target.checked)} />支持小批量生产</label>
          <label className="check"><input type="checkbox" checked={f.supportsOnsite} onChange={(e) => set('supportsOnsite', e.target.checked)} />支持现场服务</label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? '提交中…' : '提交申请'}</button>
        <button className="btn btn-ghost" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
