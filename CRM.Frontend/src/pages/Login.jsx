import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Alert, Typography, Space, Spin, Divider } from 'antd'
import { UserOutlined, LockOutlined, MessageOutlined, UserAddOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const { Title, Text } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [checking, setChecking] = useState(true)
  const [hayUsuarios, setHayUsuarios] = useState(true)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()

  useEffect(() => {
    api.get('/Autenticacion/hay-usuarios')
      .then(res => setHayUsuarios(res.data === true))
      .catch(() => setHayUsuarios(true))
      .finally(() => setChecking(false))
  }, [])

  const handleLogin = async (values) => {
    setLoading(true)
    setError(null)
    try {
      await login(values.usuario, values.clave)
      navigate('/')
    } catch (err) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.titulo
        || err?.response?.data
        || 'Usuario o contraseña incorrectos'
      setError(typeof msg === 'string' ? msg : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleCrearAdmin = async (values) => {
    if (values.clave !== values.claveConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/Autenticacion/crear-primer-admin', {
        nombres: values.nombres,
        apellidoPaterno: values.apellidoPaterno,
        apellidoMaterno: values.apellidoMaterno || '',
        nombreUsuario: values.nombreUsuario,
        clave: values.clave,
        usuarioResponsable: 'sistema'
      })
      setSuccess('Administrador creado. Ya puedes iniciar sesión.')
      setHayUsuarios(true)
      registerForm.resetFields()
    } catch (err) {
      const msg = err?.response?.data?.message
        || err?.response?.data
        || 'Error al crear el administrador'
      setError(typeof msg === 'string' ? msg : 'Error al crear el administrador')
    } finally {
      setLoading(false)
    }
  }

  const cardContent = checking ? (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <Spin size="large" />
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">Verificando sistema...</Text>
      </div>
    </div>
  ) : !hayUsuarios ? (
    <>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, borderRadius: '50%',
          background: '#fff7e6', marginBottom: 8
        }}>
          <UserAddOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
        </div>
        <div>
          <Text strong style={{ fontSize: 15 }}>Configuración inicial</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 13 }}>
            No hay usuarios registrados. Crea el primer administrador.
          </Text>
        </div>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon closable
          onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      <Form form={registerForm} onFinish={handleCrearAdmin} layout="vertical" size="large">
        <Form.Item label="Nombres" name="nombres" rules={[{ required: true, message: 'Requerido' }]}>
          <Input placeholder="Tu nombre" />
        </Form.Item>
        <Form.Item label="Apellido Paterno" name="apellidoPaterno" rules={[{ required: true, message: 'Requerido' }]}>
          <Input placeholder="Apellido paterno" />
        </Form.Item>
        <Form.Item label="Apellido Materno" name="apellidoMaterno">
          <Input placeholder="Apellido materno (opcional)" />
        </Form.Item>
        <Form.Item label="Nombre de Usuario" name="nombreUsuario" rules={[{ required: true, message: 'Requerido' }]}>
          <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="usuario" />
        </Form.Item>
        <Form.Item label="Contraseña" name="clave" rules={[{ required: true, message: 'Requerido' }, { min: 6, message: 'Mínimo 6 caracteres' }]}>
          <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="Contraseña" />
        </Form.Item>
        <Form.Item label="Confirmar Contraseña" name="claveConfirm" rules={[{ required: true, message: 'Requerido' }]}>
          <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="Repite la contraseña" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={loading}
            style={{ height: 44, background: '#fa8c16', borderColor: '#fa8c16' }}>
            Crear Administrador
          </Button>
        </Form.Item>
      </Form>
    </>
  ) : (
    <>
      {success && (
        <Alert message={success} type="success" showIcon
          style={{ marginBottom: 20 }} />
      )}
      {error && (
        <Alert message={error} type="error" showIcon closable
          onClose={() => setError(null)} style={{ marginBottom: 20 }} />
      )}

      <Form form={loginForm} onFinish={handleLogin} layout="vertical" size="large">
        <Form.Item label="Usuario" name="usuario"
          rules={[{ required: true, message: 'Ingresa tu usuario' }]}>
          <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Nombre de usuario" autoComplete="username" />
        </Form.Item>
        <Form.Item label="Contraseña" name="clave"
          rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
          <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Contraseña" autoComplete="current-password" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={loading}
            style={{ height: 44 }}>
            Iniciar Sesión
          </Button>
        </Form.Item>
      </Form>
    </>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
    }}>
      <Card
        style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', borderRadius: 12 }}
        styles={{ body: { padding: 40 } }}
      >
        <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            background: '#25D366',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 8
          }}>
            <MessageOutlined style={{ fontSize: 32, color: 'white' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#25D366' }}>CRM WhatsApp</Title>
          <Text type="secondary">
            {checking ? ' ' : !hayUsuarios ? 'Primer acceso al sistema' : 'Inicia sesión para continuar'}
          </Text>
        </Space>

        {cardContent}
      </Card>
    </div>
  )
}
