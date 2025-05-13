/*
  # Add database functions

  1. Functions
    - Add helper functions for common operations
    - Add trigger functions for automated tasks
*/

-- Function to check if a user is a leader of a cell
CREATE OR REPLACE FUNCTION is_cell_leader(user_id uuid, cell_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM celulas
    WHERE id = cell_id 
    AND (lider_id = user_id OR colider_id = user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active members count for a cell
CREATE OR REPLACE FUNCTION get_active_members_count(cell_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM membros
    WHERE celula_id = cell_id
    AND ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate attendance percentage
CREATE OR REPLACE FUNCTION calculate_attendance_percentage(
  cell_id uuid,
  month integer,
  year integer
)
RETURNS numeric AS $$
DECLARE
  total_members integer;
  total_present integer;
BEGIN
  -- Get total active members
  SELECT COUNT(*) INTO total_members
  FROM membros
  WHERE celula_id = cell_id AND ativo = true;

  -- Get total present members
  SELECT COUNT(*) INTO total_present
  FROM presencas p
  JOIN relatorios r ON r.id = p.relatorio_id
  WHERE r.celula_id = cell_id
  AND r.mes = month
  AND r.ano = year
  AND (p.presenca_celula = true OR p.presenca_culto = true);

  -- Calculate percentage
  IF total_members > 0 THEN
    RETURN (total_present::numeric / total_members::numeric) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;