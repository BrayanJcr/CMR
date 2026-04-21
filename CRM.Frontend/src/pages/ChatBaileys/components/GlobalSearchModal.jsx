import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Modal, Input, Spin, Tag, Empty } from 'antd'
import {
  SearchOutlined, MessageOutlined, UserOutlined,
  CommentOutlined, LockOutlined, ArrowRightOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../../api/axios'
import { formatPhoneNumber } from '../../../utils/format'
import WaAvatar from '../../../components/WaAvatar'

const ESTADO_COLOR = { abierta: '#52c41a', en_progreso: '#1677ff', resuelta: '#8696a0', spam: '#ff4d4f' }

function ResultSection({ icon, title, count, children }) {
  if (!count) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 0 8px', color: '#8696a0',
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px',
        borderBottom: '1px solid #1f2d34', marginBottom: 6,
      }}>
        {icon}
        {title}
        <span style={{ marginLeft: 'auto', background: '#2a3942', borderRadius: 8, padding: '1px 6px', fontSize: 10 }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function ConvResult({ item, onSelect }) {
  const color = ESTADO_COLOR[item.estadoConversacion] || '#8696a0'
  return (
    <button
      onClick={() => onSelect(item)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 6px', background: 'none', border: 'none',
        cursor: 'pointer', borderRadius: 6, textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#2a3942'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <WaAvatar numero={item.numeroCliente} nombre={item.nombreContacto} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e9edef', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.nombreContacto}
        </div>
        <div style={{ color: '#8696a0', fontSize: 11 }}>{formatPhoneNumber(item.numeroCliente)}</div>
      </div>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {item.agenteAsignado && (
        <span style={{ color: '#8696a0', fontSize: 11, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.agenteAsignado}
        </span>
      )}
    </button>
  )
}

function ContactResult({ item }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 6 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: '#2a3942',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#8696a0', flexShrink: 0,
      }}>
        <UserOutlined style={{ fontSize: 14 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e9edef', fontSize: 13, fontWeight: 500 }}>{item.nombre}</div>
        <div style={{ color: '#8696a0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[formatPhoneNumber(item.numeroWhatsApp), item.email, item.cargo].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}

function MessageResult({ item, onSelect }) {
  const time = item.fechaEnvio ? dayjs(item.fechaEnvio).format('DD/MM HH:mm') : ''
  const isNota = item.tipo === 'nota'
  return (
    <button
      onClick={() => item.idConversacion && onSelect({ id: item.idConversacion, numeroCliente: item.numeroCliente, nombreContacto: item.nombreContacto, tipo: 'conversacion' })}
      disabled={!item.idConversacion}
      style={{
        width: '100%', display: 'flex', flexDirection: 'column', gap: 2,
        padding: '8px 6px', background: 'none', border: 'none',
        cursor: item.idConversacion ? 'pointer' : 'default',
        borderRadius: 6, textAlign: 'left', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (item.idConversacion) e.currentTarget.style.background = '#2a3942' }}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {isNota
          ? <LockOutlined style={{ color: '#c5b350', fontSize: 11 }} />
          : <CommentOutlined style={{ color: item.esEntrante ? '#00a884' : '#8696a0', fontSize: 11 }} />
        }
        <span style={{ color: isNota ? '#c5b350' : '#8696a0', fontSize: 11 }}>
          {isNota ? `Nota · ${item.usuario || ''}` : (item.esEntrante ? item.nombreContacto : 'Tú')}
        </span>
        <span style={{ marginLeft: 'auto', color: '#8696a0', fontSize: 10, flexShrink: 0 }}>{time}</span>
        {item.idConversacion && <ArrowRightOutlined style={{ color: '#8696a0', fontSize: 9, flexShrink: 0 }} />}
      </div>
      <span style={{
        color: '#e9edef', fontSize: 13,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', lineHeight: 1.4,
      }}>
        {item.cuerpo}
      </span>
      {item.nombreContacto && !isNota && (
        <span style={{ color: '#8696a0', fontSize: 11 }}>
          en conversación con {item.nombreContacto}
        </span>
      )}
    </button>
  )
}

export default function GlobalSearchModal({ open, onClose, onNavigate }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  useEffect(() => {
    if (open) { setQuery(''); setResults(null); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  const search = useCallback((q) => {
    if (!q || q.length < 2) { setResults(null); return }
    setLoading(true)
    api.get(`/Busqueda?q=${encodeURIComponent(q)}`)
      .then(r => setResults(r.data))
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 350)
  }

  const handleSelect = (conv) => {
    onNavigate?.(conv)
    onClose()
  }

  const hasResults = results && results.totalResultados > 0
  const noResults  = results && results.totalResultados === 0

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={520}
      styles={{
        content: { background: '#1e2b33', border: '1px solid #2a3942', borderRadius: 12, padding: 0 },
        body:    { padding: 0 },
        mask:    { backdropFilter: 'blur(4px)' },
      }}
    >
      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a3942' }}>
        {loading
          ? <Spin size="small" />
          : <SearchOutlined style={{ color: '#8696a0', fontSize: 16, flexShrink: 0 }} />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          placeholder="Buscar conversaciones, contactos, mensajes..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#e9edef', fontSize: 15, caretColor: '#00a884',
          }}
        />
        <kbd style={{ color: '#8696a0', fontSize: 11, border: '1px solid #2a3942', borderRadius: 4, padding: '1px 5px' }}>ESC</kbd>
      </div>

      {/* Results */}
      <div style={{ padding: '12px 16px', maxHeight: 440, overflowY: 'auto' }} className="baileys-scroll">
        {!query && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0', color: '#8696a0' }}>
            <span style={{ fontSize: 13 }}>Escribí para buscar en todo el CRM</span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Conversaciones · Contactos · Mensajes · Notas internas</span>
          </div>
        )}

        {noResults && (
          <Empty
            description={<span style={{ color: '#8696a0', fontSize: 13 }}>Sin resultados para "<strong>{query}</strong>"</span>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '24px 0' }}
          />
        )}

        {hasResults && (
          <>
            <ResultSection icon={<MessageOutlined />} title="Conversaciones" count={results.conversaciones?.length}>
              {results.conversaciones.map(item => (
                <ConvResult key={item.id} item={item} onSelect={handleSelect} />
              ))}
            </ResultSection>

            <ResultSection icon={<UserOutlined />} title="Contactos CRM" count={results.contactos?.length}>
              {results.contactos.map(item => (
                <ContactResult key={item.id} item={item} />
              ))}
            </ResultSection>

            <ResultSection icon={<CommentOutlined />} title="Mensajes" count={results.mensajes?.length}>
              {results.mensajes.map((item, i) => (
                <MessageResult key={`msg-${i}`} item={item} onSelect={handleSelect} />
              ))}
            </ResultSection>

            <ResultSection icon={<LockOutlined />} title="Notas internas" count={results.notas?.length}>
              {results.notas.map((item, i) => (
                <MessageResult key={`nota-${i}`} item={item} onSelect={handleSelect} />
              ))}
            </ResultSection>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid #1f2d34',
        display: 'flex', gap: 12, color: '#8696a0', fontSize: 11,
      }}>
        <span><kbd style={{ border: '1px solid #2a3942', borderRadius: 3, padding: '1px 4px' }}>↵</kbd> navegar</span>
        <span><kbd style={{ border: '1px solid #2a3942', borderRadius: 3, padding: '1px 4px' }}>ESC</kbd> cerrar</span>
        {results && <span style={{ marginLeft: 'auto' }}>{results.totalResultados} resultado{results.totalResultados !== 1 ? 's' : ''}</span>}
      </div>
    </Modal>
  )
}
