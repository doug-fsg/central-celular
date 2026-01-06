---
name: Admin/Pastor com Célula - Implementação Completa
overview: Permitir que usuários ADMINISTRADOR e PASTOR possam ter células e alternar entre visão admin e visão de célula, com mudanças mínimas no código existente.
todos: []
---

# Implementação: Admin/Pastor com Célula e Alternância de Visão

## Objetivos

1. Permitir que ADMINISTRADOR e PASTOR apareçam como opções ao criar/editar células
2. Permitir que admins/pastores acessem funcionalidades de líder quando têm célula
3. Adicionar botão de alternância entre visão admin e visão célula
4. Ajustar navegação e guards do router para suportar ambas as visões

## Análise Técnica

### Backend

- **Status**: Não requer mudanças
- O backend já permite que qualquer usuário seja líder de célula (sem validação de cargo)
- O schema Prisma já suporta a relação `celulasLideradas` para qualquer `Usuario`

### Frontend - Mudanças Necessárias

#### 1. UserStore - Detecção de Célula e Estado de Visão

**Arquivo**: `src/stores/userStore.ts`

Adicionar:

- Computed `hasCell`: verifica se usuário tem célula (via `celulaId` ou busca de células)
- Computed `canToggleView`: verifica se é admin/pastor E tem célula
- Estado `currentView`: 'admin' | 'cell' (persistido no localStorage)
- Funções `toggleView()` e `setView()`
- Função `checkUserCell()`: busca células do usuário ao fazer login

**Mudanças mínimas**: Adicionar após linha 42, antes do return

#### 2. AdminCellsPage - Incluir Admins/Pastores na Lista

**Arquivo**: `src/views/admin/AdminCellsPage.vue`

Modificar `loadAvailableLeaders()` (linha 165-176):

- Incluir 'ADMINISTRADOR' e 'PASTOR' no array de cargos ao buscar usuários
- Remover filtro que exclui admins/pastores (linha 170)

**Mudança**: Uma linha no array de cargos + remover uma linha de filtro

#### 3. CellModal - Atualizar Texto Informativo

**Arquivo**: `src/components/CellModal.vue`

Modificar texto informativo (linha 237):

- De: "Somente líderes e supervisores disponíveis"
- Para: "Líderes, supervisores, administradores e pastores disponíveis"

**Mudança**: Apenas texto

#### 4. Navbar - Botão de Alternância e Navegação Dinâmica

**Arquivo**: `src/components/Navbar.vue`

Modificações:

- `navLinks` computed (linha 40-61): verificar `currentView` quando `canToggleView` é true
- Adicionar função `toggleView()` que alterna visão e navega
- Adicionar botão de alternância no template (após links, antes do menu de perfil)

**Mudanças**:

- Adicionar lógica condicional no computed existente
- Adicionar função simples
- Adicionar botão no template

#### 5. BottomNavbar - Botão de Alternância Mobile

**Arquivo**: `src/components/BottomNavbar.vue`

Modificações:

- `navItems` computed (linha 21-39): verificar `currentView` quando `canToggleView` é true
- Adicionar função `toggleView()`
- Adicionar botão flutuante de alternância (fixo no canto inferior direito)

**Mudanças**: Similar ao Navbar, adaptado para mobile

#### 6. Router - Ajustar Guards

**Arquivo**: `src/router/index.ts`

Modificações:

- Linha 201-203: Permitir acesso de admin/pastor com célula às rotas de líder quando `currentView === 'cell'`
- Linha 206-240: Ajustar verificação de onboarding para incluir admins/pastores com célula
- Linha 244-247: Considerar `currentView` ao redirecionar

**Mudanças**: Adicionar condições `&&` nas verificações existentes

#### 7. UserStore - Buscar Células ao Login

**Arquivo**: `src/stores/userStore.ts`

Modificar `login()` (linha 84-109):

- Após login bem-sucedido, se for admin/pastor, buscar células do usuário
- Atualizar `celulaId` no perfil se encontrar célula

**Mudança**: Adicionar chamada após linha 97

## Fluxo de Implementação

### Fase 1: Preparação (UserStore)

1. Adicionar estado e computed no userStore
2. Adicionar função para buscar células do usuário
3. Integrar busca de células no login

### Fase 2: Lista de Líderes

1. Modificar AdminCellsPage para incluir admins/pastores
2. Atualizar texto informativo no CellModal

### Fase 3: Navegação e Alternância

1. Modificar Navbar para suportar visão dinâmica
2. Modificar BottomNavbar para suportar visão dinâmica
3. Adicionar botões de alternância

### Fase 4: Router Guards

1. Ajustar guards para permitir acesso condicional
2. Ajustar lógica de onboarding

## Considerações de Produção

### Segurança

- Não expõe dados sensíveis
- Mantém todas as validações de autenticação existentes
- Apenas adiciona permissões, não remove

### Compatibilidade

- Não quebra funcionalidades existentes
- Mantém comportamento atual para usuários sem célula
- Retrocompatível com dados existentes

### Performance

- Busca de células apenas uma vez ao login (cache no userStore)
- Não adiciona chamadas de API desnecessárias
- Estado de visão persistido no localStorage

### UX

- Botão de alternância visível apenas quando relevante
- Transição suave entre visões
- Feedback visual claro da visão atual

## Arquivos a Modificar

1. `src/stores/userStore.ts` - Estado e lógica de detecção
2. `src/views/admin/AdminCellsPage.vue` - Lista de líderes
3. `src/components/CellModal.vue` - Texto informativo
4. `src/components/Navbar.vue` - Navegação desktop
5. `src/components/BottomNavbar.vue` - Navegação mobile
6. `src/router/index.ts` - Guards de rota

## Testes Necessários

1. Admin/pastor sem célula: deve funcionar como antes (só visão admin)
2. Admin/pastor com célula: deve poder alternar entre visões
3. Criar célula com admin/pastor como líder: deve funcionar
4. Acessar rotas de líder como admin/pastor: deve funcionar na visão célula
5. Persistência da visão escolhida: deve manter após refresh

## Rollback

Se necessário, reverter é simples:

- Remover estado `currentView` do userStore
- Reverter filtros de líderes
- Reverter guards do router
- Remover botões de alternância

Todas as mudanças são aditivas e não modificam lógica crítica existente.