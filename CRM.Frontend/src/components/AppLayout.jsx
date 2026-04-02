import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, Space, theme, Drawer } from 'antd'
import {
  DashboardOutlined, MessageOutlined, UserOutlined, BankOutlined,
  ProjectOutlined, CalendarOutlined, ShoppingOutlined, FileTextOutlined,
  SendOutlined, FormOutlined, BarChartOutlined, SettingOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, WifiOutlined,
  DisconnectOutlined, RobotOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { getInitials } from '../utils/format'
import useHubConnection from '../hooks/useHubConnection'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/chat-baileys': 'Chat Baileys',
  '/contactos': 'Contactos',
  '/empresas': 'Empresas',
  '/pipeline': 'Pipeline',
  '/actividades': 'Actividades',
  '/productos': 'Productos',
  '/plantillas': 'Plantillas',
  '/campanas': 'Campañas',
  '/encuestas': 'Encuestas',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración'
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed]         = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile]           = useState(false)
  const [baileysStatus, setBaileysStatus] = useState(null)
  const { user, logout }                  = useAuth()
  const navigate                          = useNavigate()
  const location                          = useLocation()
  const { token: themeToken }             = theme.useToken()

  const currentPath = '/' + location.pathname.split('/')[1]
  const pageTitle   = PAGE_TITLES[currentPath] || 'CRM WhatsApp'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    api.get('/WhatsApp/baileys/status')
      .then(res => setBaileysStatus(res.data?.estado ?? res.data?.Estado))
      .catch(() => setBaileysStatus('desconectado'))
  }, [])

  // Refrescar estado Baileys periódicamente (cada 30s)
  useEffect(() => {
    const t = setInterval(() => {
      api.get('/WhatsApp/baileys/status')
        .then(res => setBaileysStatus(res.data?.estado ?? res.data?.Estado))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const menuItems = [
    { key: '/',             icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/chat-baileys', icon: <RobotOutlined />,     label: 'Chat Baileys' },
    { key: '/contactos',    icon: <UserOutlined />,      label: 'Contactos' },
    { key: '/empresas',     icon: <BankOutlined />,      label: 'Empresas' },
    { key: '/pipeline',     icon: <ProjectOutlined />,   label: 'Pipeline' },
    { key: '/actividades',  icon: <CalendarOutlined />,  label: 'Actividades' },
    { key: '/productos',    icon: <ShoppingOutlined />,  label: 'Productos' },
    { key: '/plantillas',   icon: <FileTextOutlined />,  label: 'Plantillas' },
    { key: '/campanas',     icon: <SendOutlined />,      label: 'Campañas' },
    { key: '/encuestas',    icon: <FormOutlined />,      label: 'Encuestas' },
    { key: '/reportes',     icon: <BarChartOutlined />,  label: 'Reportes' },
    { key: '/configuracion',icon: <SettingOutlined />,   label: 'Configuración' }
  ]

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      onClick: () => { logout(); navigate('/login') }
    }
  ]

  const isBaileysConnected = baileysStatus === 'conectado'

  const handleMenuClick = ({ key }) => {
    navigate(key)
    if (isMobile) setMobileMenuOpen(false)
  }

  const siderLogo = (collapsed) => (
    <div style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'flex-start',
      padding: collapsed ? '0' : '0 20px',
      gap: 10,
      background: '#001529',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      flexShrink: 0
    }}>
      <div style={{
        width: 30, height: 30,
        background: '#25D366',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <MessageOutlined style={{ color: 'white', fontSize: 15 }} />
      </div>
      {!collapsed && (
        <Text strong style={{ color: 'white', fontSize: 15 }}>CRM WA</Text>
      )}
    </div>
  )

  const siderMenu = (collapsed = false) => (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[currentPath]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ marginTop: 4 }}
      inlineCollapsed={collapsed}
    />
  )

  const headerHeight = isMobile ? 52 : 60

  return (
    <Layout style={{ minHeight: '100vh' }}>

      {/* ── Desktop Sider ── */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={220}
          style={{
            background: '#001529',
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0, top: 0, bottom: 0,
            zIndex: 100
          }}
        >
          {siderLogo(collapsed)}
          {siderMenu(collapsed)}
        </Sider>
      )}

      {/* ── Mobile Drawer ── */}
      {isMobile && (
        <Drawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          placement="left"
          width={220}
          styles={{
            body: { padding: 0, background: '#001529', display: 'flex', flexDirection: 'column' },
            header: { display: 'none' },
            mask: { background: 'rgba(0,0,0,0.5)' }
          }}
          closable={false}
        >
          {siderLogo(false)}
          {siderMenu(false)}
        </Drawer>
      )}

      <Layout style={{
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 220),
        transition: 'margin-left 0.2s'
      }}>
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          background: '#fff',
          padding: isMobile ? '0 12px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          height: headerHeight,
          lineHeight: `${headerHeight}px`
        }}>
          <Space>
            <span
              style={{ cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              onClick={() => isMobile ? setMobileMenuOpen(true) : setCollapsed(!collapsed)}
            >
              {collapsed && !isMobile ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Text strong style={{ fontSize: isMobile ? 15 : 17 }}>{pageTitle}</Text>
          </Space>
          <Space size={isMobile ? 8 : 16}>
            {!isMobile && (
              <Space size={12}>
                <Badge status={isBaileysConnected ? 'success' : 'error'}
                  text={<Text style={{ fontSize: 12, color: isBaileysConnected ? '#52c41a' : '#ff4d4f' }}>
                    Baileys {isBaileysConnected ? '●' : '○'}
                  </Text>} />
              </Space>
            )}
            {isMobile && (
              <Space size={4}>
                <Badge status={isBaileysConnected ? 'success' : 'error'} />
              </Space>
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                style={{ background: themeToken.colorPrimary, cursor: 'pointer' }}
                size={isMobile ? 30 : 34}
              >
                {user ? getInitials(`${user.nombres} ${user.apellidos}`) : 'U'}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          padding: currentPath === '/chat-baileys' ? 0 : (isMobile ? 12 : 24),
          background: currentPath === '/chat-baileys' ? '#111b21' : '#f5f5f5',
          height: `calc(100vh - ${headerHeight}px)`,
          overflow: 'hidden'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
