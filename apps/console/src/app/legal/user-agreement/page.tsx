import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { LegalDocument } from "@/components/auth/legal-document";
import styles from "@/styles/login.module.css";

const sections = [
  {
    heading: "一、服务说明",
    body: [
      "企云 AI 为企业提供机器人配置、知识库管理、会话追踪和线索收集等 SaaS 服务。",
      "你需要基于真实、合法的企业场景使用本平台，不得用于违法违规内容生产、传播或自动化攻击。",
    ],
  },
  {
    heading: "二、账号与工作区",
    body: [
      "账号创建后，你对工作区内的配置、成员邀请和数据操作承担管理责任。",
      "请妥善保管登录凭证，不得向未授权第三方共享账号。",
    ],
  },
  {
    heading: "三、数据与合规",
    body: [
      "你上传的知识库、站点配置和线索数据归属于你的工作区，我们按平台能力提供存储、检索和处理服务。",
      "你应确保上传内容及采集数据具备合法来源，并遵守适用的隐私与数据保护要求。",
    ],
  },
];

export default function UserAgreementPage() {
  return (
    <section className={styles.shell} aria-label="企云 AI 用户协议">
      <LoginBrandPanel />
      <LegalDocument title="用户协议" updatedAt="2026-07-03" sections={sections} />
      <LoginFooter />
    </section>
  );
}
