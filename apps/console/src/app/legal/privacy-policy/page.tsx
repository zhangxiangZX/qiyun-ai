import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { LegalDocument } from "@/components/auth/legal-document";
import styles from "@/styles/login.module.css";

const sections = [
  {
    heading: "一、我们收集的信息",
    body: [
      "我们会收集你注册时提交的邮箱、姓名、工作区信息，以及你在平台内创建的机器人、知识库、会话和线索数据。",
      "当你启用站点挂件时，我们还会处理访客会话中提交的业务字段，用于客服与销售跟进。",
    ],
  },
  {
    heading: "二、信息使用方式",
    body: [
      "这些信息主要用于身份认证、工作区隔离、功能交付、检索增强和运维诊断。",
      "未经你的授权，我们不会将工作区业务数据用于与你无关的公开传播用途。",
    ],
  },
  {
    heading: "三、你的控制权",
    body: [
      "你可以通过控制台更新成员权限、轮换站点密钥，并删除或停用相关资源。",
      "如需进一步的数据导出、删除或合规支持，可联系平台运营方处理。",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <section className={styles.shell} aria-label="企云 AI 隐私政策">
      <LoginBrandPanel />
      <LegalDocument title="隐私政策" updatedAt="2026-07-03" sections={sections} />
      <LoginFooter />
    </section>
  );
}
