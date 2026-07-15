"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DISMISS_STORAGE_KEY = "qiyun-sidebar-upgrade-dismissed";
const CLOSE_ANIMATION_MS = 220;
const SIDEBAR_WIDTH_PX = 218;

export function SidebarUpgradePopover({ onNavigate }: { onNavigate?: () => void }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; width: number; bottom: number } | null>(
    null,
  );

  const updateAnchor = useCallback(() => {
    const node = anchorRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setAnchor({
      left: rect.left,
      width: rect.width,
      bottom: window.innerHeight - rect.top + 10,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    const dismissed = window.localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [open, updateAnchor]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
      setOpen(false);
      setClosing(false);
      closingRef.current = false;
    }, CLOSE_ANIMATION_MS);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose, open]);

  const handleOpen = () => {
    setClosing(false);
    setOpen(true);
  };

  return (
    <>
      <div ref={anchorRef} className="console-sidebar__plan-anchor">
        <button
          type="button"
          className={`console-sidebar__plan-trigger${open ? " console-sidebar__plan-trigger--hidden" : ""}`}
          onClick={handleOpen}
          tabIndex={open ? -1 : 0}
          aria-hidden={open}
        >
          <span className="console-sidebar__plan-trigger-title">企云图 AI 旗舰版</span>
          <span className="console-sidebar__plan-trigger-action">升级套餐</span>
        </button>
      </div>

      {mounted && open && anchor
        ? createPortal(
            <div className="console-sidebar-plan-layer" style={{ width: SIDEBAR_WIDTH_PX }} role="presentation">
              <section
                className={
                  closing
                    ? "console-sidebar__plan console-sidebar__plan--popup console-sidebar__plan--closing"
                    : "console-sidebar__plan console-sidebar__plan--popup"
                }
                style={{
                  left: anchor.left,
                  width: anchor.width,
                  bottom: anchor.bottom,
                }}
                role="region"
                aria-labelledby="sidebar-upgrade-title"
              >
                <button
                  type="button"
                  className="console-sidebar__plan-close"
                  aria-label="关闭"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
                <strong id="sidebar-upgrade-title" className="console-sidebar__plan-title">
                  企云图 AI 旗舰版
                </strong>
                <span className="console-sidebar__plan-subtitle">智能获客 · 高效转化</span>
                <Link
                  href="/dashboard/team"
                  className="console-sidebar__plan-btn"
                  onClick={() => {
                    handleClose();
                    onNavigate?.();
                  }}
                >
                  升级套餐
                </Link>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
