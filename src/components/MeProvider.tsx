'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { api } from './client';

export interface Me { id: string; name: string; email: string; platformRole: string; accountType: string }

const MeCtx = createContext<{ me: Me | null; org: any; loading: boolean; reload: () => void }>({
  me: null, org: null, loading: true, reload: () => {},
});
export const useMe = () => useContext(MeCtx);

// 全局会话提供者：放在 root layout，确保 Shell 和所有页面共享同一份登录态。
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    api<{ user: Me | null; org: any }>('/api/auth/me')
      .then((d) => { setMe(d.user); setOrg(d.org); })
      .catch(() => { setMe(null); setOrg(null); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { reload(); }, []);

  return <MeCtx.Provider value={{ me, org, loading, reload }}>{children}</MeCtx.Provider>;
}
