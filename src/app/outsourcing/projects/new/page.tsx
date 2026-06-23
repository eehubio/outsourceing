'use client';
import { Shell } from '@/components/Shell';
import ProjectWizard from '@/components/ProjectWizard';
export default function NewProjectPage() {
  return <Shell title="发布项目"><ProjectWizard mode="new" /></Shell>;
}
