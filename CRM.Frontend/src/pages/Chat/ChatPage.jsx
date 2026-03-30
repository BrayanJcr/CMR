import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Input, Button, Typography, Spin, Empty, Avatar, Badge, Space, Divider, Tag } from 'antd'
import { SendOutlined, SearchOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatDateTime, formatDate, getInitials } from '../../utils/format'
import { message as antMsg } from 'antd'
import dayjs from 'dayjs'

const { Text, Title } = Typography

function ConversationItem({ conv, isActive, onClick }) {
  const name = conv.nombreContacto || conv.NombreContacto || conv.numeroCliente || conv.NumeroCliente || 'Desconocido'
  const lastMsg = conv.ultimoMensaje || conv.UltimoMensaje || ''
  const lastTime = conv.fechaUltimoMensaje || conv.FechaUltimoMensaje
  const unread = conv.mensajesNoLeidos || conv.MensajesNoLeidos || 0

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        background: isActive ? '#e6f7ff' : 'transparent',
        borderLeft: isActive ? '3px solid #25D366' : '3px solid transparent',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar style={{ background: '#25D366', flexShrink: 0 }} size={40}>
          {getInitials(name)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
              {lastTime ? dayjs(lastTime).format('HH:mm') : ''}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <Text type="secondary" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {lastMsg}
            </Text>
            {unread > 0 && (
              <Badge count={unread} size="small" style={{ background: '#25D366' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const direction = msg.direccion || msg.Direccion || msg.tipo || msg.Tipo
  const isIncoming = direction === 'entrante' || direction === 'in' || direction === 0
  const isNota = direction === 'nota' || msg.esNota || msg.EsNota
  const text = msg.mensaje || msg.Mensaje || msg.contenido || msg.Contenido || ''
  const time = msg.fechaEnvio || msg.FechaEnvio || msg.fecha || msg.Fecha

  let bubbleClass = 'msg-bubble '
  if (isNota) bubbleClass += 'msg-nota'
  else if (isIncoming) bubbleClass += 'msg-in'
  else bubbleClass += 'msg-out'

  return (
    <div className={bubbleClass}>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{text}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4, textAlign: 'right' }}>
        {time ? dayjs(time).format('HH:mm') : ''}
        {isNota && <Tag color="gold" style={{ marginLeft: 6, fontSize: 10 }}>Nota</Tag>}
      </div>
    </div>
  )
}

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
  const messagesEndRef = useRef(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.post('/Conversacion/ObtenerResumen', {
        NumeroCuenta: null,
        NumeroCliente: null
      })
      const data = Array.isArray(res.data) ? res.data : (res.data?.conversaciones || res.data?.data || [])
      setConversations(data)
    } catch {
      // silent poll error
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  const fetchMessages = useCallback(async (numero) => {
    if (!numero) return
    setLoadingMsgs(true)
    try {
      const res = await api.post('/Conversacion/ObtenerDetalle', {
        NumeroCuenta: activeNumber || null,
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
  }, [activeNumber])

  const fetchContactInfo = useCallback(async (numero) => {
    try {
      const res = await api.get(`/Contacto?busqueda=${encodeURIComponent(numero)}`)
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setContactInfo(data.length > 0 ? data[0] : null)
    } catch {
      setContactInfo(null)
    }
  }, [])

  const fetchActiveNumber = useCallback(async () => {
    try {
      const res = await api.get('/WhatsApp/obtenerNumero')
      setActiveNumber(res.data?.numero || res.data?.Numero || null)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchActiveNumber()
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [fetchConversations, fetchActiveNumber])

  useEffect(() => {
    if (id) {
      fetchMessages(id)
      fetchContactInfo(id)
      const interval = setInterval(() => fetchMessages(id), 3000)
      return () => clearInterval(interval)
    }
  }, [id, fetchMessages, fetchContactInfo])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !id) return
    setSendingMsg(true)
    try {
      await api.post('/WhatsApp/agendar', {
        NumeroRemitente: activeNumber,
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

  const filteredConvs = conversations.filter(c => {
    const name = c.nombreContacto || c.NombreContacto || c.numeroCliente || c.NumeroCliente || ''
    return name.toLowerCase().includes(searchText.toLowerCase())
  })

  const selectedConvKey = id
  const selectedConv = conversations.find(c =>
    (c.numeroCliente || c.NumeroCliente) === selectedConvKey
  )

  const contactName = contactInfo
    ? `${contactInfo.nombres || contactInfo.Nombres || ''} ${contactInfo.apellidos || contactInfo.Apellidos || ''}`.trim()
    : (selectedConv?.nombreContacto || selectedConv?.NombreContacto || id || '')

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      {/* Left panel - conversation list */}
      <div style={{ width: 300, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Buscar conversación..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            size="small"
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spin />
            </div>
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
                  isActive={key === selectedConvKey}
                  onClick={() => navigate(`/chat/${key}`)}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Middle panel - messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!id ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description="Selecciona una conversación" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#fafafa'
            }}>
              <Avatar style={{ background: '#25D366' }} size={38}>
                {getInitials(contactName)}
              </Avatar>
              <div>
                <Text strong>{contactName || id}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{id}</Text>
                </div>
              </div>
            </div>

            <div className="chat-messages" style={{ flex: 1 }}>
              {loadingMsgs && messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Spin />
                </div>
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

            <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onPressEnter={handleSend}
                placeholder="Escribe un mensaje..."
                style={{ flex: 1 }}
                disabled={sendingMsg}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sendingMsg}
                disabled={!newMessage.trim()}
              >
                Enviar
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Right panel - contact info */}
      {id && (
        <div style={{ width: 260, borderLeft: '1px solid #f0f0f0', padding: 16, overflowY: 'auto', background: '#fafafa' }}>
          <Title level={5} style={{ marginBottom: 16 }}>Información del Contacto</Title>
          {contactInfo ? (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Avatar style={{ background: '#25D366' }} size={60}>
                  {getInitials(contactName)}
                </Avatar>
                <div style={{ marginTop: 8 }}>
                  <Text strong>{contactName}</Text>
                </div>
                {(contactInfo.cargo || contactInfo.Cargo) && (
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{contactInfo.cargo || contactInfo.Cargo}</Text></div>
                )}
              </div>
              <Divider style={{ margin: '8px 0' }} />
              {(contactInfo.numeroWhatsApp || contactInfo.NumeroWhatsApp) && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>WhatsApp</Text>
                  <div><Text style={{ fontSize: 13 }}>{contactInfo.numeroWhatsApp || contactInfo.NumeroWhatsApp}</Text></div>
                </div>
              )}
              {(contactInfo.email || contactInfo.Email) && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Email</Text>
                  <div><Text style={{ fontSize: 13 }}>{contactInfo.email || contactInfo.Email}</Text></div>
                </div>
              )}
              {(contactInfo.empresa?.nombre || contactInfo.Empresa?.Nombre || contactInfo.nombreEmpresa) && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Empresa</Text>
                  <div><Text style={{ fontSize: 13 }}>{contactInfo.empresa?.nombre || contactInfo.Empresa?.Nombre || contactInfo.nombreEmpresa}</Text></div>
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
            </Space>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <UserOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">No hay contacto registrado</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{id}</Text>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
