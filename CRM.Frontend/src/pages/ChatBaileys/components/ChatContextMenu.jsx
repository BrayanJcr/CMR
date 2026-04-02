import React, { useState, useMemo } from 'react'
import { Dropdown, message, Popconfirm } from 'antd'
import {
  PushpinOutlined, PushpinFilled,
  InboxOutlined, BellOutlined,
  EyeOutlined, StopOutlined,
  CheckCircleOutlined, LoadingOutlined,
} from '@ant-design/icons'
import baileys from '../../../api/baileys'

export default function ChatContextMenu({ conversation, children, onActionComplete }) {
  const [loading, setLoading] = useState(false)

  const numero = conversation?.numeroCliente || conversation?.NumeroCliente || ''
  const isPinned = conversation?.fijado || conversation?.Fijado || false
  const isMuted = conversation?.silenciado || conversation?.Silenciado || false
  const isBlocked = conversation?.bloqueado || conversation?.Bloqueado || false

  const run = async (label, fn) => {
    setLoading(true)
    try {
      const res = await fn()
      message.success(`${label}: OK`)
      onActionComplete?.()
      return res
    } catch (err) {
      message.error(`${label}: ${err?.response?.data || err.message || 'Error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleValidateNumber = async () => {
    const res = await run('Validar número', () => baileys.validateNumber(numero))
    if (res?.data) {
      const d = res.data
      const valid = d.exists ?? d.isValid ?? d
      message.info(
        typeof valid === 'boolean'
          ? valid ? `${numero} es válido ✓` : `${numero} no es válido ✗`
          : JSON.stringify(d),
        5,
      )
    }
  }

  const items = useMemo(() => [
    {
      key: 'pin',
      icon: isPinned ? <PushpinFilled /> : <PushpinOutlined />,
      label: isPinned ? 'Desfijar' : 'Fijar',
      onClick: () => run(isPinned ? 'Desfijar' : 'Fijar', () => baileys.pinChat(numero, !isPinned)),
    },
    {
      key: 'archive',
      icon: <InboxOutlined />,
      label: 'Archivar',
      onClick: () => run('Archivar', () => baileys.archiveChat(numero)),
    },
    {
      key: 'mute',
      icon: <BellOutlined />,
      label: isMuted ? 'Desilenciar' : 'Silenciar 8h',
      onClick: () =>
        run(
          isMuted ? 'Desilenciar' : 'Silenciar 8h',
          () => baileys.muteChat(numero, isMuted ? null : 8 * 60 * 60 * 1000),
        ),
    },
    {
      key: 'seen',
      icon: <EyeOutlined />,
      label: 'Marcar como leído',
      onClick: () => run('Marcar como leído', () => baileys.markSeen(numero)),
    },
    {
      key: 'block',
      icon: <StopOutlined />,
      label: isBlocked ? 'Desbloquear' : 'Bloquear',
      danger: !isBlocked,
    },
    { type: 'divider' },
    {
      key: 'validate',
      icon: <CheckCircleOutlined />,
      label: 'Validar número',
      onClick: handleValidateNumber,
    },
  ], [isPinned, isMuted, isBlocked, numero])

  const handleMenuClick = ({ key }) => {
    if (key === 'block') return // handled by Popconfirm via dropdownRender
  }

  const dropdownRender = (menu) => (
    <div style={menuContainerStyle}>
      {React.cloneElement(menu, {
        style: { background: 'transparent', boxShadow: 'none' },
      })}
    </div>
  )

  // Wrap the block item with Popconfirm inside dropdownRender
  const enhancedItems = items.map((item) => {
    if (item.key !== 'block') return item
    return {
      ...item,
      label: (
        <Popconfirm
          title={isBlocked ? '¿Desbloquear este contacto?' : '¿Bloquear este contacto?'}
          onConfirm={() =>
            run(
              isBlocked ? 'Desbloquear' : 'Bloquear',
              () => isBlocked ? baileys.unblockContact(numero) : baileys.blockContact(numero),
            )
          }
          okText="Sí"
          cancelText="No"
          overlayStyle={{ zIndex: 1100 }}
        >
          <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
        </Popconfirm>
      ),
    }
  })

  return (
    <Dropdown
      menu={{ items: enhancedItems, onClick: handleMenuClick }}
      trigger={['contextMenu']}
      overlayStyle={{ minWidth: 180 }}
      overlayClassName="chat-context-menu"
      popupRender={dropdownRender}
      disabled={loading}
    >
      <div style={{ position: 'relative' }}>
        {loading && (
          <div style={loadingOverlayStyle}>
            <LoadingOutlined style={{ color: '#00a884', fontSize: 18 }} />
          </div>
        )}
        {children}
      </div>
    </Dropdown>
  )
}

// ── Styles ──

const menuContainerStyle = {
  background: '#233138',
  borderRadius: 8,
  padding: '4px 0',
  boxShadow: '0 8px 24px rgba(0,0,0,.45)',
}

const loadingOverlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(17,27,33,.6)',
  zIndex: 5,
  borderRadius: 4,
}

// Inject global overrides for WhatsApp dark theme on the context menu
const styleId = 'chat-context-menu-styles'
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .chat-context-menu .ant-dropdown-menu {
      background: transparent !important;
    }
    .chat-context-menu .ant-dropdown-menu-item {
      color: #d1d7db !important;
      font-size: 13px;
      padding: 8px 16px;
    }
    .chat-context-menu .ant-dropdown-menu-item:hover {
      background: #2a3942 !important;
    }
    .chat-context-menu .ant-dropdown-menu-item-danger {
      color: #f5222d !important;
    }
    .chat-context-menu .ant-dropdown-menu-item-divider {
      background: #2a3942 !important;
    }
    .chat-context-menu .ant-dropdown-menu-item .anticon {
      color: #8696a0;
      margin-right: 8px;
    }
    .chat-context-menu .ant-dropdown-menu-item:hover .anticon {
      color: #d1d7db;
    }
  `
  document.head.appendChild(style)
}
