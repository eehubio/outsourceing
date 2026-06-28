'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, PROJECT_STATUS_LABEL } from './client';
import { useMe, type Me } from './MeProvider';

export { useMe, type Me } from './MeProvider';
interface DemoUser { id: string; name: string; platformRole: string }

export function Pill({ status, label }: { status: string; label?: string }) {
  return <span className={'pill pill-' + status}>{label ?? PROJECT_STATUS_LABEL[status] ?? status}</span>;
}

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

// 未登录时的友好提示（替代直接抛错）
export function LoginPrompt({ note }: { note?: string }) {
  return (
    <div className="empty">
      <div className="ico">🔑</div>
      {note || '请先在右上角“演示身份”中选择一个身份'}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>选择后即可查看此页内容。</div>
    </div>
  );
}

// show 规则：
//   platform（审核员/管理员）：仅 项目广场 + 审核台
//   publisher（发布方）：项目广场 + 我发布的 + 发布项目
//   provider（服务方）：项目广场 + 我的申请
//   未登录：仅 项目广场
const NAV = [
  { group: '外包', items: [
    { href: '/outsourcing', label: '项目广场', icon: '🔍', show: (_role: string, _acct: string) => true },
    { href: '/outsourcing/projects', label: '我发布的', icon: '📥', show: (_r: string, acct: string) => acct === 'publisher' },
    { href: '/outsourcing/projects/new', label: '发布项目', icon: '＋', show: (_r: string, acct: string) => acct === 'publisher' },
    { href: '/outsourcing/applications', label: '我的申请', icon: '📨', show: (_r: string, acct: string) => acct === 'provider' },
    { href: '/outsourcing/review', label: '审核台', icon: '📝', show: (role: string) => role === 'REVIEWER' || role === 'ADMIN' },
  ] },
];

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { me, reload } = useMe();
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api<{ users: DemoUser[] }>('/api/auth/demo-users').then((d) => setDemoUsers(d.users)).catch(() => {});
  }, []);

  const switchUser = async (userId: string) => {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ userId }) });
    reload();
    router.refresh();
  };

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    reload();
    router.push('/outsourcing');
    router.refresh();
  };

  // 真实账号（非演示）显示账号信息 + 退出；演示/未登录显示演示切换器 + 登录入口
  const isReal = me && !demoUsers.some((u) => u.id === me.id);

  return (
    <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-logo">eP</div>
            <div>
              <div className="brand-name">ezPLM 外包</div>
              <div className="brand-sub">项目外包智能体</div>
            </div>
          </div>
          {NAV.map((g) => (
            <div className="nav-group" key={g.group}>
              <div className="nav-group-title">{g.group}</div>
              {g.items.filter((it) => it.show(me?.platformRole ?? '', me?.accountType ?? '')).map((it) => (
                <button key={it.href}
                  className={'nav-item' + (pathname === it.href ? ' active' : '')}
                  onClick={() => router.push(it.href)}>
                  <span>{it.icon}</span>{it.label}
                </button>
              ))}
            </div>
          ))}
          <div className="nav-group">
            <div className="nav-group-title">说明</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 8px', lineHeight: 1.6 }}>
              正式立项前的需求澄清、申请筛选、对接与合作确认在此完成；确认合作后项目转入 ezPLM 组织空间执行。
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-title">💼 {title}</div>
            {isReal ? (
              <div className="idsel">
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{me!.name}</span>
                <span className="tag">{me!.accountType === 'publisher' ? '发布方' : me!.accountType === 'platform' ? '平台' : '服务方'}</span>
                <button className="btn btn-ghost btn-sm" onClick={logout}>退出</button>
              </div>
            ) : (
              <div className="idsel">
                <span>演示身份</span>
                <select value={me?.id || ''} onChange={(e) => switchUser(e.target.value)}>
                  {!me && <option value="">未登录</option>}
                  {demoUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}{u.platformRole !== 'USER' ? `（${u.platformRole === 'REVIEWER' ? '审核员' : '管理员'}）` : ''}</option>
                  ))}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/login')}>登录/注册</button>
              </div>
            )}
          </header>
          <div className="content">{children}</div>
        </div>
      </div>
  );
}

const PRD_SECTIONS: { key: string; label: string }[] = [
  { key: 'background', label: '项目背景' },
  { key: 'goals', label: '项目目标' },
  { key: 'scenarios', label: '应用场景' },
  { key: 'scope', label: '项目范围' },
  { key: 'functional', label: '功能需求' },
  { key: 'performance', label: '性能指标' },
  { key: 'io', label: '输入输出' },
  { key: 'interfaces', label: '接口要求' },
  { key: 'environment', label: '环境条件' },
  { key: 'dimensions', label: '尺寸限制' },
  { key: 'power', label: '功耗要求' },
  { key: 'costTarget', label: '目标成本' },
  { key: 'contractorWork', label: '承接方需完成' },
  { key: 'outOfScope', label: '不在范围内' },
  { key: 'acceptance', label: '验收建议' },
  { key: 'ip', label: '知识产权' },
  { key: 'confidentiality', label: '保密要求' },
  { key: 'risks', label: '风险与不确定项' },
];

export function PrdView({ prd }: { prd: Record<string, any> }) {
  if (!prd) return null;
  return (
    <div>
      {PRD_SECTIONS.map((s) => prd[s.key] ? (
        <div className="prd-block" key={s.key}>
          <h4>{s.label}</h4>
          <div className="content">{prd[s.key]}</div>
        </div>
      ) : null)}
      {Array.isArray(prd.deliverables) && prd.deliverables.length > 0 && (
        <div className="prd-block">
          <h4>交付物</h4>
          <div className="tags">{prd.deliverables.map((d: string) => <span key={d} className="tag tag-blue">{d}</span>)}</div>
        </div>
      )}
    </div>
  );
}
