/** Limite de membros cuidados por um consolidador antes de alertar sobrecarga */
export const MAX_CUIDADOS_POR_CONSOLIDADOR = 8;

/** Percentual abaixo do qual a célula entra em alertas de baixa cobertura */
export const COBERTURA_BAIXA_PCT = 80;

/** Quantidade máxima de membros sem cuidador na lista de alertas (feed UI) */
export const LIMITE_FEED_MEMBROS = 15;

/** Máximo de itens exibidos por tipo de alerta no painel (cada seção) */
export const MAX_ALERTAS_POR_TIPO_UI = 5;

/** Cobertura percentual abaixo disso = semáforo crítico */
export const SEMAFORO_CRITICO_LT = 85;

/** Cobertura percentual abaixo disso (sem sobrecarga zero) = semáforo atenção; com sobrecarga também atenção até ok */
export const SEMAFORO_OK_GTE = 95;
