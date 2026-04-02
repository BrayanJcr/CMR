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

/**
 * Formatea un número de WhatsApp crudo a formato legible.
 * Ej: "51939490460" → "+51 939 490 460"
 *
 * Soporta:
 *  - Perú (+51): CC 2 dígitos + 9 dígitos locales
 *  - Colombia (+57), México (+52), Argentina (+54), etc.
 *  - Fallback genérico para cualquier otro país
 */
export function formatPhoneNumber(raw) {
  if (!raw) return raw
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return raw

  // Reglas por código de país conocido (CC + largo esperado)
  const rules = [
    { cc: '51', local: 9 },  // Perú
    { cc: '57', local: 10 }, // Colombia
    { cc: '52', local: 10 }, // México
    { cc: '54', local: 10 }, // Argentina
    { cc: '55', local: 11 }, // Brasil
    { cc: '56', local: 9 },  // Chile
    { cc: '1',  local: 10 }, // EE.UU./Canadá
  ]

  for (const rule of rules) {
    if (digits.startsWith(rule.cc) && digits.length === rule.cc.length + rule.local) {
      const local  = digits.slice(rule.cc.length)
      // Agrupar en bloques de 3
      const groups = local.match(/.{1,3}/g) || [local]
      return `+${rule.cc} ${groups.join(' ')}`
    }
  }

  // Fallback genérico solo para números de hasta 13 dígitos (CC 1-3 + local)
  // Números de 14+ dígitos son JIDs de grupos o cuentas especiales — mostrar tal cual
  if (digits.length >= 10 && digits.length <= 13) {
    const cc     = digits.slice(0, 2)
    const local  = digits.slice(2)
    const groups = local.match(/.{1,3}/g) || [local]
    return `+${cc} ${groups.join(' ')}`
  }

  // Números muy largos (14+ dígitos): mostrar con + pero sin partir en CC falso
  if (digits.length >= 14) {
    return `+${digits}`
  }

  return raw
}
