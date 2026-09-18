import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  CompanyType,
  UserRole,
  type Company,
  type SupportMessage,
  type SupportThread,
} from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { assert, assertFound, newId, toIso } from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportMessageDto, MarkSupportReadDto } from './dto/support.dto';

type ThreadWithCompany = SupportThread & { company: Company };

export type SupportThreadView = {
  id: string;
  companyId: string;
  companyName: string;
  requesterId: string;
  requesterName: string;
  requesterRole: UserRole;
  supportLastReadAt?: string;
  requesterLastReadAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessageView = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  createdAt: string;
};

const preview = (body: string) =>
  body.length > 90 ? `${body.slice(0, 87)}...` : body;

const isPlatformAgent = (user: JwtPayload): boolean =>
  user.companyType === CompanyType.platform &&
  (user.role === UserRole.Support || user.role === UserRole.Admin);

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async listThreads(user: JwtPayload): Promise<SupportThreadView[]> {
    const threads = isPlatformAgent(user)
      ? await this.prisma.supportThread.findMany({
          include: { company: true },
          orderBy: { updatedAt: 'desc' },
        })
      : await this.prisma.supportThread.findMany({
          where: { requesterId: user.sub },
          include: { company: true },
          orderBy: { updatedAt: 'desc' },
        });

    return threads.map((thread) => this.toThreadView(thread));
  }

  async listMessages(
    user: JwtPayload,
    threadId: string,
  ): Promise<SupportMessageView[]> {
    const thread = await this.getThreadOrThrow(user, threadId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((message) => this.toMessageView(message));
  }

  async ensureThread(user: JwtPayload): Promise<SupportThreadView> {
    assert(
      user.companyType === CompanyType.client,
      'Only client-company users create support threads',
    );

    const existing = await this.prisma.supportThread.findFirst({
      where: { requesterId: user.sub },
      include: { company: true },
    });
    if (existing) {
      return this.toThreadView(existing);
    }

    const actor = assertFound(
      await this.prisma.user.findUnique({
        where: { id: user.sub },
        include: { company: true },
      }),
      'User not found',
    );
    const now = new Date();

    const created = await this.prisma.supportThread.create({
      data: {
        id: `support-${user.sub}`,
        companyId: actor.companyId,
        requesterId: actor.id,
        requesterName: actor.name,
        requesterRole: actor.role,
        requesterLastReadAt: now,
        createdAt: now,
        updatedAt: now,
      },
      include: { company: true },
    });

    return this.toThreadView(created);
  }

  async addMessage(
    user: JwtPayload,
    threadId: string | null,
    dto: CreateSupportMessageDto,
  ): Promise<{
    thread: SupportThreadView;
    message: SupportMessageView;
  }> {
    const agent = isPlatformAgent(user);
    const actor = assertFound(
      await this.prisma.user.findUnique({
        where: { id: user.sub },
        include: { company: true },
      }),
      'User not found',
    );

    let thread: ThreadWithCompany | null = null;

    if (threadId) {
      thread = await this.getThreadOrThrow(user, threadId);
    } else if (!agent) {
      const ensured = await this.ensureThread(user);
      thread = assertFound(
        await this.prisma.supportThread.findUnique({
          where: { id: ensured.id },
          include: { company: true },
        }),
      );
    }

    assert(thread, 'Thread is required for platform agents');

    const now = new Date();
    const body = dto.body.trim();
    assert(body.length > 0, 'Message body is required');

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          id: newId(),
          threadId: thread.id,
          authorId: actor.id,
          authorName: actor.name,
          authorRole: actor.role,
          body,
          createdAt: now,
        },
      });

      await tx.supportThread.update({
        where: { id: thread.id },
        data: {
          updatedAt: now,
          ...(agent
            ? { supportLastReadAt: now }
            : { requesterLastReadAt: now }),
        },
      });

      if (agent) {
        await tx.appNotification.create({
          data: {
            id: newId(),
            companyId: thread.companyId,
            recipientUserId: thread.requesterId,
            title: 'Support replied',
            body: preview(body),
            read: false,
            createdAt: now,
          },
        });
      } else {
        const platform = await tx.company.findFirst({
          where: { type: CompanyType.platform },
        });
        if (platform) {
          await tx.appNotification.create({
            data: {
              id: newId(),
              companyId: platform.id,
              recipientRole: UserRole.Support,
              title: `Support: ${actor.company.name}`,
              body: `${actor.name}: ${preview(body)}`,
              href: `?thread=${thread.id}`,
              read: false,
              createdAt: now,
            },
          });
        }
      }

      return created;
    });

    const refreshed = assertFound(
      await this.prisma.supportThread.findUnique({
        where: { id: thread.id },
        include: { company: true },
      }),
    );

    return {
      thread: this.toThreadView(refreshed),
      message: this.toMessageView(message),
    };
  }

  async markRead(
    user: JwtPayload,
    threadId: string,
    dto: MarkSupportReadDto,
  ): Promise<SupportThreadView> {
    const thread = await this.getThreadOrThrow(user, threadId);
    const agent = isPlatformAgent(user);

    if (dto.as === 'support' && !agent) {
      throw new ForbiddenException('Only platform support can mark as support');
    }
    if (dto.as === 'requester' && thread.requesterId !== user.sub) {
      throw new ForbiddenException('Only the requester can mark as requester');
    }

    const now = new Date();
    const updated = await this.prisma.supportThread.update({
      where: { id: thread.id },
      data:
        dto.as === 'support'
          ? { supportLastReadAt: now }
          : { requesterLastReadAt: now },
      include: { company: true },
    });

    return this.toThreadView(updated);
  }

  private async getThreadOrThrow(
    user: JwtPayload,
    threadId: string,
  ): Promise<ThreadWithCompany> {
    const thread = assertFound(
      await this.prisma.supportThread.findUnique({
        where: { id: threadId },
        include: { company: true },
      }),
      'Support thread not found',
    );

    if (isPlatformAgent(user)) {
      return thread;
    }

    if (thread.requesterId !== user.sub) {
      throw new ForbiddenException('Access denied to this thread');
    }

    return thread;
  }

  toThreadView(thread: ThreadWithCompany): SupportThreadView {
    return {
      id: thread.id,
      companyId: thread.companyId,
      companyName: thread.company.name,
      requesterId: thread.requesterId,
      requesterName: thread.requesterName,
      requesterRole: thread.requesterRole,
      supportLastReadAt: thread.supportLastReadAt
        ? toIso(thread.supportLastReadAt)
        : undefined,
      requesterLastReadAt: thread.requesterLastReadAt
        ? toIso(thread.requesterLastReadAt)
        : undefined,
      createdAt: toIso(thread.createdAt),
      updatedAt: toIso(thread.updatedAt),
    };
  }

  toMessageView(message: SupportMessage): SupportMessageView {
    return {
      id: message.id,
      threadId: message.threadId,
      authorId: message.authorId,
      authorName: message.authorName,
      authorRole: message.authorRole,
      body: message.body,
      createdAt: toIso(message.createdAt),
    };
  }
}
