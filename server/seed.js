import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seeding do banco de dados...');

  // Criar usuários
  const adminUser = await prisma.usuario.upsert({
    where: { email: 'admin@igreja.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@igreja.com',
      senha: await bcrypt.hash('admin123', 10),
      cargo: 'ADMINISTRADOR',
      ativo: true
    }
  });

  const supervisorUser = await prisma.usuario.upsert({
    where: { email: 'supervisor@igreja.com' },
    update: {},
    create: {
      nome: 'Supervisor Silva',
      email: 'supervisor@igreja.com',
      senha: await bcrypt.hash('supervisor123', 10),
      cargo: 'SUPERVISOR',
      ativo: true
    }
  });

  const leaderUser = await prisma.usuario.upsert({
    where: { email: 'lider@igreja.com' },
    update: {},
    create: {
      nome: 'João Líder',
      email: 'lider@igreja.com',
      senha: await bcrypt.hash('lider123', 10),
      cargo: 'LIDER',
      ativo: true
    }
  });

  const coLeaderUser = await prisma.usuario.upsert({
    where: { email: 'colider@igreja.com' },
    update: {},
    create: {
      nome: 'Maria Auxiliadora',
      email: 'colider@igreja.com',
      senha: await bcrypt.hash('colider123', 10),
      cargo: 'COLIDER',
      ativo: true
    }
  });

  const pastorUser = await prisma.usuario.upsert({
    where: { email: 'pastor@igreja.com' },
    update: {},
    create: {
      nome: 'Pastor José',
      email: 'pastor@igreja.com',
      senha: await bcrypt.hash('pastor123', 10),
      cargo: 'PASTOR',
      ativo: true
    }
  });

  // Criar região
  const regiao = await prisma.regiao.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Zona Sul',
      ativo: true
    }
  });

  // Criar célula
  const celula = await prisma.celula.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Célula Vida Nova',
      endereco: 'Rua das Flores, 123',
      diaSemana: 'QUARTA',
      horario: '19:30',
      regiaoId: regiao.id,
      liderId: leaderUser.id,
      coLiderId: coLeaderUser.id,
      ativo: true
    }
  });

  // Criar membros da célula
  const membros = [];
  const nomes = ['Ana Silva', 'Carlos Oliveira', 'Mariana Santos', 'Pedro Costa', 'Juliana Lima', 'Rafael Souza', 'Fernanda Almeida', 'Lucas Pereira'];
  
  for (let i = 0; i < 8; i++) {
    // Criar membro diretamente na tabela Membro
    const membro = await prisma.$executeRaw`
      INSERT INTO membros (
        celula_id, 
        nome, 
        email, 
        telefone, 
        eh_consolidador, 
        observacoes, 
        ativo,
        data_cadastro
      ) 
      VALUES (
        ${celula.id}, 
        ${nomes[i]}, 
        ${`membro${i+1}@email.com`}, 
        ${`119${i+1}${i+2}${i+3}${i+4}${i+5}${i+6}${i+7}${i+8}`},
        ${i < 3}, 
        ${i < 3 ? 'Consolidador ativo' : null}, 
        ${true},
        ${new Date()}
      )
      RETURNING id
    `;
    
    // Extrair o ID retornado
    const membroId = Array.isArray(membro) && membro.length > 0 ? membro[0].id : i + 1;
    
    membros.push({ id: membroId });
  }

  // Criar relatórios para os últimos 3 meses
  const hoje = new Date();
  for (let i = 0; i < 3; i++) {
    const mes = hoje.getMonth() - i;
    const ano = hoje.getFullYear() - (mes < 0 ? 1 : 0);
    const mesAjustado = (mes < 0 ? mes + 12 : mes) + 1; // Ajuste para 1-12
    
    const relatorio = await prisma.relatorio.upsert({
      where: { 
        celulaId_mes_ano: {
          celulaId: celula.id,
          mes: mesAjustado,
          ano: ano
        }
      },
      update: {},
      create: {
        celulaId: celula.id,
        mes: mesAjustado,
        ano: ano,
        observacoes: `Relatório do mês ${mesAjustado}/${ano}`,
        dataEnvio: new Date(ano, mesAjustado - 1, 15) // Enviado no dia 15 do mês
      }
    });
    
    // Adicionar presenças para cada membro, para cada semana do mês
    for (const membro of membros) {
      for (let semana = 1; semana <= 4; semana++) {
        // Gerar presença aleatória
        const presencaCelula = Math.random() > 0.3; // 70% de chance de presente
        const presencaCulto = Math.random() > 0.4; // 60% de chance de presente
        
        await prisma.$executeRaw`
          INSERT INTO presencas (
            relatorio_id,
            membro_id,
            presenca_celula,
            presenca_culto,
            semana,
            observacoes
          )
          VALUES (
            ${relatorio.id},
            ${membro.id},
            ${presencaCelula},
            ${presencaCulto},
            ${semana},
            ${!presencaCelula && !presencaCulto ? 'Ausente por motivo de viagem' : null}
          )
        `;
      }
    }
  }

  // Adicionar conquista para o líder
  await prisma.conquista.create({
    data: {
      usuarioId: leaderUser.id,
      tipo: 'lider_destaque',
      descricao: '4 meses consecutivos com relatórios em dia',
      dataConclusao: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 20),
      mes: hoje.getMonth(),
      ano: hoje.getFullYear()
    }
  });

  // Adicionar notificação para o líder
  await prisma.notificacao.create({
    data: {
      usuarioId: leaderUser.id,
      titulo: 'Nova Conquista',
      mensagem: 'Parabéns! Você recebeu a conquista Líder Destaque.',
      tipo: 'conquista',
      lida: false
    }
  });

  // Limpar dados antigos (descomente para resetar o banco)
  /*
  await prisma.presenca.deleteMany();
  await prisma.relatorio.deleteMany();
  await prisma.membro.deleteMany();
  await prisma.notificacao.deleteMany();
  await prisma.conquista.deleteMany();
  await prisma.celula.deleteMany();
  await prisma.regiao.deleteMany();
  await prisma.usuario.deleteMany();
  */

  console.log('Seeding concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });