"use client";

import { useState } from "react";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  ChevronDown,
  Download,
  Send,
  ArrowLeft,
  FileText,
} from "lucide-react";

import { Button } from "@qiyun/ui";

function SelectInput({ value, options }: { value: string; options: string[] }) {
  return (
    <div className="relative">
      <select className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]">
        <option>{value}</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

const PRODUCTS = [
  { no: 1, name: "智能数据分析师平台", model: "GY-DA-2024", qty: 1, unit: "套", price: 68000, amount: 68000 },
  { no: 2, name: "数据可视化大屏", model: "GY-DV-1080P", qty: 2, unit: "套", price: 18000, amount: 36000 },
  { no: 3, name: "数据接入服务", model: "GY-DI-Standard", qty: 1, unit: "套", price: 12000, amount: 12000 },
  { no: 4, name: "云端存储与调度服务", model: "GY-SVC-Implement-12M", qty: 1, unit: "套", price: 15000, amount: 15000 },
  { no: 5, name: "一年技术支持服务", model: "GY-SVC-Support-12M", qty: 1, unit: "年", price: 8000, amount: 8000 },
];

const ATTACHMENTS = ["AI产品介绍.pdf", "方案技术说明.pdf", "服务与支持说明.pdf"];

function formatYuan(n: number) {
  return n.toLocaleString("zh-CN");
}

export function QuotationPreviewWorkspace() {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      {/* 顶部 */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">报价 PDF 预览</h1>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="搜索..."
              className="h-9 w-48 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
            />
          </div>
          <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-[#38bdf8] to-[#2563eb]" />
        </div>
      </header>

      {/* 工具栏 */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-2 text-sm text-slate-600">
        <span className="rounded border border-slate-200 px-2 py-1 font-medium">{zoom}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="rounded p-1.5 hover:bg-slate-100"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          className="rounded p-1.5 hover:bg-slate-100"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="mx-2 text-slate-400">|</span>
        <span>
          第 1 / 1 页
        </span>
        <span className="mx-2 text-slate-400">|</span>
        <button className="rounded p-1.5 hover:bg-slate-100" title="全屏">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button className="rounded p-1.5 hover:bg-slate-100" title="打印">
          <Printer className="h-4 w-4" />
        </button>
      </div>

      {/* 两栏 */}
      <div className="flex flex-1 gap-5 p-6">
        {/* 左：PDF 预览 */}
        <div className="flex flex-1 justify-center overflow-auto rounded-card bg-slate-200/40 p-6">
          <div
            className="origin-top rounded-sm bg-white shadow-2xl"
            style={{ width: 794, transform: `scale(${zoom / 100})` }}
          >
            <div className="px-12 py-10 text-[13px] leading-relaxed text-slate-800">
              {/* 信头 */}
              <div className="flex items-start justify-between border-b-2 border-[#2563eb] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-white">
                    <span className="text-sm font-bold">企</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#1d4ed8]">企云科技</p>
                    <p className="text-[11px] tracking-wide text-slate-400">Qiyun Technology</p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-widest text-slate-800">报价单</h2>
              </div>

              {/* 基本信息 */}
              <div className="mt-5 grid grid-cols-2 gap-y-2 text-[13px]">
                <div>
                  <span className="text-slate-500">报价单号：</span>
                  <span className="font-medium">QT-20240601-001</span>
                </div>
                <div>
                  <span className="text-slate-500">报价日期：</span>
                  <span>2024-06-01</span>
                </div>
                <div>
                  <span className="text-slate-500">有效期至：</span>
                  <span>2024-06-30</span>
                </div>
                <div>
                  <span className="text-slate-500">币种：</span>
                  <span>人民币（CNY）</span>
                </div>
              </div>

              {/* 客户信息 */}
              <div className="mt-5 rounded border border-slate-200 p-4">
                <p className="mb-2 text-[12px] font-semibold text-slate-700">客户信息</p>
                <div className="grid grid-cols-2 gap-y-1.5 text-[13px]">
                  <div>
                    <span className="text-slate-500">客户名称：</span>
                    <span>深圳市未来科技有限公司</span>
                  </div>
                  <div>
                    <span className="text-slate-500">联系人：</span>
                    <span>李明</span>
                  </div>
                  <div>
                    <span className="text-slate-500">邮箱：</span>
                    <span>liming@futuretech.com</span>
                  </div>
                  <div>
                    <span className="text-slate-500">电话：</span>
                    <span>138 0113 8000</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[13px] text-slate-600">
                尊敬的李先生/女士：以下是针对您提供的产品报价方案，敬请审阅。如无异议，我们将尽快为您安排交付与实施。
              </p>

              {/* 产品表 */}
              <table className="mt-4 w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#eff6ff] text-left text-slate-700">
                    <th className="border border-slate-300 px-2 py-2">#</th>
                    <th className="border border-slate-300 px-2 py-2">产品名称</th>
                    <th className="border border-slate-300 px-2 py-2">规格型号</th>
                    <th className="border border-slate-300 px-2 py-2 text-right">数量</th>
                    <th className="border border-slate-300 px-2 py-2">单位</th>
                    <th className="border border-slate-300 px-2 py-2 text-right">单价(元)</th>
                    <th className="border border-slate-300 px-2 py-2 text-right">金额(元)</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTS.map((p) => (
                    <tr key={p.no}>
                      <td className="border border-slate-300 px-2 py-2">{p.no}</td>
                      <td className="border border-slate-300 px-2 py-2">{p.name}</td>
                      <td className="border border-slate-300 px-2 py-2">{p.model}</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{p.qty}</td>
                      <td className="border border-slate-300 px-2 py-2">{p.unit}</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{formatYuan(p.price)}</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{formatYuan(p.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="border border-slate-300 px-2 py-2" colSpan={6}>
                      小计(元)
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">139,000</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-2" colSpan={6}>
                      增值税(13%)
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">18,070</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-[#1d4ed8]">
                    <td className="border border-slate-300 px-2 py-2" colSpan={6}>
                      合计(元)
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">157,070</td>
                  </tr>
                </tbody>
              </table>

              {/* 条款 */}
              <div className="mt-5">
                <p className="mb-1.5 text-[12px] font-semibold text-slate-700">报价条款与条件</p>
                <ul className="list-disc space-y-1 pl-5 text-[12px] text-slate-600">
                  <li>本报价单自签发之日起 30 天内有效，逾期需重新确认价格。</li>
                  <li>付款方式：合同签订后支付 50% 预付款，验收合格后支付剩余 50%。</li>
                  <li>交付周期：自收到预付款之日起 15 个工作日内完成交付与实施。</li>
                  <li>以上报价不含现场差旅费用，具体以合同条款为准。</li>
                </ul>
              </div>

              {/* 页脚 */}
              <div className="mt-8 flex items-end justify-between">
                <div className="space-y-6 text-[12px] text-slate-600">
                  <div>
                    <p>客户确认（签章）：________________</p>
                    <p className="mt-4">日期：____ 年 ____ 月 ____ 日</p>
                  </div>
                  <div>
                    <p>核准签字：________________</p>
                    <p className="mt-4">日期：2024-06-01</p>
                  </div>
                </div>
                {/* 印章 */}
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/80" />
                  <div className="absolute inset-2 rounded-full border border-red-500/60" />
                  <div className="px-2 text-center text-[11px] font-bold leading-tight text-red-500/80">
                    企云科技
                    <br />
                    有限公司
                  </div>
                  <div className="absolute bottom-5 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-red-500/70" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右：元数据面板 */}
        <aside className="w-[340px] shrink-0 space-y-4 overflow-auto">
          <section className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">报价信息</h3>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-slate-500">报价单号</dt>
                <dd className="font-medium text-slate-800">QT-20240601-001</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">客户名称</dt>
                <dd className="font-medium text-slate-800">深圳市未来科技有限公司</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">报价日期</dt>
                <dd className="text-slate-800">2024-06-01</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">币种</dt>
                <dd className="text-slate-800">人民币（CNY）</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">合同含</dt>
                <dd className="flex items-center gap-1 font-medium text-green-600">
                  <span className="text-green-500">✓</span> 包含
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
            <div>
              <p className="mb-1 text-[13px] font-medium text-slate-700">模板选择</p>
              <SelectInput
                value="轻量商务报价单模版(蓝色)"
                options={["标准商务模版(深色)", "简约清新模版(绿色)"]}
              />
              <Button variant="outline" className="mt-2 w-full">
                选择模版
              </Button>
            </div>
            <div>
              <p className="mb-1 text-[13px] font-medium text-slate-700">语言</p>
              <SelectInput value="简体中文" options={["English", "繁體中文"]} />
            </div>
          </section>

          <section className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-slate-800">导出设置</h3>
            <div>
              <p className="mb-1 text-[13px] text-slate-600">纸张大小</p>
              <SelectInput value="A4 (210 × 297 mm)" options={["A3", "Letter"]} />
            </div>
            <div>
              <p className="mb-1 text-[13px] text-slate-600">页边距</p>
              <SelectInput value="标准 (20mm)" options={["窄 (10mm)", "宽 (25mm)"]} />
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-[13px] text-slate-700">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-[#2563eb]" />
                显示公司印章
              </label>
              <label className="flex items-center gap-2 text-[13px] text-slate-700">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-[#2563eb]" />
                显示页眉页脚
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-slate-800">发送给客户</h3>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eff6ff] text-xs text-[#2563eb]">
                人
              </span>
              <span className="text-[13px] text-slate-700">liming@futuretech.com</span>
            </div>
            <div>
              <p className="mb-1 text-[13px] text-slate-600">附件主题</p>
              <input
                defaultValue="报价单 QT-20240601-001 | 企云科技有限公司"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <p className="mb-1 text-[13px] text-slate-600">附件内容</p>
              <textarea
                defaultValue="您好，附件为本次项目报价单，敬请查阅。如有疑问欢迎随时联系。"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] text-slate-600">邮件附件</p>
              <div className="space-y-1.5">
                {ATTACHMENTS.map((a) => (
                  <div
                    key={a}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
                  >
                    <span className="flex items-center gap-2 text-slate-700">
                      <FileText className="h-4 w-4 text-[#2563eb]" />
                      {a}
                    </span>
                    <button className="text-slate-400 hover:text-[#2563eb]">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[13px] text-slate-600">备注</p>
              <textarea
                rows={2}
                placeholder="可选备注..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] placeholder:text-slate-400"
              />
            </div>
          </section>

          <div className="space-y-2">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4" />
              返回编辑
            </Button>
            <Button className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]">
              <Send className="h-4 w-4" />
              发送客户
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4" />
              下载PDF
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
