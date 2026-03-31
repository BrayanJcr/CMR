import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Input, Button, Typography, Spin, Empty, Avatar, Badge, Space,
  Divider, Tag, Modal, Form, message as antMsg
} from 'antd'
import {
  SendOutlined, SearchOutlined, UserOutlined, PlusOutlined,
  FileOutlined, AudioOutlined, VideoCameraOutlined, PictureOutlined,
  DeleteOutlined, EditOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { getInitials } from '../../utils/format'
import useHubConnection from '../../hooks/useHubConnection'
import dayjs from 'dayjs'

const { Text, Title } = Typography

// ─── Icono según tipo de mensaje ────────────────────────────────────────────
function MediaIcon({ tipo, mimeType }) {
  const t = (tipo || '').toLowerCase()
  const m = (mimeType || '').toLowerCase()
  if (t === 'image' || m.startsWith('image')) return <PictureOutlined style={{ fontSize: 12, marginRight: 3 }} />
  if (t === 'audio' || t === 'ptt' || m.startsWith('audio')) return <AudioOutlined style={{ fontSize: 12, marginRight: 3 }} />
  if (t === 'video' || m.startsWith('video')) return <VideoCameraOutlined style={{ fontSize: 12, marginRight: 3 }} />
  if (t === 'document' || t === 'sticker') return <FileOutlined style={{ fontSize: 12, marginRight: 3 }} />
  return null
}

// ─── Checks de estado ────────────────────────────────────────────────────────
function CheckMark({ estado }) {
  if (!estado) return null
  const st = (estado || '').toLowerCase()
  if (st === 'enviando') return <span className="msg-check msg-check-sent">✓</span>
  if (st === 'enviado') return <span className="msg-check msg-check-sent">✓✓</span>
  if (st === 'leido') return <span className="msg-check msg-check-read">✓✓</span>
  if (st === 'error') return <span className="msg-check" style={{ color: '#ff4d4f', fontSize: 11 }}>!</span>
  return null
}

// ─── Ítem de conversación ────────────────────────────────────────────────────
function ConversationItem({ conv, isActive, onClick }) {
  const name = conv.nombreContacto || conv.NombreContacto || conv.numeroCliente || conv.NumeroCliente || 'Desconocido'
  const lastTime = conv.fechaUltimoMensaje || conv.FechaUltimoMensaje
  const unread = conv.mensajesNoLeidos || conv.MensajesNoLeidos || 0

  const timeLabel = lastTime
    ? (dayjs().isSame(dayjs(lastTime), 'day') ? dayjs(lastTime).format('HH:mm') : dayjs(lastTime).format('DD/MM'))
    : ''

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        background: isActive ? '#f0fdf4' : 'transparent',
        borderLeft: isActive ? '3px solid #25D366' : '3px solid transparent',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar style={{ background: '#25D366', flexShrink: 0 }} size={42}>
          {getInitials(name)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 145 }}>
              {name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, color: unread > 0 ? '#25D366' : undefined }}>
              {timeLabel}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <Text type="secondary" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 165 }}>
              {name !== (conv.numeroCliente || conv.NumeroCliente) ? (conv.numeroCliente || conv.NumeroCliente) : ''}
            </Text>
            {unread > 0 && (
              <Badge count={unread} size="small" style={{ background: '#25D366', flexShrink: 0 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Burbuja de mensaje ───────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  // El API devuelve IdMensajeEntrante (no null = entrante) o IdMensajeSaliente (no null = saliente)
  const isIncoming = msg.IdMensajeEntrante != null || msg.idMensajeEntrante != null
  const isNota = msg.esNota || msg.EsNota || false
  const isDeleted = msg.eliminado || msg.Eliminado || msg.fueEliminado || msg.FueEliminado || false
  const isEdited = msg.editado || msg.Editado || false
  const text = msg.Mensaje || msg.mensaje || msg.contenido || msg.Contenido || ''
  const time = msg.FechaEnvio || msg.fechaEnvio || msg.Fecha || msg.fecha
  const estado = msg.Error ? 'error' : (!isIncoming ? 'enviado' : '')
  const mimeType = msg.MimeType || msg.mimeType || ''
  const nombreArchivo = msg.NombreArchivo || msg.nombreArchivo || ''


  let bubbleClass = 'msg-bubble '
  if (isNota) bubbleClass += 'msg-nota'
  else if (isIncoming) bubbleClass += 'msg-in'
  else bubbleClass += 'msg-out'
  if (isDeleted) bubbleClass += ' msg-deleted'

  const renderContent = () => {
    if (isDeleted) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', fontSize: 13 }}>
          <DeleteOutlined style={{ fontSize: 12 }} />
          <span>Mensaje eliminado</span>
        </div>
      )
    }
    return (
      <>
        {(mimeType || nombreArchivo) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, color: '#666', fontSize: 12 }}>
            <MediaIcon tipo="" mimeType={mimeType} />
            <span>{nombreArchivo || mimeType}</span>
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{text}</div>
      </>
    )
  }

  return (
    <div className={bubbleClass}>
      {renderContent()}
      <div className="msg-meta">
        {isEdited && !isDeleted && <span style={{ fontSize: 10, color: '#aaa' }}>editado</span>}
        <span className="msg-time">{time ? dayjs(time).format('HH:mm') : ''}</span>
        {isNota && <Tag color="gold" style={{ marginLeft: 4, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>Nota</Tag>}
        {!isIncoming && !isNota && <CheckMark estado={estado} />}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [contactInfo, setContactInfo] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [activeNumber, setActiveNumber] = useState(null)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [contactForm] = Form.useForm()
  const messagesEndRef = useRef(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.post('/Conversacion/ObtenerResumen', { NumeroCuenta: null, NumeroCliente: null })
      const data = Array.isArray(res.data) ? res.data : (res.data?.conversaciones || res.data?.data || [])
      setConversations(data)
    } catch {
      // silent poll error
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  const activeNumberRef = useRef(null)
  useEffect(() => { activeNumberRef.current = activeNumber }, [activeNumber])

  const idRef = useRef(id)
  useEffect(() => { idRef.current = id }, [id])

  const fetchMessages = useCallback(async (numero) => {
    if (!numero) return
    try {
      const res = await api.post('/Conversacion/ObtenerDetalle', {
        NumeroCuenta: activeNumberRef.current || null,
        NumeroCliente: numero,
        FechaInicio: null,
        FechaFin: null
      })
      const data = Array.isArray(res.data) ? res.data : (res.data?.mensajes || res.data?.data || [])
      setMessages(data)
    } catch {
      // silent
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  const fetchContactInfo = useCallback(async (numero) => {
    try {
      const res = await api.get(`/Contacto?busqueda=${encodeURIComponent(numero)}`)
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || [])
      setContactInfo(data.length > 0 ? data[0] : null)
    } catch {
      setContactInfo(null)
    }
  }, [])

  const fetchActiveNumber = useCallback(async () => {
    try {
      const res = await api.get('/WhatsApp/obtenerNumero')
      const num = res.data?.numero || res.data?.Numero || null
      if (num) { setActiveNumber(num); return }
    } catch { }
    // Fallback: número guardado en BD
    try {
      const res = await api.get('/Configuracion/whatsapp_numero')
      const num = res.data?.valor || res.data?.Valor || null
      if (num) setActiveNumber(num)
    } catch { }
  }, [])

  useEffect(() => {
    fetchActiveNumber()
    fetchConversations()
    const interval = setInterval(fetchConversations, 20000)
    return () => clearInterval(interval)
  }, [fetchConversations, fetchActiveNumber])

  useEffect(() => {
    if (id) {
      setLoadingMsgs(true)
      fetchMessages(id)
      fetchContactInfo(id)
    }
  }, [id, fetchMessages, fetchContactInfo])

  // SignalR: tiempo real para mensajes y conversaciones
  useHubConnection('/hub-chat', {
    NuevoMensaje: (payloadStr) => {
      try {
        const data = JSON.parse(payloadStr)
        const numCliente = data.NumeroCliente || data.numeroCliente
        if (numCliente && numCliente === idRef.current) {
          fetchMessages(idRef.current)
        }
        fetchConversations()
      } catch { }
    }
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !id) return
    setSendingMsg(true)
    try {
      await api.post('/WhatsApp/agendar', {
        NumeroOrigen: activeNumber,
        NumeroDestino: id,
        Mensage: newMessage.trim()
      })
      setNewMessage('')
      await fetchMessages(id)
    } catch {
      antMsg.error('No se pudo enviar el mensaje')
    } finally {
      setSendingMsg(false)
    }
  }

  const handleSaveContact = async () => {
    try {
      const values = await contactForm.validateFields()
      setSavingContact(true)
      await api.post('/Contacto', {
        Nombres: values.nombres,
        Apellidos: values.apellidos || '',
        NumeroWhatsApp: values.numeroWhatsApp,
        Email: values.email || '',
        Cargo: values.cargo || ''
      })
      antMsg.success('Contacto guardado')
      setAddContactOpen(false)
      contactForm.resetFields()
      if (id) fetchContactInfo(id)
    } catch (err) {
      if (!err?.errorFields) antMsg.error('Error al guardar contacto')
    } finally {
      setSavingContact(false)
    }
  }

  const filteredConvs = conversations.filter(c => {
    const name = c.nombreContacto || c.NombreContacto || c.numeroCliente || c.NumeroCliente || ''
    return name.toLowerCase().includes(searchText.toLowerCase())
  })

  const selectedConv = conversations.find(c =>
    (c.numeroCliente || c.NumeroCliente) === id
  )

  const contactName = contactInfo
    ? `${contactInfo.nombres || contactInfo.Nombres || ''} ${contactInfo.apellidos || contactInfo.Apellidos || ''}`.trim()
    : (selectedConv?.nombreContacto || selectedConv?.NombreContacto || id || '')

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>

      {/* ── Panel izquierdo: lista de conversaciones ── */}
      <div style={{ width: 300, borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', background: '#f0fdf4' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            placeholder="Buscar conversación..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            size="small"
            allowClear
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Text type="secondary">Sin conversaciones</Text>
            </div>
          ) : (
            filteredConvs.map((conv, idx) => {
              const key = conv.numeroCliente || conv.NumeroCliente || idx
              return (
                <ConversationItem
                  key={key}
                  conv={conv}
                  isActive={key === id}
                  onClick={() => navigate(`/chat/${key}`)}
                />
              )
            })
          )}
        </div>
      </div>

      {/* ── Panel central: mensajes ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!id ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#efeae2' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#d9fdd3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <SendOutlined style={{ fontSize: 36, color: '#25D366' }} />
            </div>
            <Text type="secondary">Selecciona una conversación para chatear</Text>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', minHeight: 60 }}>
              <Avatar style={{ background: '#25D366', flexShrink: 0 }} size={40}>
                {getInitials(contactName)}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 15 }}>{contactName || id}</Text>
                <div><Text type="secondary" style={{ fontSize: 12 }}>{id}</Text></div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="chat-messages">
              {loadingMsgs && messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Text type="secondary">Sin mensajes</Text>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <MessageBubble key={msg.id || msg.Id || idx} msg={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de envío */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8, background: '#f0f2f5', alignItems: 'flex-end' }}>
              <Input.TextArea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter nueva línea)"
                autoSize={{ minRows: 1, maxRows: 5 }}
                style={{ flex: 1, borderRadius: 20, resize: 'none', padding: '8px 14px' }}
                disabled={sendingMsg}
              />
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sendingMsg}
                disabled={!newMessage.trim()}
                style={{ background: '#25D366', borderColor: '#25D366', flexShrink: 0, width: 40, height: 40 }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Panel derecho: info del contacto ── */}
      {id && (
        <div style={{ width: 260, borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <Title level={5} style={{ margin: 0 }}>Contacto</Title>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {contactInfo ? (
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <div style={{ textAlign: 'center', paddingBottom: 8 }}>
                  <Avatar style={{ background: '#25D366' }} size={64}>
                    {getInitials(contactName)}
                  </Avatar>
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 15 }}>{contactName}</Text>
                  </div>
                  {(contactInfo.cargo || contactInfo.Cargo) && (
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{contactInfo.cargo || contactInfo.Cargo}</Text></div>
                  )}
                </div>
                <Divider style={{ margin: '4px 0' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>WhatsApp</Text>
                  <div><Text style={{ fontSize: 13 }}>{contactInfo.numeroWhatsApp || contactInfo.NumeroWhatsApp || id}</Text></div>
                </div>
                {(contactInfo.email || contactInfo.Email) && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Email</Text>
                    <div><Text style={{ fontSize: 13 }}>{contactInfo.email || contactInfo.Email}</Text></div>
                  </div>
                )}
                {(contactInfo.empresa?.nombre || contactInfo.Empresa?.Nombre || contactInfo.nombreEmpresa || contactInfo.NombreEmpresa) && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Empresa</Text>
                    <div><Text style={{ fontSize: 13 }}>{contactInfo.empresa?.nombre || contactInfo.Empresa?.Nombre || contactInfo.nombreEmpresa || contactInfo.NombreEmpresa}</Text></div>
                  </div>
                )}
                {(contactInfo.etiquetas?.length > 0 || contactInfo.Etiquetas?.length > 0) && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Etiquetas</Text>
                    <div style={{ marginTop: 4 }}>
                      {(contactInfo.etiquetas || contactInfo.Etiquetas || []).map((et, i) => (
                        <Tag key={i} color={et.color || et.Color || 'blue'} style={{ marginBottom: 4 }}>
                          {et.nombre || et.Nombre || et}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                {(contactInfo.notas || contactInfo.Notas) && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Notas</Text>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2, background: '#fff', padding: '6px 8px', borderRadius: 6 }}>
                      {contactInfo.notas || contactInfo.Notas}
                    </div>
                  </div>
                )}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <UserOutlined style={{ fontSize: 28, color: '#bbb' }} />
                </div>
                <Text type="secondary" style={{ display: 'block' }}>Sin contacto registrado</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>{id}</Text>
              </div>
            )}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={() => {
                contactForm.setFieldsValue({ numeroWhatsApp: id })
                setAddContactOpen(true)
              }}
              style={{ background: '#25D366', borderColor: '#25D366' }}
            >
              {contactInfo ? 'Editar Contacto' : 'Agregar Contacto'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Modal agregar contacto ── */}
      <Modal
        title={contactInfo ? 'Editar Contacto' : 'Agregar Contacto'}
        open={addContactOpen}
        onOk={handleSaveContact}
        onCancel={() => { setAddContactOpen(false); contactForm.resetFields() }}
        confirmLoading={savingContact}
        okText="Guardar"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#25D366', borderColor: '#25D366' } }}
        destroyOnClose
      >
        <Form form={contactForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Nombres" name="nombres" rules={[{ required: true, message: 'Ingresa el nombre' }]}>
            <Input placeholder="Nombre del contacto" />
          </Form.Item>
          <Form.Item label="Apellidos" name="apellidos">
            <Input placeholder="Apellidos" />
          </Form.Item>
          <Form.Item label="Número WhatsApp" name="numeroWhatsApp" rules={[{ required: true }]}>
            <Input placeholder="51XXXXXXXXX" />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input placeholder="correo@ejemplo.com" />
          </Form.Item>
          <Form.Item label="Cargo" name="cargo">
            <Input placeholder="Ej: Gerente, Cliente, Proveedor..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
