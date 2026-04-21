import React, { useState, useEffect, useCallback } from 'react'
import { Button, Input, Select, Tag, Tooltip, Spin, Form, Badge, Modal, DatePicker, InputNumber, message as antMsg } from 'antd'
import {
  UserOutlined, MailOutlined, BankOutlined, TagOutlined,
  EditOutlined, SaveOutlined, PlusOutlined, LinkOutlined,
  FileTextOutlined, CloseOutlined, CheckCircleOutlined,
  ClockCircleOutlined, StopOutlined, ExclamationCircleOutlined,
  TeamOutlined, BellOutlined, PhoneOutlined, TrophyOutlined,
  CalendarOutlined, DollarOutlined, FlagOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../../api/axios'
import WaAvatar from '../../../components/WaAvatar'
import { formatPhoneNumber } from '../../../utils/format'
import RemindersDrawer from './RemindersDrawer'

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
  const [agenteTemp,     setAgenteTemp]     = useState('')
  const [savingAgente,   setSavingAgente]   = useState(false)
  const [recordatoriosBadge, setRecordatoriosBadge] = useState(0)
  const [remindersOpen,  setRemindersOpen]  = useState(false)
  // Modales inline
  const [contactDetailOpen, setContactDetailOpen] = useState(false)
  const [actividadOpen,     setActividadOpen]      = useState(false)
  const [pipelineOpen,      setPipelineOpen]       = useState(false)
  const [savingActividad,   setSavingActividad]    = useState(false)
  const [savingPipeline,    setSavingPipeline]     = useState(false)
  const [etapas,            setEtapas]             = useState([])
  const [loadingEtapas,     setLoadingEtapas]      = useState(false)
  const [createForm]    = Form.useForm()
  const [actividadForm] = Form.useForm()
  const [pipelineForm]  = Form.useForm()

  const convId  = conv?.id || conv?.Id
  const numero  = conv?.numeroCliente || conv?.NumeroCliente || ''
  const nombre  = conv?.nombreContacto || conv?.NombreContacto || ''
  const estado  = conv?.estadoConversacion || 'abierta'
  const agente  = conv?.agenteAsignado    || conv?.AgenteAsignado || ''

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

  // Sincronizar nota y agente al cambiar conversación
  useEffect(() => {
    const n = conv?.nota || conv?.Nota || ''
    setNota(n)
    setNotaEditada(false)
    setAgenteTemp(conv?.agenteAsignado || conv?.AgenteAsignado || '')
  }, [convId])

  // Badge de recordatorios pendientes
  useEffect(() => {
    if (!convId) return
    api.get(`/Recordatorio?idConversacion=${convId}`)
      .then(r => setRecordatoriosBadge(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => setRecordatoriosBadge(0))
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

  // ── Cargar etapas del pipeline ───────────────────────────────────────────
  const openPipelineModal = async () => {
    pipelineForm.resetFields()
    pipelineForm.setFieldsValue({ prioridad: 'media', montoEstimado: 0 })
    if (!etapas.length) {
      setLoadingEtapas(true)
      try {
        const r = await api.get('/Pipeline')
        setEtapas(Array.isArray(r.data) ? r.data : (r.data?.etapas ?? []))
      } catch { setEtapas([]) }
      finally { setLoadingEtapas(false) }
    }
    setPipelineOpen(true)
  }

  // ── Crear actividad ──────────────────────────────────────────────────────
  const handleCrearActividad = async () => {
    try {
      const values = await actividadForm.validateFields()
      setSavingActividad(true)
      await api.post('/Actividad', {
        tipo:             values.tipo,
        titulo:           values.titulo,
        descripcion:      values.descripcion || '',
        fechaActividad:   values.fecha ? values.fecha.toISOString() : null,
        estadoActividad:  'pendiente',
        idContacto:       contact?.id || null,
      })
      antMsg.success('Actividad creada')
      actividadForm.resetFields()
      setActividadOpen(false)
    } catch (err) {
      if (err?.errorFields) return
      antMsg.error('No se pudo crear la actividad')
    } finally {
      setSavingActividad(false)
    }
  }

  // ── Crear oportunidad en pipeline ────────────────────────────────────────
  const handleCrearOportunidad = async () => {
    try {
      const values = await pipelineForm.validateFields()
      setSavingPipeline(true)
      await api.post('/Oportunidad', {
        titulo:          values.titulo,
        idEtapa:         values.idEtapa,
        montoEstimado:   values.montoEstimado || 0,
        prioridad:       values.prioridad,
        fechaCierre:     values.fechaCierre ? values.fechaCierre.toISOString() : null,
        notas:           values.notas || '',
        origen:          'whatsapp',
        idContacto:      contact?.id || null,
      })
      antMsg.success('Oportunidad agregada al pipeline')
      pipelineForm.resetFields()
      setPipelineOpen(false)
    } catch (err) {
      if (err?.errorFields) return
      antMsg.error('No se pudo crear la oportunidad')
    } finally {
      setSavingPipeline(false)
    }
  }

  // ── Guardar agente ────────────────────────────────────────────────────────
  const handleSaveAgente = async () => {
    setSavingAgente(true)
    try {
      await api.put(`/Conversacion/${convId}/agente`, { agenteAsignado: agenteTemp.trim() || null })
      antMsg.success(agenteTemp.trim() ? `Asignado a ${agenteTemp.trim()}` : 'Agente removido')
    } catch {
      antMsg.error('No se pudo actualizar el agente')
    } finally {
      setSavingAgente(false)
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
                size="small" icon={<InfoCircleOutlined />}
                onClick={() => setContactDetailOpen(true)}
                style={{ background: '#2a3942', border: 'none', color: '#00a884', marginTop: 4 }}
              >
                Ver detalle completo
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

        {/* ── Agente asignado ── */}
        <Section title="Agente asignado" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <TeamOutlined style={{ color: '#8696a0', fontSize: 13, flexShrink: 0 }} />
              <Input
                value={agenteTemp}
                onChange={e => setAgenteTemp(e.target.value)}
                onPressEnter={handleSaveAgente}
                placeholder="Nombre del agente..."
                style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6, flex: 1 }}
                size="small"
              />
            </div>
            {agenteTemp !== (agente || '') && (
              <Button
                size="small" icon={<SaveOutlined />}
                loading={savingAgente} onClick={handleSaveAgente}
                style={{ background: '#00a884', border: 'none', color: '#fff' }}
              >
                Guardar
              </Button>
            )}
            {agente && agenteTemp === agente && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#00a884', fontSize: 12 }}>Asignado a <strong>{agente}</strong></span>
                <Button
                  size="small" type="text"
                  onClick={() => { setAgenteTemp(''); setTimeout(handleSaveAgente, 0) }}
                  style={{ color: '#8696a0', fontSize: 11, padding: '0 4px', height: 20 }}
                >
                  Quitar
                </Button>
              </div>
            )}
          </div>
        </Section>

        {/* ── Recordatorios ── */}
        <Section title="Recordatorios" defaultOpen={false}>
          <Badge count={recordatoriosBadge} offset={[4, 0]}>
            <Button
              icon={<BellOutlined />}
              onClick={() => setRemindersOpen(true)}
              style={{ background: '#2a3942', border: 'none', color: recordatoriosBadge > 0 ? '#fa8c16' : '#8696a0', width: '100%', justifyContent: 'flex-start' }}
              size="small"
            >
              {recordatoriosBadge > 0
                ? `${recordatoriosBadge} recordatorio${recordatoriosBadge > 1 ? 's' : ''} pendiente${recordatoriosBadge > 1 ? 's' : ''}`
                : 'Ver / agregar recordatorios'}
            </Button>
          </Badge>
        </Section>

        {/* ── Acciones rápidas ── */}
        <Section title="Acciones rápidas" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Button size="small" icon={<FileTextOutlined />}
              style={{ background: '#2a3942', border: 'none', color: '#e9edef', textAlign: 'left', justifyContent: 'flex-start' }}
              onClick={() => { actividadForm.resetFields(); actividadForm.setFieldsValue({ tipo: 'llamada' }); setActividadOpen(true) }}
            >
              Crear actividad
            </Button>
            <Button size="small" icon={<TrophyOutlined />}
              style={{ background: '#2a3942', border: 'none', color: '#e9edef', textAlign: 'left', justifyContent: 'flex-start' }}
              onClick={openPipelineModal}
            >
              Agregar al pipeline
            </Button>
          </div>
        </Section>

      </div>

      <RemindersDrawer
        open={remindersOpen}
        onClose={() => { setRemindersOpen(false); api.get(`/Recordatorio?idConversacion=${convId}`).then(r => setRecordatoriosBadge(Array.isArray(r.data) ? r.data.length : 0)).catch(() => {}) }}
        convId={convId}
        convNombre={displayName}
      />

      {/* ── Modal: detalle completo del contacto ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#00a884' }} />
            <span>{contact ? `${contact.nombres || ''} ${contact.apellidos || ''}`.trim() : 'Contacto'}</span>
          </div>
        }
        open={contactDetailOpen}
        onCancel={() => setContactDetailOpen(false)}
        footer={null}
        width={480}
        styles={{ content: { background: '#1e2b33' }, header: { background: '#202c33', color: '#e9edef' }, body: { background: '#1e2b33' } }}
      >
        {contact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
            {[
              { icon: <PhoneOutlined />,    label: 'WhatsApp', value: formatPhoneNumber(contact.numeroWhatsApp) || contact.numeroWhatsApp },
              { icon: <MailOutlined />,     label: 'Email',    value: contact.email },
              { icon: <BankOutlined />,     label: 'Cargo',    value: [contact.cargo, contact.empresa].filter(Boolean).join(' · ') },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#8696a0', fontSize: 13, paddingTop: 1, width: 20, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
                <div>
                  <div style={{ color: '#8696a0', fontSize: 11, marginBottom: 2 }}>{row.label}</div>
                  <div style={{ color: '#e9edef', fontSize: 13 }}>{row.value}</div>
                </div>
              </div>
            ))}
            {contact.etiquetas?.length > 0 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#8696a0', fontSize: 13, paddingTop: 2, width: 20, textAlign: 'center', flexShrink: 0 }}><TagOutlined /></span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {contact.etiquetas.map((et, i) => (
                    <Tag key={i} style={{ background: (et.color || '#8696a0') + '22', color: et.color || '#8696a0', border: `1px solid ${et.color || '#8696a0'}44`, fontSize: 11 }}>
                      {et.nombre}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            {contact.notas && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#8696a0', fontSize: 13, paddingTop: 2, width: 20, textAlign: 'center', flexShrink: 0 }}><FileTextOutlined /></span>
                <div>
                  <div style={{ color: '#8696a0', fontSize: 11, marginBottom: 2 }}>Notas CRM</div>
                  <div style={{ color: '#e9edef', fontSize: 13, whiteSpace: 'pre-wrap' }}>{contact.notas}</div>
                </div>
              </div>
            )}
            <div style={{ color: '#8696a0', fontSize: 11, paddingTop: 4, borderTop: '1px solid #2a3942' }}>
              Registrado en CRM — contacto #{contact.id}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: crear actividad ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#00a884' }} />
            <span>Nueva actividad</span>
          </div>
        }
        open={actividadOpen}
        onCancel={() => setActividadOpen(false)}
        onOk={handleCrearActividad}
        okText="Crear actividad"
        okButtonProps={{ loading: savingActividad, style: { background: '#00a884', border: 'none' } }}
        cancelButtonProps={{ style: { background: '#2a3942', border: 'none', color: '#8696a0' } }}
        width={440}
        styles={{ content: { background: '#1e2b33' }, header: { background: '#202c33', color: '#e9edef' }, body: { background: '#1e2b33' } }}
        destroyOnHidden
      >
        <Form form={actividadForm} layout="vertical" size="small" style={{ marginTop: 12 }}>
          <Form.Item name="tipo" label={<span style={{ color: '#8696a0' }}>Tipo</span>} rules={[{ required: true }]} style={{ marginBottom: 12 }}>
            <Select
              options={[
                { value: 'llamada',  label: '📞 Llamada' },
                { value: 'reunion',  label: '🤝 Reunión' },
                { value: 'tarea',    label: '✅ Tarea' },
                { value: 'email',    label: '✉️ Email' },
              ]}
              style={{ background: '#2a3942' }}
            />
          </Form.Item>
          <Form.Item name="titulo" label={<span style={{ color: '#8696a0' }}>Título</span>} rules={[{ required: true, message: 'Ingresá un título' }]} style={{ marginBottom: 12 }}>
            <Input placeholder="Ej: Llamar para hacer seguimiento" style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="descripcion" label={<span style={{ color: '#8696a0' }}>Descripción</span>} style={{ marginBottom: 12 }}>
            <Input.TextArea rows={2} placeholder="Detalles adicionales..." style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="fecha" label={<span style={{ color: '#8696a0' }}>Fecha programada</span>} style={{ marginBottom: 4 }}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%', background: '#2a3942', border: '1px solid #3b4a54', borderRadius: 6, color: '#e9edef' }} />
          </Form.Item>
          {contact && (
            <div style={{ color: '#8696a0', fontSize: 11, marginTop: 8 }}>
              Asociada a: <span style={{ color: '#00a884' }}>{contact.nombres} {contact.apellidos || ''}</span>
            </div>
          )}
        </Form>
      </Modal>

      {/* ── Modal: agregar al pipeline ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrophyOutlined style={{ color: '#fa8c16' }} />
            <span>Nueva oportunidad en pipeline</span>
          </div>
        }
        open={pipelineOpen}
        onCancel={() => setPipelineOpen(false)}
        onOk={handleCrearOportunidad}
        okText="Agregar al pipeline"
        okButtonProps={{ loading: savingPipeline, style: { background: '#fa8c16', border: 'none' } }}
        cancelButtonProps={{ style: { background: '#2a3942', border: 'none', color: '#8696a0' } }}
        width={460}
        styles={{ content: { background: '#1e2b33' }, header: { background: '#202c33', color: '#e9edef' }, body: { background: '#1e2b33' } }}
        destroyOnHidden
      >
        <Form form={pipelineForm} layout="vertical" size="small" style={{ marginTop: 12 }}>
          <Form.Item name="titulo" label={<span style={{ color: '#8696a0' }}>Título de la oportunidad</span>} rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 12 }}>
            <Input
              placeholder="Ej: Venta servicio mensual"
              defaultValue={contact ? `${contact.nombres || ''} — ` : ''}
              style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }}
            />
          </Form.Item>
          <Form.Item name="idEtapa" label={<span style={{ color: '#8696a0' }}>Etapa del pipeline</span>} rules={[{ required: true, message: 'Elegí una etapa' }]} style={{ marginBottom: 12 }}>
            <Select
              loading={loadingEtapas}
              placeholder="Seleccionar etapa..."
              options={(etapas || []).map(e => ({
                value: e.id || e.Id,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color || e.Color || '#8696a0', display: 'inline-block', flexShrink: 0 }} />
                    {e.nombre || e.Nombre}
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Form.Item name="montoEstimado" label={<span style={{ color: '#8696a0' }}>Monto estimado</span>} style={{ marginBottom: 0 }}>
              <InputNumber
                min={0} style={{ width: '100%', background: '#2a3942', border: '1px solid #3b4a54', borderRadius: 6 }}
                prefix={<DollarOutlined style={{ color: '#8696a0' }} />}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
            <Form.Item name="prioridad" label={<span style={{ color: '#8696a0' }}>Prioridad</span>} style={{ marginBottom: 0 }}>
              <Select
                options={[
                  { value: 'alta',  label: <span style={{ color: '#ff4d4f' }}>🔴 Alta</span> },
                  { value: 'media', label: <span style={{ color: '#fa8c16' }}>🟡 Media</span> },
                  { value: 'baja',  label: <span style={{ color: '#52c41a' }}>🟢 Baja</span> },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="fechaCierre" label={<span style={{ color: '#8696a0' }}>Fecha de cierre estimada</span>} style={{ marginBottom: 12 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%', background: '#2a3942', border: '1px solid #3b4a54', borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="notas" label={<span style={{ color: '#8696a0' }}>Notas</span>} style={{ marginBottom: 4 }}>
            <Input.TextArea rows={2} placeholder="Contexto de la oportunidad..." style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef', borderRadius: 6 }} />
          </Form.Item>
          {contact && (
            <div style={{ color: '#8696a0', fontSize: 11, marginTop: 8 }}>
              Contacto: <span style={{ color: '#00a884' }}>{contact.nombres} {contact.apellidos || ''}</span>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}
