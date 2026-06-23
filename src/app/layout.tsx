import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'ezPLM · 项目外包智能体', description: '硬件研发项目外包：需求澄清、撮合与合作确认' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="zh-CN"><body>{children}</body></html>);
}
