import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, Space, theme } from 'antd'
import {
  DashboardOutlined, MessageOutlined, UserOutlined, BankOutlined,
  ProjectOutlined, CalendarOutlined, ShoppingOutlined, FileTextOutlined,
  SendOutlined, FormOutlined, BarChartOutlined, SettingOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, WifiOutlined,
  DisconnectOutlined
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
  '/chat': 'Chat',
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
  const [collapsed, setCollapsed] = useState(false)
  const [waStatus, setWaStatus] = useState(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { token: themeToken } = theme.useToken()

  const currentPath = '/' + location.pathname.split('/')[1]
  const pageTitle = PAGE_TITLES[currentPath] || 'CRM WhatsApp'

  useEffect(() => {
    // Carga inicial del estado
    api.get('/Configuracion/whatsapp_estado')
      .then(res => setWaStatus(res.data))
      .catch(() => setWaStatus(null))
  }, [])

  // SignalR: actualizar estado cuando WhatsApp se conecta o recibe QR
  useHubConnection('/hub-qr', {
    NuevoNumero: () => setWaStatus('conectado'),
    NuevoQr:    () => setWaStatus('iniciando')
  })

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/chat', icon: <MessageOutlined />, label: 'Chat' },
    { key: '/contactos', icon: <UserOutlined />, label: 'Contactos' },
    { key: '/empresas', icon: <BankOutlined />, label: 'Empresas' },
    { key: '/pipeline', icon: <ProjectOutlined />, label: 'Pipeline' },
    { key: '/actividades', icon: <CalendarOutlined />, label: 'Actividades' },
    { key: '/productos', icon: <ShoppingOutlined />, label: 'Productos' },
    { key: '/plantillas', icon: <FileTextOutlined />, label: 'Plantillas' },
    { key: '/campanas', icon: <SendOutlined />, label: 'Campañas' },
    { key: '/encuestas', icon: <FormOutlined />, label: 'Encuestas' },
    { key: '/reportes', icon: <BarChartOutlined />, label: 'Reportes' },
    { key: '/configuracion', icon: <SettingOutlined />, label: 'Configuración' }
  ]

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      onClick: () => {
        logout()
        navigate('/login')
      }
    }
  ]

  const isConnected = waStatus === 'conectado' || waStatus === true
    || waStatus?.valor === 'conectado' || waStatus?.Valor === 'conectado'
    || waStatus?.estado === 'conectado' || waStatus?.Estado === 'conectado'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        style={{ background: '#001529', overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          gap: 10,
          background: '#001529',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{
            width: 32, height: 32,
            background: '#25D366',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <MessageOutlined style={{ color: 'white', fontSize: 16 }} />
          </div>
          {!collapsed && (
            <Text strong style={{ color: 'white', fontSize: 16 }}>CRM WA</Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPath]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          height: 64
        }}>
          <Space>
            <span
              style={{ cursor: 'pointer', fontSize: 18 }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Text strong style={{ fontSize: 18 }}>{pageTitle}</Text>
          </Space>
          <Space size={16}>
            <Space size={6}>
              {isConnected
                ? <Badge status="success" text={<Text type="success" style={{ fontSize: 12 }}>WhatsApp Conectado</Text>} />
                : <Badge status="error" text={<Text type="danger" style={{ fontSize: 12 }}>WhatsApp Desconectado</Text>} />
              }
            </Space>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                style={{ background: themeToken.colorPrimary, cursor: 'pointer' }}
                size={36}
              >
                {user ? getInitials(`${user.nombres} ${user.apellidos}`) : 'U'}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
