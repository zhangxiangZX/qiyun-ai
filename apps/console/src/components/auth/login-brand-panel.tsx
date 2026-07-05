import Image from "next/image";

import { loginIcons } from "@/lib/auth/login-icons";
import styles from "@/styles/login.module.css";

const features = [
  {
    title: "AI 智能客服",
    line1: "7x24 小时在线响应访客问题",
    line2: "让官网第一时间接住每一条商机",
    icon: loginIcons.featureAi,
  },
  {
    title: "知识库驱动",
    line1: "统一管理产品资料与常见问答",
    line2: "让回答更稳定、更专业",
    icon: loginIcons.featureKnowledge,
  },
  {
    title: "数据化获客",
    line1: "把对话、线索和转化串起来",
    line2: "持续优化企业官网转化效率",
    icon: loginIcons.featureGrowth,
  },
];

export function LoginBrandPanel() {
  return (
    <aside className={styles.brandPanel}>
      <div className={styles.gridMask} aria-hidden />
      <Image
        src={loginIcons.brandLockup}
        alt="企云 AI"
        width={134}
        height={40}
        className={styles.logo}
        priority
      />

      <div className={styles.brandCopy}>
        <h1>
          让企业官网
          <span>更会获客</span>
        </h1>
        <p>企云 AI 为企业提供统一的智能客服、知识库与线索管理入口。</p>
        <div className={styles.keyword}>AI 客服 · 知识库 · 留资转化 · 官网嵌入</div>
      </div>

      <div className={styles.features}>
        {features.map((feature) => (
          <article key={feature.title} className={styles.featureCard}>
            <img src={feature.icon} alt="" />
            <div>
              <b>{feature.title}</b>
              <small>
                {feature.line1}
                <br />
                {feature.line2}
              </small>
            </div>
          </article>
        ))}
      </div>

      <Image
        src={loginIcons.brandIllustration}
        alt="企云 AI 智能获客插画"
        width={325}
        height={250}
        className={styles.illustration}
        priority
        unoptimized
        sizes="325px"
        style={{ width: "100%", height: "auto" }}
      />
    </aside>
  );
}
