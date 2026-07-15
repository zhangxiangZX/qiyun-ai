import type { DocumentItem } from "./types";

/**
 * 资料详情页 mock 数据。
 *
 * useApiResource 回退使用：当上游 API 未配置（503 PREVIEW_MODE）或请求失败时，
 * 页面使用此 mock 展示完整的详情界面，保证预览/演示可用。
 *
 * mock 内容模拟一份完整的工业产品手册 PDF 详情：
 * 包含文件元信息、分类标签、水印状态、上传人、内容摘要预览。
 */
export const mockDocumentDetail: DocumentItem = {
  id: "doc-seed-001",
  name: "工业视觉检测系统_产品手册.pdf",
  kind: "pdf",
  category: "brochure",
  sizeBytes: 4_812_000,
  uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  uploadedBy: "李娜",
  watermarkable: true,
  watermarked: false,
  status: "ready",
  mimeType: "application/pdf",
};

/**
 * 模拟内容摘要（文本预览用）。
 *
 * 真实环境下需后端返回 contentPreview 字段或前端从下载 blob 中提取。
 * 这里仅做 UI 演示。
 */
export const mockContentPreview = `第一章 系统概述

AI云工业视觉检测系统（IVS-3000）是面向制造业产线的智能质检解决方案。
系统集成深度学习算法与高速工业相机，可实现微米级缺陷检测，覆盖外观瑕疵、
尺寸偏差、装配错漏等典型场景。

1.1 核心能力
- 检测精度：最高 0.01mm
- 检测速度：单件 ≤ 200ms
- 支持模型：YOLOv8 / ResNet / 自定义模型
- 部署方式：边缘网关 + 云端管理平台

1.2 适用行业
3C 电子、汽车零部件、半导体封装、新能源电池、医药包装等。

第二章 硬件规格

| 参数 | 规格 |
|------|------|
| 相机分辨率 | 2000 万像素 |
| 镜头焦距 | 8mm / 16mm / 25mm 可选 |
| 光源 | 环形 LED / 同轴光 / 条形光 |
| 通信接口 | GigE / USB3.0 / RS485 |
| 工作温度 | -10°C ~ 55°C |
| 防护等级 | IP65 |

第三章 软件功能

3.1 缺陷标注与模型训练
内置标注工具，支持矩形框、多边形、关键点标注。训练流程自动化，
支持增量学习与模型版本管理。

3.2 产线集成
提供 REST API 与 Modbus TCP 协议，可对接 MES / SCADA 系统。
支持 PLC 联动触发与分拣机构控制。

3.3 数据看板
实时展示良率、缺陷分布、趋势告警。支持历史数据回溯与报表导出。

第四章 部署与运维

4.1 硬件安装
- 相机安装高度：300mm ~ 800mm（视检测对象调整）
- 光源角度：30° ~ 60°（视表面反光特性调整）
- 网关部署：产线旁就近安装，建议距相机 ≤ 5m

4.2 日常维护
- 每周清洁镜头与光源
- 每月校准相机坐标系
- 模型准确率下降 ≥ 3% 时触发增量训练`;
