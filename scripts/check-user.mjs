import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const users = await prisma.usuario.findMany({
    where: {
      OR: [
        { nome: { contains: 'pastor', mode: 'insensitive' } },
        { nome: { contains: 'teste', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      cargo: true,
      ativo: true,
      isSuperAdmin: true,
      accountId: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('=== USUÁRIOS (pastor/teste) ===');
  console.table(users);

  for (const u of users) {
    const verSuperAdmin =
      u.isSuperAdmin === true
        ? 'SIM → vê /super-admin'
        : 'NÃO → não vê Super Admin (esperado para PASTOR)';
    const verAdminIgreja =
      u.cargo === 'PASTOR' || u.isSuperAdmin
        ? 'SIM → vê /admin'
        : 'NÃO';
    console.log(`\n${u.nome} (id=${u.id}):`);
    console.log(`  cargo: ${u.cargo}`);
    console.log(`  isSuperAdmin: ${u.isSuperAdmin}`);
    console.log(`  Super Admin menu: ${verSuperAdmin}`);
    console.log(`  Admin igreja: ${verAdminIgreja}`);
  }

  const superAdmins = await prisma.usuario.findMany({
    where: { isSuperAdmin: true },
    select: { id: true, nome: true, cargo: true, whatsapp: true },
  });
  console.log('\n=== TODOS isSuperAdmin=true ===');
  console.table(superAdmins);
} catch (e) {
  console.error('Erro:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
