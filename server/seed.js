// Seed.js - Arquivo para popular o banco de dados com dados iniciais
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  try {
    // Usar especificamente a conta com ID 1
    let account = await prisma.account.findUnique({
      where: { id: 1 }
    });

    if (!account) {
      console.log('Conta com ID 1 não encontrada. Criando nova conta...');
      account = await prisma.account.create({
        data: {
          id: 1,
          nome: 'Central Celular',
          ativo: true
        }
      });
      console.log('Conta criada com sucesso:', account.id, account.nome);
    } else {
      console.log('Usando conta existente com ID:', account.id, account.nome);
    }

    // Senha padrão para líderes (poderá ser alterada posteriormente)
    const senhaHasheada = await bcrypt.hash('lider123', 10);

    // Lista de líderes a serem cadastrados
    const lideres = [
      { nome: 'Sandra Mara Conceição Tessis', whatsapp: '555599994218' },
      { nome: 'Andrew Gomes Gorges', whatsapp: '5555996614943' },
      { nome: 'Ednilson Costa Machado', whatsapp: '5555999437225' },
      { nome: 'Bruno Porto Wellicks', whatsapp: '5555999580505' },
      { nome: 'Douglas', whatsapp: '5555999067484' },
      { nome: 'Katia Cilene Rosa da Silva', whatsapp: '5555999986650' },
      { nome: 'Emanuelle da Silva Leães Gonçalves', whatsapp: '5555996645198' },
      { nome: 'Janeti Ansini Roballo', whatsapp: '5555996096261' },
      { nome: 'Elielker Rodrigues de Oliveira', whatsapp: '5555984630346' },
      { nome: 'Alice Rodrigues Martins', whatsapp: '5555984469096' },
      { nome: 'Fernanda Oliveira', whatsapp: '5555992027427' },
      { nome: 'Cristina Gonçalves Gomes', whatsapp: '5555996355675' },
      { nome: 'Gabriela Lamberti', whatsapp: '5555984233664' },
      { nome: 'Josiane Maia', whatsapp: '5555984564771' },
      { nome: 'Maurício Juliano Rucks Alves', whatsapp: '5555984166832' },
      { nome: 'Clenair Jauris Fagundes', whatsapp: '5555996453088' },
      { nome: 'Fernanda Ali Trindade', whatsapp: '5555996333608' },
      { nome: 'Jessyca da Silva Capilheira Dorneles', whatsapp: '5555997217848' },
      { nome: 'Nátally Vitória dos Santos Rios Davila', whatsapp: '5562994110752' },
      { nome: 'Marceli Abadi Siqueira', whatsapp: '5555999993423' },
      { nome: 'Francielle da Silva dos Santos Araujo', whatsapp: '5555991469803' },
      { nome: 'Fabiano Pereira', whatsapp: '5555996750973' },
      { nome: 'Flavio Alex Siqueira', whatsapp: '5555999270702' },
      { nome: 'Augusto Dias', whatsapp: '5555999020109' },
      { nome: 'Sabrina Abertol Wellicks', whatsapp: '5555996435625' },
      { nome: 'Joana Terezinha Gomes', whatsapp: '5555999780536' },
    ];

    console.log(`Cadastrando ${lideres.length} líderes...`);

    // Para cada líder, verificar se já existe e criar se não existir
    for (const lider of lideres) {
      const usuarioExistente = await prisma.usuario.findFirst({
      where: { 
          whatsapp: lider.whatsapp,
          accountId: account.id
        }
      });

      if (!usuarioExistente) {
        await prisma.usuario.create({
          data: {
            nome: lider.nome,
            whatsapp: lider.whatsapp,
            senha: senhaHasheada,
            cargo: 'LIDER',
            ativo: true,
            accountId: account.id
          }
        });
        console.log(`Líder ${lider.nome} cadastrado com sucesso.`);
      } else {
        console.log(`Líder ${lider.nome} já existe no banco de dados.`);
      }
    }

    console.log('Seed finalizado com sucesso!');
  } catch (error) {
    console.error('Erro durante o seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
