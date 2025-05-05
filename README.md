# Central Celular

Sistema para gestão de células de igrejas, com controle de líderes, membros, relatórios e estatísticas de presença.

## Sobre o Sistema

O Central Celular é um sistema web moderno, feito especialmente para igrejas que trabalham com células. Foi pensado para ser usado principalmente pelo celular, com uma interface simples, intuitiva e adaptada para telas menores.

### Funcionalidades

- **Gestão de Células**: Cadastro e gestão de células, líderes e membros
- **Relatórios Mensais**: Preenchimento de relatórios com presença dos membros em cultos e células
- **Papéis**: Definição de consolidadores e co-líderes para cada célula
- **Anotações**: Registro de observações sobre os membros
- **Estatísticas**: Visualização de médias mensais de participação
- **Lembretes**: Notificações sobre prazos para envio de relatórios
- **Gamificação**: Ranking de engajamento entre líderes, com medalhas e selos de destaque

## Requisitos

- Node.js (versão 16 ou superior)
- Yarn
- PostgreSQL

## Configuração do Banco de Dados

1. Certifique-se de ter o PostgreSQL instalado e rodando
2. Crie um banco de dados com o nome `central_db`
3. A string de conexão está configurada como:
   ```
   postgresql://postgres:84476291@localhost:5432/central_db
   ```
4. Se necessário, atualize essa string no arquivo `.env`

## Instalação

```bash
# Instalar dependências
yarn

# Gerar o cliente Prisma
yarn generate

# Aplicar migrações no banco de dados
yarn migrate:dev
```

## Executando o Projeto

```bash
# Iniciar o servidor backend
yarn dev:server

# Em outro terminal, iniciar o frontend
yarn dev
```

O frontend estará disponível em: http://localhost:5173
O backend estará disponível em: http://localhost:3000

## Scripts Disponíveis

- `yarn dev` - Inicia o servidor de desenvolvimento do frontend
- `yarn dev:server` - Inicia o servidor de desenvolvimento do backend
- `yarn build` - Constrói o frontend para produção
- `yarn preview` - Previsualiza o build de produção do frontend
- `yarn generate` - Gera o cliente Prisma
- `yarn migrate:dev` - Executa migrações no banco de dados
- `yarn migrate:reset` - Reseta o banco de dados e aplica migrações
- `yarn db:push` - Aplica alterações no schema diretamente no banco
- `yarn prisma:studio` - Abre o Prisma Studio para visualizar o banco de dados

## Estrutura do Projeto

- `/prisma` - Definições de schema e migrações do banco de dados
- `/server` - Código do backend (API REST)
- `/src` - Código do frontend (Vue.js)

# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
