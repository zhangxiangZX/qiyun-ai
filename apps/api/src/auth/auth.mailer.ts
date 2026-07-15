import type { WorkspaceInvitationRole } from "./auth.types";
import { createLogger } from "../logging/logger";
import { redactSensitive } from "../logging/redact";

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export interface WorkspaceInvitationEmail {
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  recipientEmail: string;
  role: WorkspaceInvitationRole;
  inviteUrl: string;
  expiresAt: string;
  invitedByName: string;
  invitedByEmail: string;
  sentAt: string;
}

export interface WorkspaceInvitationDeliveryAudit {
  id: string;
  invitationId: string;
  recipientEmail: string;
  provider: string;
  attempt: number;
  status: "sent" | "failed";
  startedAt: string;
  finishedAt: string;
  errorMessage: string | null;
}

export interface WorkspaceInvitationDeliveryAuditStore {
  record(entry: WorkspaceInvitationDeliveryAudit): void;
  listByInvitation(invitationId: string): WorkspaceInvitationDeliveryAudit[];
}

export interface WorkspaceInvitationMailer {
  sendInvitation(email: WorkspaceInvitationEmail): Promise<void>;
}

export interface EmailLoginCodeEmail {
  recipientEmail: string;
  code: string;
  expiresAt: string;
  sentAt: string;
}

export interface EmailLoginCodeMailer {
  sendCode(email: EmailLoginCodeEmail): Promise<void>;
}

export interface WorkspaceInvitationMailerEnv {
  APP_NAME?: string;
  APP_URL: string;
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  RESEND_API_KEY?: string;
  EMAIL_MAX_ATTEMPTS?: string;
  EMAIL_RETRY_DELAY_MS?: string;
}

export interface WorkspaceInvitationMailerBundle {
  auditStore: WorkspaceInvitationDeliveryAuditStore;
  mailer: WorkspaceInvitationMailer;
}

export interface EmailLoginCodeMailerBundle {
  mailer: EmailLoginCodeMailer;
}

export class InMemoryWorkspaceInvitationDeliveryAuditStore
  implements WorkspaceInvitationDeliveryAuditStore
{
  private readonly entries: WorkspaceInvitationDeliveryAudit[] = [];

  record(entry: WorkspaceInvitationDeliveryAudit): void {
    this.entries.push(entry);
  }

  listByInvitation(invitationId: string): WorkspaceInvitationDeliveryAudit[] {
    return this.entries.filter((entry) => entry.invitationId === invitationId);
  }
}

export class InMemoryWorkspaceInvitationMailer
  implements WorkspaceInvitationMailer
{
  private readonly sent: WorkspaceInvitationEmail[] = [];

  async sendInvitation(email: WorkspaceInvitationEmail): Promise<void> {
    this.sent.push(email);
  }

  listSent(): WorkspaceInvitationEmail[] {
    return [...this.sent];
  }
}

export class InMemoryEmailLoginCodeMailer implements EmailLoginCodeMailer {
  private readonly sent: EmailLoginCodeEmail[] = [];

  async sendCode(email: EmailLoginCodeEmail): Promise<void> {
    this.sent.push(email);
  }

  listSent(): EmailLoginCodeEmail[] {
    return [...this.sent];
  }
}

export class ConsoleWorkspaceInvitationMailer
  implements WorkspaceInvitationMailer
{
  async sendInvitation(email: WorkspaceInvitationEmail): Promise<void> {
    const logger = createLogger({ workspaceId: email.workspaceId });
    logger.info(
      redactSensitive(
        `[workspace-invite] sent invitation to=${email.recipientEmail} workspace="${email.workspaceName}" role=${email.role}`,
      ),
    );
  }
}

export class ConsoleEmailLoginCodeMailer implements EmailLoginCodeMailer {
  async sendCode(email: EmailLoginCodeEmail): Promise<void> {
    const logger = createLogger();
    // Never log the verification code in plaintext.
    logger.info(
      redactSensitive(
        `[auth-code] sent login verification code to=${email.recipientEmail}`,
      ),
    );
  }
}

export class ResendWorkspaceInvitationMailer
  implements WorkspaceInvitationMailer
{
  constructor(
    private readonly env: WorkspaceInvitationMailerEnv,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sendInvitation(email: WorkspaceInvitationEmail): Promise<void> {
    if (!this.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required for resend email provider.");
    }
    if (!this.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is required for resend email provider.");
    }

    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.env.EMAIL_FROM,
        to: [email.recipientEmail],
        reply_to: this.env.EMAIL_REPLY_TO,
        subject: `Invitation to join ${email.workspaceName}`,
        text: [
          `${email.invitedByName} (${email.invitedByEmail}) invited you to join ${email.workspaceName}.`,
          `Role: ${email.role}`,
          `Accept invitation: ${email.inviteUrl}`,
          `Expires at: ${email.expiresAt}`,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Resend invitation email failed: ${response.status} ${message}`,
      );
    }
  }
}

export class ResendEmailLoginCodeMailer implements EmailLoginCodeMailer {
  constructor(
    private readonly env: WorkspaceInvitationMailerEnv,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sendCode(email: EmailLoginCodeEmail): Promise<void> {
    if (!this.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required for resend email provider.");
    }
    if (!this.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is required for resend email provider.");
    }

    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.env.EMAIL_FROM,
        to: [email.recipientEmail],
        reply_to: this.env.EMAIL_REPLY_TO,
        subject: "Your Qiyun AI verification code",
        text: [
          "Your verification code is ready.",
          `Code: ${email.code}`,
          `Expires at: ${email.expiresAt}`,
          "If you did not request this code, you can ignore this email.",
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Resend auth code email failed: ${response.status} ${message}`,
      );
    }
  }
}

export class RetryingWorkspaceInvitationMailer
  implements WorkspaceInvitationMailer
{
  constructor(
    private readonly providerName: string,
    private readonly delegate: WorkspaceInvitationMailer,
    private readonly auditStore: WorkspaceInvitationDeliveryAuditStore,
    private readonly options: {
      maxAttempts: number;
      retryDelayMs: number;
      now?: () => Date;
      randomId?: () => string;
    },
  ) {}

  async sendInvitation(email: WorkspaceInvitationEmail): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt += 1) {
      const startedAt = (this.options.now?.() ?? new Date()).toISOString();

      try {
        await this.delegate.sendInvitation(email);
        this.auditStore.record({
          id: this.options.randomId?.() ?? `${email.invitationId}-${attempt}`,
          invitationId: email.invitationId,
          recipientEmail: email.recipientEmail,
          provider: this.providerName,
          attempt,
          status: "sent",
          startedAt,
          finishedAt: (this.options.now?.() ?? new Date()).toISOString(),
          errorMessage: null,
        });
        return;
      } catch (error) {
        lastError = error;
        this.auditStore.record({
          id: this.options.randomId?.() ?? `${email.invitationId}-${attempt}`,
          invitationId: email.invitationId,
          recipientEmail: email.recipientEmail,
          provider: this.providerName,
          attempt,
          status: "failed",
          startedAt,
          finishedAt: (this.options.now?.() ?? new Date()).toISOString(),
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        if (attempt < this.options.maxAttempts && this.options.retryDelayMs > 0) {
          await sleep(this.options.retryDelayMs);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Workspace invitation delivery failed.");
  }
}

export function createWorkspaceInvitationMailerBundle(
  env: WorkspaceInvitationMailerEnv,
): WorkspaceInvitationMailerBundle {
  const providerName = (env.EMAIL_PROVIDER ?? "memory").toLowerCase();
  let delegate: WorkspaceInvitationMailer;

  switch (providerName) {
    case "console":
      delegate = new ConsoleWorkspaceInvitationMailer();
      break;
    case "resend":
      delegate = new ResendWorkspaceInvitationMailer(env);
      break;
    case "memory":
    default:
      delegate = new InMemoryWorkspaceInvitationMailer();
      break;
  }

  const auditStore = new InMemoryWorkspaceInvitationDeliveryAuditStore();

  return {
    auditStore,
    mailer: new RetryingWorkspaceInvitationMailer(
      providerName,
      delegate,
      auditStore,
      {
        maxAttempts: Math.max(1, Number.parseInt(env.EMAIL_MAX_ATTEMPTS ?? "3", 10) || 3),
        retryDelayMs: Math.max(
          0,
          Number.parseInt(env.EMAIL_RETRY_DELAY_MS ?? "150", 10) || 150,
        ),
      },
    ),
  };
}

export function createEmailLoginCodeMailerBundle(
  env: WorkspaceInvitationMailerEnv,
): EmailLoginCodeMailerBundle {
  const providerName = (env.EMAIL_PROVIDER ?? "memory").toLowerCase();
  let mailer: EmailLoginCodeMailer;

  switch (providerName) {
    case "console":
      mailer = new ConsoleEmailLoginCodeMailer();
      break;
    case "resend":
      mailer = new ResendEmailLoginCodeMailer(env);
      break;
    case "memory":
    default:
      mailer = new InMemoryEmailLoginCodeMailer();
      break;
  }

  return { mailer };
}
