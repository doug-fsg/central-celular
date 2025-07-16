# Migração: Relatórios Mensais → Semanais

## Visão Geral
Este documento descreve o plano de migração do sistema de relatórios de células de mensal para semanal.

## Nova Estrutura do Banco de Dados

### Schema Prisma
```prisma
model Periodo {
  id          Int       @id @default(autoincrement())
  dataInicio  DateTime
  dataFim     DateTime
  tipo        String    // "SEMANAL", "MENSAL"
  status      String    // "ABERTO", "FECHADO"
  relatorios  Relatorio[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Relatorio {
  id          Int       @id @default(autoincrement())
  celulaId    Int       @map("celula_id")
  celula      Celula    @relation(fields: [celulaId], references: [id])
  periodoId   Int       @map("periodo_id")
  periodo     Periodo   @relation(fields: [periodoId], references: [id])
  status      String    // "RASCUNHO", "ENVIADO"
  dataEnvio   DateTime? @map("data_envio")
  observacoes String?
  eventos     Evento[]

  @@unique([celulaId, periodoId])
}

model Evento {
  id          Int       @id @default(autoincrement())
  relatorioId Int       @map("relatorio_id")
  relatorio   Relatorio @relation(fields: [relatorioId], references: [id])
  tipo        String    // "CELULA", "CULTO"
  data        DateTime
  localEvento String?   @map("local_evento")
  presencas   Presenca[]
}

model Presenca {
  id          Int       @id @default(autoincrement())
  eventoId    Int       @map("evento_id")
  evento      Evento    @relation(fields: [eventoId], references: [id])
  membroId    Int       @map("membro_id")
  membro      Membro    @relation(fields: [membroId], references: [id])
  status      String    // "PRESENTE", "AUSENTE", "JUSTIFICADO"
  justificativa String?

  @@unique([eventoId, membroId])
}
```

## Plano de Implementação

### Fase 1: Desenvolvimento da Nova Estrutura (3-5 dias)

#### Backend
1. **Criar Migrations**
   - Adicionar tabela `periodos`
   - Adicionar tabela `eventos`
   - Modificar tabela `relatorios`
   - Modificar tabela `presencas`

2. **Desenvolver Serviços**
   - `PeriodoService`
     - Geração automática de períodos semanais
     - Gestão de status dos períodos
   - `RelatorioService`
     - Adaptação para trabalhar com períodos
     - CRUD de eventos
   - `PresencaService`
     - Registro de presenças por evento

3. **Implementar Controllers**
   - `PeriodosController`
   - Adaptar `RelatoriosController`
   - Adaptar `PresencasController`

4. **Rotas da API**
```typescript
// Períodos
GET    /api/relatorios/periodos
GET    /api/relatorios/periodos/atual
POST   /api/relatorios/periodos
PATCH  /api/relatorios/periodos/:id

// Relatórios
GET    /api/relatorios
POST   /api/relatorios
GET    /api/relatorios/:id
POST   /api/relatorios/:id/enviar

// Eventos
POST   /api/relatorios/:id/eventos
PATCH  /api/relatorios/:id/eventos/:eventoId

// Presenças
POST   /api/relatorios/:id/eventos/:eventoId/presencas
PATCH  /api/relatorios/:id/eventos/:eventoId/presencas/:presencaId
```

### Fase 2: Desenvolvimento Frontend (3-5 dias)

1. **Stores**
   ```typescript
   // stores/periodoStore.ts
   interface PeriodoState {
     periodos: Periodo[]
     periodoAtual: Periodo | null
     loading: boolean
   }

   // stores/relatorioStore.ts
   interface RelatorioState {
     relatorios: Relatorio[]
     relatorioAtual: Relatorio | null
     loading: boolean
   }
   ```

2. **Componentes**
   - `PeriodSelector.vue`
   - `EventForm.vue`
   - `PresenceGrid.vue` (adaptação)
   - `ReportReminder.vue` (adaptação)
   - `ReportList.vue` (adaptação)

3. **Views**
   - Adaptar `Reports.vue`
   - Adaptar `AttendanceForm.vue`

### Fase 3: Testes (2-3 dias)

1. **Testes Unitários**
   - Serviços
   - Controllers
   - Componentes Vue

2. **Testes de Integração**
   - Fluxo completo de criação de relatório
   - Registro de presenças
   - Geração automática de períodos

3. **Testes Manuais**
   - Validar interface
   - Testar casos de borda
   - Verificar responsividade

## Mudanças na Interface

### Principais Alterações
1. Seletor de período ao invés de mês/ano
2. Formulário de eventos para cada relatório
3. Grade de presença por evento
4. Novo componente de resumo semanal

### Mockups
(Adicionar mockups das principais telas quando disponíveis)

## Considerações Técnicas

### Performance
- Indexar campos frequentemente consultados
- Implementar cache para períodos e relatórios
- Paginar listagens de relatórios

### Segurança
- Validar permissões por período
- Verificar regras de negócio na alteração de status
- Registrar log de alterações importantes

## Próximos Passos

1. Revisar e aprovar schema do banco de dados
2. Iniciar desenvolvimento do backend
3. Desenvolver componentes frontend
4. Executar testes
5. Preparar documentação para usuários

## Tempo Total Estimado: 2-3 semanas 