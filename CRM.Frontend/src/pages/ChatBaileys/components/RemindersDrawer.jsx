import React, { useState, useEffect, useCallback } from 'react'
import { Drawer, Button, Input, DatePicker, Badge, Tooltip, Spin, Empty, Tag, App } from 'antd'
import {
  BellOutlined, CheckOutlined, DeleteOutlined,
  PlusOutlined, ClockCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../../api/axios'
import { formatPhoneNumber } from '../../../utils/format'

function ReminderItem({ rec, onComplete, onDelete }) {
  const [loading, setLoading] = useState(false)
  const fechaRec  = dayjs(rec.fechaRecordatorio || rec.FechaRecordatorio)
  const isVencido = rec.vencido || (!rec.completado && fechaRec.isBefore(dayjs()))
  const isHoy     = fechaRec.isSame(dayjs(), 'day')
  const nombre    = rec.nombreContacto || formatPhoneNumber(rec.numeroCliente) || rec.numeroCliente || '—'

  const timeLabel = isHoy
    ? fechaRec.format('HH:mm')
    : fechaRec.format('DD/MM HH:mm')

  const wrap = async (fn) => { setLoading(true); try { await fn() } finally { setLoading(false) } }

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 0',
      borderBottom: '1px solid #1f2d34', opacity: rec.completado ? 0.5 : 1,
    }}>
      {/* Indicador de urgencia */}
      <div style={{ paddingTop: 2, flexShrink: 0 }}>
        {isVencido ? (
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
        ) : isHoy ? (
          <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 14 }} />
        ) : (
          <BellOutlined style={{ color: '#8696a0', fontSize: 14 }} />
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e9edef', fontSize: 13, marginBottom: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {rec.texto || rec.Texto}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: isVencido ? '#ff4d4f' : isHoy ? '#fa8c16' : '#8696a0', fontSize: 11 }}>
            {timeLabel}
          </span>
          <span style={{ color: '#2a3942', fontSize: 11 }}>·</span>
          <span style={{ color: '#8696a0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nombre}
          </span>
          {isVencido && <Tag color="error" style={{ fontSize: 10, padding: '0 4px', marginLeft: 0 }}>Vencido</Tag>}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!rec.completado && (
          <Tooltip title="Marcar completado">
            <Button
              size="small" shape="circle" icon={<CheckOutlined />}
              loading={loading}
              onClick={() => wrap(() => onComplete(rec.id || rec.Id))}
              style={{ background: '#00a88422', border: '1px solid #00a88444', color: '#00a884' }}
            />
          </Tooltip>
        )}
        <Tooltip title="Eliminar">
          <Button
            size="small" shape="circle" icon={<DeleteOutlined />}
            loading={loading}
            onClick={() => wrap(() => onDelete(rec.id || rec.Id))}
            style={{ background: '#ff4d4f22', border: '1px solid #ff4d4f44', color: '#ff4d4f' }}
          />
        </Tooltip>
      </div>
    </div>
  )
}

export default function RemindersDrawer({ open, onClose, convId, convNombre }) {
  const { notification } = App.useApp()
  const [recordatorios, setRecordatorios] = useState([])
  const [loading,       setLoading]       = useState(false)
  const [tab,           setTab]           = useState('pendientes') // pendientes | completados
  const [showForm,      setShowForm]      = useState(false)
  const [texto,         setTexto]         = useState('')
  const [fecha,         setFecha]         = useState(null)
  const [saving,        setSaving]        = useState(false)

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const soloCompletos = tab === 'completados'
      const params        = new URLSearchParams({ soloCompletos })
      if (convId) params.set('idConversacion', convId)
      const r = await api.get(`/Recordatorio?${params}`)
      setRecordatorios(Array.isArray(r.data) ? r.data : [])
    } catch { setRecordatorios([]) }
    finally { setLoading(false) }
  }, [open, tab, convId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!texto.trim() || !fecha || !convId) return
    setSaving(true)
    try {
      await api.post('/Recordatorio', {
        idConversacion:   convId,
        texto:            texto.trim(),
        fechaRecordatorio: fecha.toISOString(),
      })
      setTexto('')
      setFecha(null)
      setShowForm(false)
      await load()
    } catch { notification.error({ message: 'No se pudo crear el recordatorio' }) }
    finally { setSaving(false) }
  }

  const handleComplete = async (id) => {
    await api.put(`/Recordatorio/${id}/completar`)
    setRecordatorios(prev => prev.filter(r => (r.id || r.Id) !== id))
  }

  const handleDelete = async (id) => {
    await api.delete(`/Recordatorio/${id}`)
    setRecordatorios(prev => prev.filter(r => (r.id || r.Id) !== id))
  }

  const pendientesVencidos = recordatorios.filter(r => r.vencido).length
  const title = convId
    ? `Recordatorios · ${convNombre || 'Conversación'}`
    : 'Todos los recordatorios'

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellOutlined style={{ color: '#fa8c16' }} />
          <span>{title}</span>
          {pendientesVencidos > 0 && (
            <Badge count={pendientesVencidos} style={{ background: '#ff4d4f' }} />
          )}
        </div>
      }
      open={open}
      onClose={onClose}
      width={360}
      styles={{
        header:  { background: '#202c33', borderBottom: '1px solid #2a3942', color: '#e9edef' },
        body:    { background: '#111b21', padding: '12px 16px' },
        wrapper: { background: '#111b21' },
      }}
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: '1px solid #1f2d34' }}>
        {['pendientes', 'completados'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t ? '#00a884' : '#8696a0',
              borderBottom: tab === t ? '2px solid #00a884' : '2px solid transparent',
              padding: '6px 12px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
              textTransform: 'capitalize', transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Formulario nuevo recordatorio */}
      {tab === 'pendientes' && convId && (
        <div style={{ marginBottom: 12 }}>
          {showForm ? (
            <div style={{ background: '#202c33', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input.TextArea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="¿Qué recordar? (ej: Llamar para hacer seguimiento)"
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6, fontSize: 13 }}
                autoFocus
              />
              <DatePicker
                showTime
                value={fecha}
                onChange={setFecha}
                placeholder="Fecha y hora del recordatorio"
                style={{ width: '100%', background: '#2a3942', border: '1px solid #3b4a54', borderRadius: 6, color: '#e9edef' }}
                disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                format="DD/MM/YYYY HH:mm"
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <Button
                  type="primary" size="small" loading={saving}
                  disabled={!texto.trim() || !fecha}
                  onClick={handleCreate}
                  style={{ background: '#00a884', border: 'none', flex: 1 }}
                >
                  Guardar recordatorio
                </Button>
                <Button size="small" onClick={() => setShowForm(false)}
                  style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              icon={<PlusOutlined />} size="small" block
              onClick={() => setShowForm(true)}
              style={{ background: '#2a3942', border: '1px dashed #3b4a54', color: '#8696a0', borderRadius: 8, height: 36 }}
            >
              Agregar recordatorio
            </Button>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin /></div>
      ) : recordatorios.length === 0 ? (
        <Empty description={<span style={{ color: '#8696a0', fontSize: 13 }}>
          {tab === 'pendientes' ? 'Sin recordatorios pendientes' : 'Sin recordatorios completados'}
        </span>} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 32 }} />
      ) : (
        <div>
          {recordatorios.map(r => (
            <ReminderItem
              key={r.id || r.Id}
              rec={r}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </Drawer>
  )
}
