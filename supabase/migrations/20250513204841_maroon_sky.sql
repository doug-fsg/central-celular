/*
  # Initial Schema Setup

  1. New Tables
    - `usuarios` - User accounts and authentication
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `senha` (text)
      - `nome` (text)
      - `cargo` (text)
      - `ativo` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `celulas` - Cell groups
      - `id` (uuid, primary key) 
      - `nome` (text)
      - `endereco` (text)
      - `dia_semana` (text)
      - `horario` (text)
      - `lider_id` (uuid, foreign key)
      - `colider_id` (uuid, foreign key)
      - `regiao_id` (uuid, foreign key)
      - `ativo` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `membros` - Cell members
      - `id` (uuid, primary key)
      - `celula_id` (uuid, foreign key)
      - `nome` (text)
      - `email` (text)
      - `telefone` (text)
      - `eh_consolidador` (boolean)
      - `data_cadastro` (timestamp)
      - `ativo` (boolean)
      - `observacoes` (text)

    - `regioes` - Regions
      - `id` (uuid, primary key)
      - `nome` (text)
      - `supervisor_id` (uuid, foreign key)
      - `ativo` (boolean)

    - `relatorios` - Reports
      - `id` (uuid, primary key)
      - `celula_id` (uuid, foreign key)
      - `mes` (integer)
      - `ano` (integer)
      - `data_envio` (timestamp)
      - `observacoes` (text)

    - `presencas` - Attendance records
      - `id` (uuid, primary key)
      - `relatorio_id` (uuid, foreign key)
      - `membro_id` (uuid, foreign key)
      - `presenca_celula` (boolean)
      - `presenca_culto` (boolean)
      - `semana` (integer)
      - `observacoes` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create tables
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  senha text NOT NULL,
  nome text NOT NULL,
  cargo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  supervisor_id uuid REFERENCES usuarios(id),
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS celulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text,
  dia_semana text NOT NULL,
  horario text NOT NULL,
  lider_id uuid NOT NULL REFERENCES usuarios(id),
  colider_id uuid REFERENCES usuarios(id),
  regiao_id uuid REFERENCES regioes(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  celula_id uuid NOT NULL REFERENCES celulas(id),
  nome text NOT NULL,
  email text,
  telefone text,
  eh_consolidador boolean NOT NULL DEFAULT false,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true,
  observacoes text
);

CREATE TABLE IF NOT EXISTS relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  celula_id uuid NOT NULL REFERENCES celulas(id),
  mes integer NOT NULL,
  ano integer NOT NULL,
  data_envio timestamptz,
  observacoes text,
  UNIQUE(celula_id, mes, ano)
);

CREATE TABLE IF NOT EXISTS presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES relatorios(id),
  membro_id uuid NOT NULL REFERENCES membros(id),
  presenca_celula boolean NOT NULL DEFAULT false,
  presenca_culto boolean NOT NULL DEFAULT false,
  semana integer NOT NULL,
  observacoes text,
  UNIQUE(relatorio_id, membro_id, semana)
);

-- Enable Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE regioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE celulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Usuários podem ver seus próprios dados"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Supervisores podem ver células de sua região"
  ON celulas
  FOR SELECT
  TO authenticated
  USING (
    regiao_id IN (
      SELECT id FROM regioes 
      WHERE supervisor_id = auth.uid()
    )
    OR lider_id = auth.uid()
    OR colider_id = auth.uid()
  );

CREATE POLICY "Líderes podem ver membros de suas células"
  ON membros
  FOR SELECT
  TO authenticated
  USING (
    celula_id IN (
      SELECT id FROM celulas 
      WHERE lider_id = auth.uid() 
      OR colider_id = auth.uid()
    )
  );

CREATE POLICY "Líderes podem ver relatórios de suas células"
  ON relatorios
  FOR SELECT
  TO authenticated
  USING (
    celula_id IN (
      SELECT id FROM celulas 
      WHERE lider_id = auth.uid() 
      OR colider_id = auth.uid()
    )
  );

CREATE POLICY "Líderes podem ver presenças de suas células"
  ON presencas
  FOR SELECT
  TO authenticated
  USING (
    relatorio_id IN (
      SELECT r.id FROM relatorios r
      JOIN celulas c ON c.id = r.celula_id
      WHERE c.lider_id = auth.uid() 
      OR c.colider_id = auth.uid()
    )
  );