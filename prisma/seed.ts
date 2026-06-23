// Prisma 生产 seed：与 memory 适配器的演示数据一致。
// 运行：DATA_BACKEND=prisma npm run db:seed
import { PrismaClient } from '@prisma/client';
import { computeFee } from '../src/lib/constants';

const prisma = new PrismaClient();
const toJson = (v: unknown) => JSON.stringify(v ?? null);

async function main() {
  console.log('Seeding 演示数据…');

  const users = [
    { id: 'u_pub1', email: 'pub@seeed.demo', name: '杨阳', platformRole: 'USER', accountType: 'publisher' },
    { id: 'u_pub2', email: 'lab@uni.demo', name: '李工（高校实验室）', platformRole: 'USER', accountType: 'publisher' },
    { id: 'u_prov1', email: 'eng1@demo', name: '蒋吴琦', platformRole: 'USER', accountType: 'provider' },
    { id: 'u_prov2', email: 'studio@demo', name: 'cly（设计工作室）', platformRole: 'USER', accountType: 'provider' },
    { id: 'u_rev', email: 'reviewer@ezplm.demo', name: '平台审核员', platformRole: 'REVIEWER', accountType: 'platform' },
    { id: 'u_admin', email: 'admin@ezplm.demo', name: '平台管理员', platformRole: 'ADMIN', accountType: 'platform' },
  ];
  for (const u of users) await prisma.user.upsert({ where: { id: u.id }, create: { ...u, isDemo: true }, update: {} });

  const orgs = [
    { id: 'org_seeed', name: 'Seeed Studio 研发中心', type: 'company' },
    { id: 'org_lab', name: '某高校电子实验室', type: 'lab' },
    { id: 'org_studio', name: 'cly 设计工作室', type: 'studio' },
  ];
  for (const o of orgs) await prisma.organization.upsert({ where: { id: o.id }, create: { ...o, isDemo: true }, update: {} });

  const members = [
    { orgId: 'org_seeed', userId: 'u_pub1', role: 'OWNER' },
    { orgId: 'org_lab', userId: 'u_pub2', role: 'OWNER' },
    { orgId: 'org_studio', userId: 'u_prov2', role: 'OWNER' },
  ];
  for (const m of members) await prisma.organizationMember.upsert({ where: { orgId_userId: { orgId: m.orgId, userId: m.userId } }, create: m, update: {} });

  await prisma.providerProfile.upsert({
    where: { userId: 'u_prov1' }, update: {},
    create: { userId: 'u_prov1', displayName: '蒋吴琦', providerType: 'individual', region: '深圳',
      languages: toJson(['中文', 'English']), skills: toJson(['PCB设计', '嵌入式音频', 'I2S', 'KiCAD']), tools: toJson(['KiCAD', 'Altium']),
      bio: '5 年硬件工程师（演示档案）。', isDemo: true },
  });

  const audioPrd = {
    background: '面向创客、AIoT、教育的开源音频播放器开发板，主控 XIAO ESP32-S3 Plus。',
    goals: '本地音频播放、扬声器外放、3.5mm 耳机、电池供电、按键控制，预留 B2B 扩展。',
    functional: 'MAX98357A I2S 功放；PCM5102A DAC + 3.5mm；microSD；3 按键。',
    performance: '电池供电 8Ω/1W 扬声器；WAV 稳定播放。', interfaces: 'I2S、I2C、microSD SPI、3.5mm。',
    costTarget: '8 RMB', budget: '1-5万', duration: '2个月',
    contractorWork: '原理图、PCB、BOM、生产文件、基础驱动与出货固件。',
    deliverables: ['KiCAD 工程文件', '引脚定义表', '固件源码', '完整 BOM', '测试 Demo'],
    acceptance: 'Speaker/Headphone 出声、SD 播放、三按键、出货固件通过。', skills: 'PCB、嵌入式音频、I2S、KiCAD',
  };
  const audio = await prisma.outsourcingProject.upsert({
    where: { id: 'proj_xiao_audio' }, update: {},
    create: { id: 'proj_xiao_audio', orgId: 'org_seeed', creatorId: 'u_pub1',
      title: '基于 XIAO ESP32-S3 Plus 的开源音频播放器开发板', projectType: 'hardware', industry: '消费电子',
      budgetRange: '1-5万', durationText: '2个月', skills: toJson(['PCB设计', '嵌入式音频', 'I2S']), tags: toJson(['ESP32-S3', 'I2S']),
      location: '深圳', visibility: 'summary_apply', needNda: true, status: 'published', feeTotal: computeFee('1-5万').total,
      paid: true, payOrderNo: 'PAYDEMO0001', isDemo: true },
  });
  await prisma.projectVersion.upsert({
    where: { projectId_versionNo: { projectId: audio.id, versionNo: 1 } }, update: {},
    create: { projectId: audio.id, versionNo: 1, requirement: toJson(audioPrd), completeness: 80, createdById: 'u_pub1' },
  });

  console.log('Seed 完成。演示账号：u_pub1(发布方) u_prov1(服务方) u_rev(审核员) u_admin(管理员)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
