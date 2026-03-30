import dayjs from 'dayjs'

export function formatMoney(amount, currency = 'USD') {
  if (amount == null || isNaN(amount)) return '$0.00'
  const formatted = Number(amount).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `$${formatted} ${currency}`
}

export function formatDate(date) {
  if (!date) return ''
  return dayjs(date).format('DD/MM/YYYY')
}

export function formatDateTime(date) {
  if (!date) return ''
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
