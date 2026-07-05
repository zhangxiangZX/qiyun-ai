"use client";

import { Alert } from "@qiyun/ui";

export interface ConsoleReadOnlyNoticeProps {
  title?: string;
  description: string;
}

export function ConsoleReadOnlyNotice({
  title = "只读模式",
  description,
}: ConsoleReadOnlyNoticeProps) {
  return (
    <Alert variant="info" title={title}>
      {description}
    </Alert>
  );
}
