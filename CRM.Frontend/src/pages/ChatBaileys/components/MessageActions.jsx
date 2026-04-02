import React, { useCallback, useState } from 'react'
import { Popover } from 'antd'
import { SmileOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import baileys from '../../../api/baileys'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

if (typeof document !== 'undefined' && !document.getElementById('msg-actions-css')) {
  const s = document.createElement('style')
  s.id = 'msg-actions-css'
  s.textContent = `
    .msg-row .msg-action-trigger { opacity: 0; transition: opacity 0.12s; }
    .msg-row:hover .msg-action-trigger { opacity: 1; }
    .msg-reaction-panel button:hover { background: #2a3942 !important; transform: scale(1.15); }
  `
  document.head.appendChild(s)
}

function ReactionPanel({ onReaction, starred, onStar }) {
  return (
    <div className="msg-reaction-panel" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 2 }}>
      {QUICK_REACTIONS.map(emoji => (
        <button key={emoji} type="button" onClick={() => onReaction(emoji)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 5px',
                   borderRadius: 6, lineHeight: 1, transition: 'all 0.1s' }}>
          {emoji}
        </button>
      ))}
      <div style={{ width: 1, height: 20, background: '#2a3942', margin: '0 2px' }} />
      <button type="button" onClick={onStar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 5px',
                 borderRadius: 6, color: starred ? '#f5c842' : '#8696a0', display: 'flex', alignItems: 'center',
                 transition: 'all 0.1s' }}>
        {starred ? <StarFilled /> : <StarOutlined />}
      </button>
    </div>
  )
}

/**
 * Wrapper transparente — NO modifica el layout del children.
 * Solo agrega la clase msg-row (para el hover CSS) y el botón de reacciones
 * posicionado absolutamente dentro del baileys-bubble del hijo.
 */
export default function MessageActions({ msg, numero, children }) {
  const isOut = !(msg.esEntrante ?? msg.EsEntrante ?? true)
  const whatsAppId = msg.whatsAppId || msg.WhatsAppId
  const msgId = msg.id || msg.Id
  const [starred, setStarred] = useState(false)
  const [open, setOpen] = useState(false)

  const handleReaction = useCallback((emoji) => {
    setOpen(false)
    baileys.sendReaction(numero, whatsAppId, emoji)
  }, [numero, whatsAppId])

  const handleStar = useCallback(() => {
    const next = !starred
    setStarred(next)
    setOpen(false)
    baileys.starMessage(numero, whatsAppId || msgId, next)
  }, [starred, numero, whatsAppId, msgId])

  return (
    <div className="msg-row" style={{ position: 'relative' }}>
      {children}
      {/* Botón flotante — se posiciona respecto al msg-row */}
      <Popover
        content={<ReactionPanel onReaction={handleReaction} starred={starred} onStar={handleStar} />}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement={isOut ? 'left' : 'right'}
        arrow={false}
        overlayStyle={{ zIndex: 1060 }}
        styles={{ body: { background: '#1f2c34', border: '1px solid #2a3942', padding: 4 } }}
      >
        <button type="button" className="msg-action-trigger"
          style={{
            position: 'absolute',
            top: 4,
            [isOut ? 'right' : 'left']: 4,
            background: '#1f2c34', border: '1px solid #2a3942', borderRadius: '50%',
            width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#8696a0', fontSize: 13,
            opacity: open ? 1 : undefined,
            zIndex: 5,
          }}>
          <SmileOutlined />
        </button>
      </Popover>
    </div>
  )
}
