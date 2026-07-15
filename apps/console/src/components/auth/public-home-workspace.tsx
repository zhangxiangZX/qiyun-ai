import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";
import { loginIcons } from "@/lib/auth/login-icons";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import styles from "@/styles/login.module.css";

const flowSteps = [
  {
    step: "01",
    title: "AI 接待答疑",
    desc: "访客在官网即获基于企业资料的专业回复",
  },
  {
    step: "02",
    title: "识别高意向",
    desc: "自动识别报价、交期等需求并引导留资",
  },
  {
    step: "03",
    title: "销售闭环跟进",
    desc: "询盘、跟进、报价与成交一屏串联",
  },
] as const;

const highlights = [
  { icon: loginIcons.featureKnowledge, label: "企业知识库", hint: "PDF / Word 上传即检索" },
  { icon: loginIcons.featureAi, label: "官网 Widget", hint: "一行代码嵌入接待窗口" },
  { icon: loginIcons.featureGrowth, label: "询盘中心", hint: "线索分配与跟进任务" },
  { icon: loginIcons.register, label: "报价管理", hint: "模板生成与客户查看页" },
] as const;

export function PublicHomeWorkspace() {
  return (
    <section className={styles.shell} aria-label={`${BRAND_NAME} 首页`}>
      <LoginBrandPanel />
      <section className={styles.formPanel} aria-label="入口选择">
        <div className={`${styles.form} ${styles.formCompact} ${styles.homeForm}`}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>工业设备企业 · 官网智能获客</span>
            <h2>欢迎使用 {BRAND_NAME}</h2>
            <p>
              把官网访客接待、产品问答、高意向留资与销售跟进串成一条可演示、可追踪的业务闭环。
            </p>
          </header>

          <ol className={styles.homeFlow} aria-label="产品闭环">
            {flowSteps.map((item) => (
              <li key={item.step} className={styles.homeFlowItem}>
                <span className={styles.homeFlowStep}>{item.step}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.homeActions}>
            <Link href="/login" className={styles.homePrimaryCta}>
              登录控制台
            </Link>
            <Link href="/trial" className={styles.homeSecondaryCta}>
              新企业申请试用
            </Link>
          </div>

          <div className={styles.homeHighlights} aria-label="核心能力">
            {highlights.map((item) => (
              <article key={item.label} className={styles.homeHighlightCard}>
                <img src={item.icon} alt="" width={28} height={28} />
                <div>
                  <b>{item.label}</b>
                  <small>{item.hint}</small>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.helperCard}>
            <strong>首次使用？</strong>
            收到管理员邀请的成员请通过邮件链接激活；新企业提交试用申请，审核通过后即可登录并开始配置知识库与 Widget。
          </div>
        </div>
      </section>
      <LoginFooter />
    </section>
  );
}
