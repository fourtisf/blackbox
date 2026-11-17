import type { PrismaClient } from '@prisma/client';
import type { WaitlistStore } from './waitlist.js';

export function prismaWaitlistStore(prisma: PrismaClient): WaitlistStore {
  return {
    upsert: (email, role, source) =>
      prisma.waitlistSignup.upsert({ where: { email }, create: { email, role, source }, update: {} }),
    async markConfirmSent(email, at) {
      await prisma.waitlistSignup.updateMany({ where: { email }, data: { confirmSentAt: at } });
    },
    async confirm(email, at) {
      const row = await prisma.waitlistSignup.findUnique({ where: { email } });
      if (!row) return false;
      if (!row.confirmedAt)
        await prisma.waitlistSignup.update({ where: { email }, data: { confirmedAt: at } });
      return true;
    },
    async remove(email) {
      const { count } = await prisma.waitlistSignup.deleteMany({ where: { email } });
      return count > 0;
    },
    all: () => prisma.waitlistSignup.findMany({ orderBy: { createdAt: 'desc' } }),
  };
}
