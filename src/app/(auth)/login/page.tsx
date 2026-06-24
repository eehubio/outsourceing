'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/components/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      // 用整页跳转，确保带上新会话 cookie 重新加载登录态
      window.location.href = '/outsourcing';
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand"><div className="brand-logo">eP</div><div><div style={{ fontWeight: 700 }}>ezPLM 外包</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>登录到项目外包智能体</div></div></div>
        <div className="field"><label>邮箱</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="you@example.com" /></div>
        <div className="field"><label>密码</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••" /></div>
        {err && <div className="banner banner-warn">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy} onClick={submit}>{busy ? '登录中…' : '登录'}</button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
          还没有账号？<a style={{ color: 'var(--primary)' }} onClick={() => router.push('/register')}>立即注册</a>
        </div>
        <div className="divider" />
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
          想先体验？<a style={{ color: 'var(--primary)' }} onClick={() => router.push('/outsourcing')}>用演示身份进入</a>
        </div>
      </div>
    </div>
  );
}
