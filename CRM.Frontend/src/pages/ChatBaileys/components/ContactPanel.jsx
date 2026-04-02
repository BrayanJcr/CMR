import React, { useState, useEffect, useCallback } from 'react'
import { Button, Input, Select, Tag, Tooltip, Spin, Form, Modal, message as antMsg } from 'antd'
import {
  UserOutlined, MailOutlined, BankOutlined, TagOutlined,
  EditOutlined, SaveOutlined, PlusOutlined, LinkOutlined,
  FileTextOutlined, CloseOutlined, CheckCircleOutlined,
  ClockCircleOutlined, StopOutlined, ExclamationCircleOutlined
} from '@ant-design/icons'
import api from '../../../api/axios'
import WaAvatar from '../../../components/WaAvatar'
import { formatPhoneNumber } from '../../../utils/format'

// ── Constantes de estado ────────────────────────────────────────────────────
const ESTADOS = [
  { value: 'abierta',     label: 'Abierta',      color: '#52c41a', icon: <ExclamationCircleOutlined /> },
  { value: 'en_progreso', label: 'En progreso',  color: '#1677ff', icon: <ClockCircleOutlined /> },
  { value: 'resuelta',    label: 'Resuelta',     color: '#8696a0', icon: <CheckCircleOutlined /> },
  { value: 'spam',        label: 'Spam',         color: '#ff4d4f', icon: <StopOutlined /> },
]

function EstadoBadge({ estado }) {
  const e = ESTADOS.find(x => x.value === estado) ?? ESTADOS[0]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: e.color + '22', color: e.color,
      border: `1px solid ${e.color}44`,
      borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600
    }}>
      {e.icon} {e.label}
    </span>
  )
}

// ── Sección colapsable ──────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #1f2d34' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
          color: '#8696a0', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}
      >
        {title}
        <span style={{ fontSize: 10, transition: 'transform .15s', transform: open ? 'rotate(0)' : 'rotate(-90deg)' }}>▼</span>
      </button>
      {open && <div style={{ padding: '0 16px 14px' }}>{children}</div>}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────
export default function ContactPanel({ conv, onEstadoChange, onNombreChange, onClose }) {
  const [contact,        setContact]        = useState(null)
  const [loadingContact, setLoadingContact] = useState(false)
  const [nota,           setNota]           = useState('')
  const [savingNota,     setSavingNota]     = useState(false)
  const [notaEditada,    setNotaEditada]    = useState(false)
  const [editingNombre,  setEditingNombre]  = useState(false)
  const [nombreTemp,     setNombreTemp]     = useState('')
  const [savingNombre,   setSavingNombre]   = useState(false)
  const [creandoContacto, setCreandoContacto] = useState(false)
  const [createForm] = Form.useForm()

  const convId  = conv?.id || conv?.Id
  const numero  = conv?.numeroCliente || conv?.NumeroCliente || ''
  const nombre  = conv?.nombreContacto || conv?.NombreContacto || ''
  const estado  = conv?.estadoConversacion || 'abierta'

  // Cargar info del contacto en CRM
  useEffect(() => {
    if (!numero) return
    setContact(null)
    setLoadingContact(true)
    api.get(`/Contacto/por-numero?numero=${encodeURIComponent(numero)}`)
      .then(r => setContact(r.data))
      .catch(() => setContact(null))
      .finally(() => setLoadingContact(false))
  }, [numero])

  // Sincronizar nota al cambiar conversación
  useEffect(() => {
    const n = conv?.nota || conv?.Nota || ''
    setNota(n)
    setNotaEditada(false)
  }, [convId])

  // ── Cambiar estado de conversación ────────────────────────────────────────
  const handleEstadoChange = async (nuevoEstado) => {
    try {
      await api.put(`/Conversacion/${convId}/estado`, { estado: nuevoEstado })
      onEstadoChange?.(convId, nuevoEstado)
    } catch {
      antMsg.error('No se pudo actualizar el estado')
    }
  }

  // ── Guardar nota ──────────────────────────────────────────────────────────
  const handleSaveNota = async () => {
    setSavingNota(true)
    try {
      await api.put(`/Conversacion/${convId}/nota`, { nota })
      setNotaEditada(false)
      antMsg.success('Nota guardada')
    } catch {
      antMsg.error('No se pudo guardar la nota')
    } finally {
      setSavingNota(false)
    }
  }

  // ── Editar nombre del contacto ────────────────────────────────────────────
  const startEditNombre = () => { setNombreTemp(nombre); setEditingNombre(true) }
  const cancelEditNombre = () => setEditingNombre(false)
  const saveNombre = async () => {
    if (!nombreTemp.trim()) return
    setSavingNombre(true)
    try {
      await api.put(`/Conversacion/${convId}/nombre`, { nombreContacto: nombreTemp.trim() })
      onNombreChange?.(convId, nombreTemp.trim())
      setEditingNombre(false)
    } catch {
      antMsg.error('No se pudo guardar el nombre')
    } finally {
      setSavingNombre(false)
    }
  }

  // ── Crear contacto en CRM ─────────────────────────────────────────────────
  const handleCrearContacto = async () => {
    try {
      const values = await createForm.validateFields()
      setCreandoContacto(true)
      const res = await api.post('/Contacto', {
        nombres:        values.nombres,
        apellidos:      values.apellidos || '',
        numeroWhatsApp: numero,
        email:          values.email || '',
        cargo:          values.cargo || '',
        notas:          values.notas || '',
      })
      setContact(res.data)
      antMsg.success('Contacto creado en CRM')
    } catch (err) {
      if (err?.errorFields) return
      antMsg.error('No se pudo crear el contacto')
    } finally {
      setCreandoContacto(false)
    }
  }

  // ── Nombre display ────────────────────────────────────────────────────────
  const displayName = nombre && nombre !== numero
    ? nombre
    : formatPhoneNumber(numero) || numero

  if (!conv) return null

  return (
    <div style={{
      width: 280, minWidth: 280, background: '#111b21', borderLeft: '1px solid #1f2d34',
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: '#202c33', borderBottom: '1px solid #2a3942', flexShrink: 0
      }}>
        <span style={{ color: '#e9edef', fontWeight: 600, fontSize: 14 }}>Información</span>
        <Button shape="circle" size="small" icon={<CloseOutlined />}
          style={{ background: 'transparent', border: 'none', color: '#8696a0' }}
          onClick={onClose} />
      </div>

      {/* ── Scroll body ── */}
      <div className="baileys-scroll" style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Avatar + nombre ── */}
        <div style={{ padding: '20px 16px 14px', textAlign: 'center', borderBottom: '1px solid #1f2d34' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <WaAvatar numero={numero} nombre={displayName} size={56} />
          </div>

          {editingNombre ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Input
                size="small"
                value={nombreTemp}
                onChange={e => setNombreTemp(e.target.value)}
                onPressEnter={saveNombre}
                autoFocus
                style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }}
              />
              <Button size="small" type="primary" icon={<SaveOutlined />}
                loading={savingNombre} onClick={saveNombre}
                style={{ background: '#00a884', border: 'none', flexShrink: 0 }} />
              <Button size="small" icon={<CloseOutlined />}
                onClick={cancelEditNombre}
                style={{ background: '#2a3942', border: 'none', color: '#8696a0', flexShrink: 0 }} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ color: '#e9edef', fontWeight: 600, fontSize: 15 }}>{displayName}</span>
              <Tooltip title="Editar nombre">
                <EditOutlined style={{ color: '#8696a0', cursor: 'pointer', fontSize: 13 }}
                  onClick={startEditNombre} />
              </Tooltip>
            </div>
          )}

          <div style={{ color: '#8696a0', fontSize: 12, marginTop: 4 }}>
            {formatPhoneNumber(numero) || numero}
          </div>
        </div>

        {/* ── Estado de conversación ── */}
        <Section title="Estado">
          <Select
            value={estado}
            onChange={handleEstadoChange}
            style={{ width: '100%' }}
            popupMatchSelectWidth={false}
            styles={{ popup: { root: { background: '#202c33' } } }}
            optionRender={(opt) => {
              const e = ESTADOS.find(x => x.value === opt.value) ?? ESTADOS[0]
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: e.color }}>
                  {e.icon} {e.label}
                </span>
              )
            }}
            labelRender={({ value }) => <EstadoBadge estado={value} />}
            options={ESTADOS.map(e => ({ value: e.value, label: e.label }))}
          />
        </Section>

        {/* ── Datos del contacto en CRM ── */}
        <Section title="Contacto CRM">
          {loadingContact ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <Spin size="small" />
            </div>
          ) : contact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contact.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MailOutlined style={{ color: '#8696a0', fontSize: 13, flexShrink: 0 }} />
                  <span style={{ color: '#e9edef', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contact.email}
                  </span>
                </div>
              )}
              {(contact.cargo || contact.empresa) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BankOutlined style={{ color: '#8696a0', fontSize: 13, flexShrink: 0 }} />
                  <span style={{ color: '#e9edef', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[contact.cargo, contact.empresa].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
              {contact.etiquetas?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <TagOutlined style={{ color: '#8696a0', fontSize: 13, flexShrink: 0, marginTop: 3 }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {contact.etiquetas.map((et, i) => (
                      <Tag key={i} style={{ background: (et.color || '#8696a0') + '22', color: et.color || '#8696a0', border: `1px solid ${et.color || '#8696a0'}44`, fontSize: 11 }}>
                        {et.nombre}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
              <Button
                size="small" icon={<LinkOutlined />}
                onClick={() => window.open(`/contactos`, '_blank')}
                style={{ background: '#2a3942', border: 'none', color: '#00a884', marginTop: 4 }}
              >
                Ver contacto completo
              </Button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#8696a0', fontSize: 12, marginBottom: 10 }}>
                No está registrado en el CRM
              </p>
              <Form form={createForm} layout="vertical" size="small">
                <Form.Item name="nombres" rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
                  <Input placeholder="Nombre *"
                    style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }} />
                </Form.Item>
                <Form.Item name="apellidos" style={{ marginBottom: 8 }}>
                  <Input placeholder="Apellido"
                    style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }} />
                </Form.Item>
                <Form.Item name="email" style={{ marginBottom: 8 }}>
                  <Input placeholder="Email"
                    style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }} />
                </Form.Item>
                <Form.Item name="cargo" style={{ marginBottom: 8 }}>
                  <Input placeholder="Cargo"
                    style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }} />
                </Form.Item>
              </Form>
              <Button
                type="primary" size="small" icon={<PlusOutlined />}
                loading={creandoContacto} onClick={handleCrearContacto} block
                style={{ background: '#00a884', border: 'none', marginTop: 4 }}
              >
                Guardar en CRM
              </Button>
            </div>
          )}
        </Section>

        {/* ── Nota interna ── */}
        <Section title="Nota interna">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input.TextArea
              value={nota}
              onChange={e => { setNota(e.target.value); setNotaEditada(true) }}
              placeholder="Notas del equipo sobre esta conversación..."
              autoSize={{ minRows: 3, maxRows: 8 }}
              style={{
                background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef',
                borderRadius: 6, resize: 'none', fontSize: 13
              }}
            />
            {notaEditada && (
              <Button
                size="small" icon={<SaveOutlined />}
                loading={savingNota} onClick={handleSaveNota}
                style={{ background: '#00a884', border: 'none', color: '#fff' }}
              >
                Guardar nota
              </Button>
            )}
          </div>
        </Section>

        {/* ── Acciones rápidas ── */}
        <Section title="Acciones rápidas" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Button size="small" icon={<FileTextOutlined />}
              style={{ background: '#2a3942', border: 'none', color: '#e9edef', textAlign: 'left', justifyContent: 'flex-start' }}
              onClick={() => window.open('/actividades', '_blank')}
            >
              Crear actividad
            </Button>
            <Button size="small" icon={<UserOutlined />}
              style={{ background: '#2a3942', border: 'none', color: '#e9edef', textAlign: 'left', justifyContent: 'flex-start' }}
              onClick={() => window.open('/pipeline', '_blank')}
            >
              Agregar al pipeline
            </Button>
          </div>
        </Section>

      </div>
    </div>
  )
}
