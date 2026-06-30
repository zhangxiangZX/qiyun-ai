"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@qiyun/ui";

import { BotStatusBadge } from "@/components/bots/bot-status-badge";
import { formatConversationCount, formatShortDateTime } from "@/lib/bots/format";
import type { BotListItem } from "@/lib/bots/types";

export interface BotListProps {
  bots: BotListItem[];
}

export function BotList({ bots }: BotListProps) {
  return (
    <>
      <div className="hidden rounded-card border border-border bg-card shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>知识库</TableHead>
              <TableHead>近 7 天会话</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bots.map((bot) => (
              <TableRow key={bot.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/bots/${bot.id}/basics`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {bot.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <BotStatusBadge status={bot.status} />
                </TableCell>
                <TableCell>{bot.knowledgeBaseCount}</TableCell>
                <TableCell>{formatConversationCount(bot.conversations7d)}</TableCell>
                <TableCell>{formatShortDateTime(bot.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/bots/${bot.id}/basics`}>
                      <Pencil className="h-4 w-4" aria-hidden />
                      编辑
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {bots.map((bot) => (
          <article
            key={bot.id}
            className="rounded-card border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/bots/${bot.id}/basics`}
                  className="font-medium text-card-foreground hover:text-primary"
                >
                  {bot.name}
                </Link>
                <div className="mt-2">
                  <BotStatusBadge status={bot.status} />
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="更多操作">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/bots/${bot.id}/basics`}>编辑</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">知识库</dt>
                <dd className="mt-1 font-medium">{bot.knowledgeBaseCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">近 7 天会话</dt>
                <dd className="mt-1 font-medium">{formatConversationCount(bot.conversations7d)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">更新时间</dt>
                <dd className="mt-1 font-medium">{formatShortDateTime(bot.updatedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
