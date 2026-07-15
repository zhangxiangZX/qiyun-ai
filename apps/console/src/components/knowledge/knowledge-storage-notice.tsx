"use client";

import { useEffect, useState } from "react";

import { Alert } from "@qiyun/ui";

import { PreviewModeNotice } from "@/components/console/preview-mode-notice";
import {
  getKnowledgeCapabilities,
  type KnowledgeCapabilities,
} from "@/lib/knowledge/capabilities";

export function KnowledgeStorageNotice() {
  const [capabilities, setCapabilities] = useState<KnowledgeCapabilities | null>(null);

  useEffect(() => {
    void getKnowledgeCapabilities()
      .then(setCapabilities)
      .catch(() => setCapabilities(null));
  }, []);

  if (!capabilities) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Alert variant="info" title="存储与索引说明">
        <p>{capabilities.storageHint}</p>
        <p className="mt-2">{capabilities.pipelineHint}</p>
      </Alert>
      <PreviewModeNotice message={capabilities.previewDifferenceHint} />
    </div>
  );
}
