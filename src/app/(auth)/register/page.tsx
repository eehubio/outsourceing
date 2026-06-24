'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/components/client';

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'provider' | 'publisher'>('provider');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, accountType }) });
      window.location.href = '/outsourcing';
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand"><div className="brand-logo">eP</div><div><div style={{ fontWeight: 700 }}>注册账号</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>加入硬件研发外包平台</div></div></div>

        <div className="field">
          <label>我是</label>
          <div className="acct-types">
            <div className={'acct-type' + (accountType === 'provider' ? ' sel' : '')} onClick={() => setAccountType('provider')}>
              <div style={{ fontSize: 22 }}>🛠️</div>
              <div style={{ fontWeight: 600 }}>服务方</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>工程师 / 工作室 / 研发公司，承接外包</div>
            </div>
            <div className={'acct-type' + (accountType === 'publisher' ? ' sel' : '')} onClick={() => setAccountType('publisher')}>
              <div style={{ fontSize: 22 }}>🏢</div>
              <div style={{ fontWeight: 600 }}>发布方（甲方）</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>企业 / 实验室 / 团队，发布需求</div>
            </div>
          </div>
        </div>

        <div className="field"><label>{accountType === 'provider' ? '姓名 / 团队名' : '联系人 / 组织名'}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：张工 / 某某工作室" /></div>
        <div className="field"><label>邮箱</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className="field"><label>密码 <span className="hint">至少 6 位</span></label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••" /></div>
        {err && <div className="banner banner-warn">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy} onClick={submit}>{busy ? '注册中…' : '注册并进入'}</button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
          已有账号？<a style={{ color: 'var(--primary)' }} onClick={() => router.push('/login')}>去登录</a>
        </div>
      </div>
    </div>
  );
}
