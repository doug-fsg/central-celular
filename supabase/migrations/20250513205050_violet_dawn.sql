/*
  # Add notifications and achievements tables

  1. New Tables
    - `notificacoes`: Store system notifications for users
    - `conquistas`: Store user achievements and badges
  
  2. Security
    - Enable RLS on new tables
    - Add policies for data access and modification
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  data_criacao timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS conquistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  tipo text NOT NULL,
  descricao text NOT NULL,
  data_conclusao timestamptz NOT NULL DEFAULT now(),
  mes integer NOT NULL,
  ano integer NOT NULL
);

-- Enable RLS
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conquistas ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Usuários podem ver suas próprias notificações"
  ON notificacoes
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem marcar suas notificações como lidas"
  ON notificacoes
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Achievement policies
CREATE POLICY "Usuários podem ver suas próprias conquistas"
  ON conquistas
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Add modification policies for existing tables
CREATE POLICY "Líderes podem criar e atualizar membros"
  ON membros
  FOR ALL
  TO authenticated
  USING (
    celula_id IN (
      SELECT id FROM celulas 
      WHERE lider_id = auth.uid() 
      OR colider_id = auth.uid()
    )
  )
  WITH CHECK (
    celula_id IN (
      SELECT id FROM celulas 
      WHERE lider_id = auth.uid() 
      OR colider_id = auth.uid()
    )
  );

CREATE POLICY "Líderes podem criar e atualizar relatórios"
  ON relatorios
  FOR ALL
  TO authenticated
  USING (
    celula_id IN (
      SELECT id FROM celulas 
      WHERE lider_id = auth.uid() 
      OR colider_id = auth.uid()
    )
  )
  WITH CHECK (
    celula_id IN (
      SELECT id FROM celulas 
      WHERE lider_id = auth.uid() 
      OR colider_id = auth.uid()
    )
  );

CREATE POLICY "Líderes podem registrar presenças"
  ON presencas
  FOR ALL
  TO authenticated
  USING (
    relatorio_id IN (
      SELECT r.id FROM relatorios r
      JOIN celulas c ON c.id = r.celula_id
      WHERE c.lider_id = auth.uid() 
      OR c.colider_id = auth.uid()
    )
  )
  WITH CHECK (
    relatorio_id IN (
      SELECT r.id FROM relatorios r
      JOIN celulas c ON c.id = r.celula_id
      WHERE c.lider_id = auth.uid() 
      OR c.colider_id = auth.uid()
    )
  );