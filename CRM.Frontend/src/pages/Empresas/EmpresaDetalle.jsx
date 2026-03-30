import React, { useState, useEffect } from 'react'
import {
  Card, Tabs, Button, Form, Input, Space, Spin, Alert,
  Typography, Table, message, Descriptions, Tag
} from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { getPrioridadColor, getPrioridadLabel } from '../../utils/prioridad'

const { Title } = Typography

export default function EmpresaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [empresa, setEmpresa] = useState(null)
  const [contactos, setContactos] = useState([])
  const [oportunidades, setOportunidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get(`/Empresa/${id}`)
        setEmpresa(res.data)
        try {
          const cRes = await api.get(`/Contacto?idEmpresa=${id}`)
          setContactos(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []))
        } catch {}
        try {
          const opRes = await api.get(`/Oportunidad?idEmpresa=${id}`)
          setOportunidades(Array.isArray(opRes.data) ? opRes.data : (opRes.data?.items || []))
        } catch {}
      } catch {
        setError('Error al cargar la empresa')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  useEffect(() => {
    if (empresa && editing) {
      form.setFieldsValue({
        nombre: empresa.nombre || empresa.Nombre || '',
        ruc: empresa.ruc || empresa.Ruc || empresa.RUC || '',
        sector: empresa.sector || empresa.Sector || '',
        tamano: empresa.tamano || empresa.Tamano || '',
        web: empresa.web || empresa.Web || '',
        direccion: empresa.direccion || empresa.Direccion || '',
        notas: empresa.notas || empresa.Notas || ''
      })
    }
  }, [editing, empresa, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const res = await api.put(`/Empresa/${id}`, values)
      setEmpresa(res.data || { ...empresa, ...values })
      message.success('Empresa actualizada')
      setEditing(false)
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon />
  if (!empresa) return <Alert message="Empresa no encontrada" type="warning" showIcon />

  const nombre = empresa.nombre || empresa.Nombre || 'Sin nombre'

  const contactColumns = [
    { title: 'Nombre', key: 'nombre', render: (_, r) => `${r.nombres || r.Nombres || ''} ${r.apellidos || r.Apellidos || ''}`.trim() || '-' },
    { title: 'WhatsApp', key: 'wa', render: (_, r) => r.numeroWhatsApp || r.NumeroWhatsApp || '-' },
    { title: 'Email', key: 'email', render: (_, r) => r.email || r.Email || '-' },
    { title: 'Cargo', key: 'cargo', render: (_, r) => r.cargo || r.Cargo || '-' },
    {
      title: '', key: 'acc',
      render: (_, r) => <Button size="small" onClick={() => navigate(`/contactos/${r.id || r.Id}`)}>Ver</Button>
    }
  ]

  const opColumns = [
    { title: 'Título', key: 'titulo', render: (_, r) => r.titulo || r.Titulo || '-' },
    { title: 'Etapa', key: 'etapa', render: (_, r) => r.etapa?.nombre || r.Etapa?.Nombre || '-' },
    { title: 'Monto', key: 'monto', render: (_, r) => `$${(r.monto || r.Monto || 0).toLocaleString()}` },
    {
      title: 'Prioridad', key: 'prioridad',
      render: (_, r) => {
        const p = r.prioridad || r.Prioridad
        return <Tag color={getPrioridadColor(p)}>{getPrioridadLabel(p)}</Tag>
      }
    },
    {
      title: '', key: 'acc',
      render: (_, r) => <Button size="small" onClick={() => navigate(`/oportunidades/${r.id || r.Id}`)}>Ver</Button>
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/empresas')} style={{ marginRight: 12 }}>
          Volver
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>{nombre}</Title>
            <Space>
              {(empresa.sector || empresa.Sector) && <Tag color="blue">{empresa.sector || empresa.Sector}</Tag>}
              {(empresa.tamano || empresa.Tamano) && <Tag>{empresa.tamano || empresa.Tamano}</Tag>}
            </Space>
          </div>
          <Space>
            {!editing
              ? <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>Editar</Button>
              : (
                <Space>
                  <Button onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button type="primary" onClick={handleSave} loading={saving}>Guardar</Button>
                </Space>
              )
            }
          </Space>
        </div>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'info',
              label: 'Información',
              children: editing ? (
                <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="RUC" name="ruc">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Sector" name="sector">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Tamaño" name="tamano">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Web" name="web">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Dirección" name="direccion">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Notas" name="notas">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Form>
              ) : (
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Nombre">{empresa.nombre || empresa.Nombre || '-'}</Descriptions.Item>
                  <Descriptions.Item label="RUC">{empresa.ruc || empresa.Ruc || empresa.RUC || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Sector">{empresa.sector || empresa.Sector || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Tamaño">{empresa.tamano || empresa.Tamano || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Web">{empresa.web || empresa.Web || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Dirección">{empresa.direccion || empresa.Direccion || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Notas" span={2}>{empresa.notas || empresa.Notas || '-'}</Descriptions.Item>
                </Descriptions>
              )
            },
            {
              key: 'contactos',
              label: `Contactos (${contactos.length})`,
              children: (
                <Table
                  dataSource={contactos}
                  columns={contactColumns}
                  rowKey={r => r.id || r.Id}
                  size="small"
                  pagination={false}
                />
              )
            },
            {
              key: 'oportunidades',
              label: `Oportunidades (${oportunidades.length})`,
              children: (
                <Table
                  dataSource={oportunidades}
                  columns={opColumns}
                  rowKey={r => r.id || r.Id}
                  size="small"
                  pagination={false}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}
