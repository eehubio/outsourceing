'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/components/client';
import { PROJECT_TYPES, BUDGET_RANGES, VISIBILITY, computeFee } from '@/lib/constants';

const STEPS = ['基本信息', '项目背景与目标', '功能与性能', '接口与约束', '商务与交付', '可见性与确认'];
const DELIVERABLES = ['原理图', 'PCB Layout', 'Gerber', '完整 BOM', '固件源码', '可烧录文件', '引脚定义表', '生产文件', '测试报告', '使用说明', 'KiCAD 工程文件', '3D 模型'];

export interface WizardInitial {
  id?: string;
  title?: string; projectType?: string; industry?: string; budgetRange?: string; durationText?: string;
  skills?: string[]; tags?: string[]; location?: string; visibility?: string; needNda?: boolean;
  prd?: Record<string, any>;
}

export default function ProjectWizard({ initial, mode }: { initial?: WizardInitial; mode: 'new' | 'edit' }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(initial?.id || null);
  const [showPay, setShowPay] = useState(false);

  const [f, setF] = useState({
    title: initial?.title || '', projectType: initial?.projectType || 'hardware', industry: initial?.industry || '',
    budgetRange: initial?.budgetRange || '1-5万', durationText: initial?.durationText || '',
    skillsText: (initial?.skills || []).join(', '), tagsText: (initial?.tags || []).join(', '),
    location: initial?.location || '远程', visibility: initial?.visibility || 'summary_apply', needNda: initial?.needNda || false,
  });
  const [prd, setPrd] = useState<Record<string, any>>(initial?.prd || { deliverables: [] });

  // PDF AI 解析
  const [aiAvailable, setAiAvailable] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api<{ pdfParse: boolean }>('/api/outsourcing/ai-status').then((d) => setAiAvailable(d.pdfParse)).catch(() => setAiAvailable(false));
  }, []);

  const onPdf = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { setParseMsg('请上传 PDF 文件'); return; }
    setParsing(true); setParseMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/outsourcing/parse-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解析失败');
      // 回填：标题（若空）+ PRD 各字段（合并，不覆盖已填）
      if (data.title && !f.title) set('title', data.title);
      setPrd((prev) => {
        const merged: Record<string, any> = { ...prev };
        for (const [k, v] of Object.entries(data.prd || {})) {
          if (k === 'deliverables' && Array.isArray(v)) {
            merged.deliverables = Array.from(new Set([...(prev.deliverables || []), ...v]));
          } else if (typeof v === 'string' && v.trim() && !merged[k]) {
            merged[k] = v;
          }
        }
        return merged;
      });
      // 同步预算/周期/技能到基本信息（若 AI 抽到且当前为空）
      if (data.prd?.skills && !f.skillsText) set('skillsText', data.prd.skills);
      setParseMsg('✓ 已自动填充，请检查各步骤内容后再提交');
    } catch (e) { setParseMsg((e as Error).message); }
    finally { setParsing(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  const setP = (k: string, v: any) => setPrd((s) => ({ ...s, [k]: v }));
  const toggleDeliv = (d: string) => setPrd((s) => ({ ...s, deliverables: (s.deliverables || []).includes(d) ? s.deliverables.filter((x: string) => x !== d) : [...(s.deliverables || []), d] }));

  const fee = computeFee(f.budgetRange);

  const payload = () => ({
    title: f.title, projectType: f.projectType, industry: f.industry, budgetRange: f.budgetRange,
    durationText: f.durationText, location: f.location, visibility: f.visibility, needNda: f.needNda,
    skills: f.skillsText.split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean),
    tags: f.tagsText.split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean),
    prd: { ...prd, budget: f.budgetRange, duration: f.durationText },
  });

  const saveDraft = async () => {
    setBusy(true); setMsg('');
    try {
      if (createdId) { await api(`/api/outsourcing/projects/${createdId}`, { method: 'PATCH', body: JSON.stringify(payload()) }); }
      else { const d = await api<{ project: any }>('/api/outsourcing/projects', { method: 'POST', body: JSON.stringify(payload()) }); setCreatedId(d.project.id); }
      router.push('/outsourcing/projects');
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  const finish = async () => {
    if (!f.title.trim()) { setStep(0); setMsg('请填写项目标题'); return; }
    setBusy(true); setMsg('');
    try {
      let pid = createdId;
      if (pid) await api(`/api/outsourcing/projects/${pid}`, { method: 'PATCH', body: JSON.stringify(payload()) });
      else { const d = await api<{ project: any }>('/api/outsourcing/projects', { method: 'POST', body: JSON.stringify(payload()) }); pid = d.project.id; setCreatedId(pid); }
      setShowPay(true);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  const next = () => { if (step === 0 && !f.title.trim()) { setMsg('请填写项目标题'); return; } setMsg(''); setStep((s) => Math.min(STEPS.length - 1, s + 1)); };

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div className="page-title">{mode === 'edit' ? '编辑项目需求' : '发布外包项目'}</div>
        <div className="page-sub">按需求书结构逐步完善，支付发布费后由平台审核，通过即在广场展示。</div>
      </div>

      <div className="wsteps">
        {STEPS.map((s, i) => (
          <div key={s} className={'wstep' + (i === step ? ' active' : i < step ? ' done' : '')} onClick={() => i < step && setStep(i)} style={{ cursor: i < step ? 'pointer' : 'default' }}>
            <span className="n">{i < step ? '✓' : i + 1}</span>{s}
          </div>
        ))}
      </div>

      <div className="panel">
        {step === 0 && (<>
          {aiAvailable && (
            <div style={{ marginBottom: 18 }}>
              <div className={'dropzone' + (parsing ? ' busy' : '')} onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) onPdf(file); }}>
                <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) onPdf(file); }} />
                {parsing ? (
                  <div><div style={{ fontSize: 22, marginBottom: 6 }}>⏳</div>AI 正在解析 PDF，请稍候…</div>
                ) : (
                  <div>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>📄✨</div>
                    <div style={{ fontWeight: 600 }}>上传 PRD / 规范 PDF，AI 自动填充各字段</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>点击或拖入 PDF（≤15MB）。解析后请核对内容，可手动修改。</div>
                  </div>
                )}
              </div>
              {parseMsg && <div className={'banner ' + (parseMsg.startsWith('✓') ? 'banner-success' : 'banner-warn')} style={{ marginTop: 10 }}>{parseMsg}</div>}
            </div>
          )}
          <div className="field"><label>项目标题 <span className="req">*</span></label><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="如：基于 XIAO ESP32-S3 的双通道声音采集板" /></div>
          <div className="row">
            <div className="field"><label>项目类型</label><select className="select" value={f.projectType} onChange={(e) => set('projectType', e.target.value)}>{PROJECT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
            <div className="field"><label>行业</label><input className="input" value={f.industry} onChange={(e) => set('industry', e.target.value)} placeholder="消费电子、工业、医疗…" /></div>
          </div>
          <div className="row">
            <div className="field"><label>预算范围 <span className="hint">决定发布费 1%</span></label><select className="select" value={f.budgetRange} onChange={(e) => set('budgetRange', e.target.value)}>{BUDGET_RANGES.map((b) => <option key={b}>{b}</option>)}</select></div>
            <div className="field"><label>期望周期</label><input className="input" value={f.durationText} onChange={(e) => set('durationText', e.target.value)} placeholder="如：8周" /></div>
          </div>
          <div className="row">
            <div className="field"><label>所在地</label><input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} /></div>
            <div className="field"><label>所需技能 <span className="hint">逗号分隔</span></label><input className="input" value={f.skillsText} onChange={(e) => set('skillsText', e.target.value)} placeholder="KiCAD, I2S, ESP32" /></div>
          </div>
          <div className="field"><label>技术标签 <span className="hint">逗号分隔</span></label><input className="input" value={f.tagsText} onChange={(e) => set('tagsText', e.target.value)} placeholder="ESP32-S3, USB, WiFi" /></div>
        </>)}

        {step === 1 && (<>
          <div className="field"><label>项目背景 <span className="req">*</span></label><textarea className="textarea" value={prd.background || ''} onChange={(e) => setP('background', e.target.value)} placeholder="产品定位、面向人群、为何要做" /></div>
          <div className="field"><label>项目目标</label><textarea className="textarea" value={prd.goals || ''} onChange={(e) => setP('goals', e.target.value)} placeholder="本次外包要达成的核心目标" /></div>
          <div className="field"><label>应用场景</label><textarea className="textarea" value={prd.scenarios || ''} onChange={(e) => setP('scenarios', e.target.value)} /></div>
        </>)}

        {step === 2 && (<>
          <div className="field"><label>功能需求 <span className="req">*</span></label><textarea className="textarea" style={{ minHeight: 130 }} value={prd.functional || ''} onChange={(e) => setP('functional', e.target.value)} placeholder="逐条列出需要实现的功能" /></div>
          <div className="field"><label>性能指标</label><textarea className="textarea" value={prd.performance || ''} onChange={(e) => setP('performance', e.target.value)} placeholder="采样率、精度、功耗、吞吐等量化指标" /></div>
          <div className="field"><label>输入输出</label><textarea className="textarea" value={prd.io || ''} onChange={(e) => setP('io', e.target.value)} /></div>
        </>)}

        {step === 3 && (<>
          <div className="field"><label>接口要求</label><textarea className="textarea" value={prd.interfaces || ''} onChange={(e) => setP('interfaces', e.target.value)} placeholder="USB / I2S / I2C / 网络协议…" /></div>
          <div className="row">
            <div className="field"><label>尺寸限制</label><input className="input" value={prd.dimensions || ''} onChange={(e) => setP('dimensions', e.target.value)} /></div>
            <div className="field"><label>功耗要求</label><input className="input" value={prd.power || ''} onChange={(e) => setP('power', e.target.value)} /></div>
          </div>
          <div className="field"><label>环境条件</label><input className="input" value={prd.environment || ''} onChange={(e) => setP('environment', e.target.value)} placeholder="工作温度、防护等级…" /></div>
        </>)}

        {step === 4 && (<>
          <div className="row">
            <div className="field"><label>目标成本</label><input className="input" value={prd.costTarget || ''} onChange={(e) => setP('costTarget', e.target.value)} placeholder="如：BOM 8 RMB" /></div>
            <div className="field"><label>已有基础</label><input className="input" value={prd.existingBase || ''} onChange={(e) => setP('existingBase', e.target.value)} placeholder="已有原理图 / 参考设计…" /></div>
          </div>
          <div className="field"><label>承接方需完成的工作 <span className="req">*</span></label><textarea className="textarea" value={prd.contractorWork || ''} onChange={(e) => setP('contractorWork', e.target.value)} /></div>
          <div className="field"><label>不在项目范围内</label><textarea className="textarea" value={prd.outOfScope || ''} onChange={(e) => setP('outOfScope', e.target.value)} /></div>
          <div className="field"><label>交付物</label><div className="checks">{DELIVERABLES.map((d) => <label key={d} className="check"><input type="checkbox" checked={(prd.deliverables || []).includes(d)} onChange={() => toggleDeliv(d)} />{d}</label>)}</div></div>
          <div className="field"><label>验收建议</label><textarea className="textarea" value={prd.acceptance || ''} onChange={(e) => setP('acceptance', e.target.value)} /></div>
        </>)}

        {step === 5 && (<>
          <div className="row">
            <div className="field"><label>知识产权要求</label><input className="input" value={prd.ip || ''} onChange={(e) => setP('ip', e.target.value)} placeholder="源码归属、授权方式" /></div>
            <div className="field"><label>保密要求</label><input className="input" value={prd.confidentiality || ''} onChange={(e) => setP('confidentiality', e.target.value)} /></div>
          </div>
          <div className="field"><label>风险与不确定项</label><textarea className="textarea" value={prd.risks || ''} onChange={(e) => setP('risks', e.target.value)} /></div>
          <div className="row">
            <div className="field"><label>信息公开范围</label><select className="select" value={f.visibility} onChange={(e) => set('visibility', e.target.value)}>{Object.entries(VISIBILITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label>保密协议</label><label className="check" style={{ marginTop: 6 }}><input type="checkbox" checked={f.needNda} onChange={(e) => set('needNda', e.target.checked)} />该项目要求签署 NDA 后方可转入 ezPLM</label></div>
          </div>
          <div className="fee">
            <div className="fee-line"><span>预算服务费（{f.budgetRange} 估算 ¥{fee.budgetBase.toLocaleString()} × 1%）</span><span>¥{fee.pct.toLocaleString()}</span></div>
            <div className="fee-line"><span>一次性发布费</span><span>¥{fee.flat}</span></div>
            <div className="fee-total"><span>应付合计</span><span>¥{fee.total.toLocaleString()}</span></div>
          </div>
        </>)}
      </div>

      {msg && <div className="banner banner-warn">{msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => router.push('/outsourcing/projects')}>取消</button>
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>← 上一步</button>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" disabled={busy} onClick={saveDraft}>存为草稿</button>
          {step < STEPS.length - 1 ? <button className="btn btn-primary" onClick={next}>下一步 →</button> : <button className="btn btn-primary" disabled={busy} onClick={finish}>完成，去支付 →</button>}
        </div>
      </div>

      {showPay && createdId && <PayModal projectId={createdId} fee={fee} title={f.title} onClose={() => setShowPay(false)} onPaid={() => router.push('/outsourcing/projects')} />}
    </div>
  );
}

function PayModal({ projectId, fee, title, onClose, onPaid }: { projectId: string; fee: any; title: string; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState('wechat');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const methods = [{ id: 'wechat', i: '💚', l: '微信支付' }, { id: 'alipay', i: '💙', l: '支付宝' }, { id: 'card', i: '💳', l: 'Credit Card' }, { id: 'paypal', i: '🅿️', l: 'PayPal' }];

  const pay = async () => {
    setBusy(true);
    try {
      await api(`/api/outsourcing/projects/${projectId}/pay`, { method: 'POST', body: JSON.stringify({ method }) });
      await api(`/api/outsourcing/projects/${projectId}/submit`, { method: 'POST' });
      onPaid();
    } catch (e) { setMsg((e as Error).message); setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ maxWidth: 460, width: '100%', margin: 0 }}>
        <div className="panel-title">发布费用结算</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{title}</div>
        <div className="fee">
          <div className="fee-line"><span>预算服务费 ¥{fee.budgetBase.toLocaleString()} × 1%</span><span>¥{fee.pct.toLocaleString()}</span></div>
          <div className="fee-line"><span>一次性发布费</span><span>¥{fee.flat}</span></div>
          <div className="fee-total"><span>应付合计</span><span>¥{fee.total.toLocaleString()}</span></div>
        </div>
        <div className="pays">{methods.map((m) => <div key={m.id} className={'pay' + (method === m.id ? ' sel' : '')} onClick={() => setMethod(m.id)}><span className="i">{m.i}</span>{m.l}</div>)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', padding: 11, borderRadius: 8, marginBottom: 14 }}>演示为模拟支付，不产生真实扣款。支付后自动提交平台审核。</div>
        {msg && <div className="banner banner-warn">{msg}</div>}
        <button className="btn btn-primary btn-block" disabled={busy} onClick={pay}>{busy ? '处理中…' : `确认支付 ¥${fee.total.toLocaleString()}`}</button>
      </div>
    </div>
  );
}
