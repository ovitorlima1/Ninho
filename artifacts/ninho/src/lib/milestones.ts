import { type ServerMilestone } from "@/lib/api";

/**
 * O primeiro marco pendente, mesmo que a semana dele já tenha passado: pular
 * atrasados escondia justamente o que precisa de atenção.
 */
export function getNextMilestone(miles: ServerMilestone[], _week: number | null): ServerMilestone | undefined {
  return miles
    .filter((milestone) => !milestone.completed)
    .slice()
    .sort((first, second) => first.week - second.week)[0];
}
