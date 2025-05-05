# Configuração do Banco de Dados

Este documento explica como configurar o banco de dados para o sistema Central Celular.

## Pré-requisitos

- PostgreSQL instalado e rodando
- Node.js e Yarn instalados
- Prisma CLI instalado (`yarn global add prisma`)

## Configuração Inicial

1. Verifique que o arquivo `.env` contém a URL correta de conexão com o banco de dados:

```
DATABASE_URL="postgresql://postgres:84476291@localhost:5432/central_db"
```

Certifique-se de substituir o usuário, senha e nome do banco de dados conforme sua configuração local.

2. Crie o banco de dados no PostgreSQL:

```sql
CREATE DATABASE central_db;
```

## Configuração do Prisma

1. Aplicar as migrações do Prisma para criar as tabelas:

```bash
yarn migrate:dev
```

Isso criará todas as tabelas definidas no schema.

## Populando o Banco de Dados

Para popular o banco de dados com dados iniciais de teste, execute o script de seed:

```bash
yarn tsx server/seed.js
```

### Dados de Teste Criados

O script de seed cria os seguintes dados:

#### Usuários
- Admin: admin@igreja.com / admin123
- Supervisor: supervisor@igreja.com / super123
- Líder: lider@igreja.com / lider123
- Co-Líder: colider@igreja.com / colider123

#### Membros
- 8 Membros na célula com nomes e contatos

#### Estrutura
- 1 Região (Zona Sul)
- 1 Célula (Célula Vida Nova)
- Relatórios dos últimos 3 meses
- Presenças registradas
- 1 Conquista para o líder

## Verificação

Para verificar se os dados foram criados corretamente, você pode consultar o banco de dados:

```bash
yarn prisma:studio
```

Isso abrirá uma interface web onde você pode visualizar e editar os dados de cada tabela.

## Reiniciando o Banco de Dados

Se precisar limpar o banco de dados e recomeçar, você pode seguir estes passos:

1. Remova todos os dados (descomente as linhas de `deleteMany()` no arquivo `server/seed.js`)
2. Execute novamente o script de seed:

```bash
yarn tsx server/seed.js
```

## Possíveis Problemas

### Erro de Conexão
Se você tiver problemas de conexão com o banco de dados, verifique:
- Se o PostgreSQL está rodando
- Se as credenciais no `.env` estão corretas
- Se o banco de dados existe

### Erros de Migração
Se houver problemas com as migrações:

```bash
yarn migrate:reset
yarn migrate:dev
```

Isso recriará todas as tabelas do zero.

## Desenvolvimento Local

Quando o banco de dados estiver configurado, inicie a aplicação:

```bash
yarn start
```

Isso iniciará tanto o backend quanto o frontend via concurrently.

Agora você pode acessar a aplicação em http://localhost:5173 e fazer login com as credenciais criadas.

## Conclusão

Com estas configurações, seu sistema deve estar integrado com o banco de dados PostgreSQL e funcionando corretamente com dados reais persistentes. Para produção, recomenda-se revisar as configurações de segurança e de conexão com o banco. 