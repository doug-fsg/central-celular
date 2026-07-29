import { computed, type Ref } from 'vue';
import { subWeeks, startOfWeek, endOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Semana completa (seg–dom). offset 0 = última semana fechada; -1 = anterior, etc. */
export function useDashboardWeek(weekOffset: Ref<number>) {
  const weekRange = computed(() => {
    const base = subWeeks(new Date(), 1 - weekOffset.value);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    const end = endOfWeek(base, { weekStartsOn: 1 });
    return { start, end };
  });

  const dataInicio = computed(() => weekRange.value.start.toISOString().slice(0, 10));
  const dataFim = computed(() => weekRange.value.end.toISOString().slice(0, 10));

  const weekLabel = computed(() => {
    const { start, end } = weekRange.value;
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${format(start, 'd', { locale: ptBR })}–${format(end, "d MMM yyyy", { locale: ptBR })}`;
    }
    return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
  });

  const canGoForward = computed(() => weekOffset.value < 0);

  function prevWeek() {
    weekOffset.value -= 1;
  }

  function nextWeek() {
    if (canGoForward.value) weekOffset.value += 1;
  }

  return { weekRange, dataInicio, dataFim, weekLabel, canGoForward, prevWeek, nextWeek };
}
