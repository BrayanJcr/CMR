export const PRIORIDAD_COLORS = {
  baja: '#52c41a',
  media: '#1677ff',
  alta: '#fa8c16',
  urgente: '#f5222d'
}

export const PRIORIDAD_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente'
}

export function getPrioridadColor(prioridad) {
  return PRIORIDAD_COLORS[prioridad?.toLowerCase()] || '#8c8c8c'
}

export function getPrioridadLabel(prioridad) {
  return PRIORIDAD_LABELS[prioridad?.toLowerCase()] || prioridad || 'Sin prioridad'
}
