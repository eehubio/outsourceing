'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import ProjectWizard from '@/components/ProjectWizard';
import { api } from '@/components/client';
export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ project: any }>(`/api/outsourcing/projects/${id}`).then((d) => {
      const p = d.project;
      setInitial({ id: p.id, title: p.title, projectType: p.projectType, industry: p.industry, budgetRange: p.budgetRange, durationText: p.durationText, skills: p.skills, tags: p.tags, location: p.location, visibility: p.visibility, needNda: p.needNda, prd: p.prd });
    }).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <Shell title="编辑项目"><div className="skeleton" style={{ height: 300 }} /></Shell>;
  if (!initial) return <Shell title="编辑项目"><div className="empty">项目不存在</div></Shell>;
  return <Shell title="编辑项目"><ProjectWizard mode="edit" initial={initial} /></Shell>;
}
