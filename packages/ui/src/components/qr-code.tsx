import { QRCodeSVG } from "qrcode.react";

export interface QrCodeProps {
  /** 要编码的内容：URL、文本或安装代码等 */
  value: string;
  /** 像素尺寸（正方形） */
  size?: number;
  /** 纠错等级：L/M/Q/H，越高越抗污损 */
  level?: "L" | "M" | "Q" | "H";
  /** 前景色（默认深品牌色，保证可扫描） */
  fgColor?: string;
  /** 背景色（默认白，保证可扫描） */
  bgColor?: string;
  /** 是否在四周留静区 */
  includeMargin?: boolean;
  className?: string;
  /** 无障碍标题 */
  title?: string;
}

/**
 * 二维码组件（V2 工具）。
 * 基于 qrcode.react 的 SVG 实现，零额外运行时依赖、可无损缩放。
 * 默认使用高对比深色前景 + 白底，确保手机可扫描；
 * 若需要品牌色，可传 fgColor / bgColor 覆盖（注意保持对比度）。
 */
export function QrCode({
  value,
  size = 160,
  level = "M",
  fgColor = "#101a33",
  bgColor = "#ffffff",
  includeMargin = true,
  className,
  title,
}: QrCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level={level}
      fgColor={fgColor}
      bgColor={bgColor}
      includeMargin={includeMargin}
      className={className}
      title={title}
    />
  );
}
