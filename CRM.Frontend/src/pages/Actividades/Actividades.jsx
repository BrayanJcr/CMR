import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space,
  Typography, message, Alert, Spin, Radio, Badge, Tooltip, Popconfirm, Row, Col
} from 'antd'
import {
  PlusOutlined, PhoneOutlined, TeamOutlined, MailOutlined,
  CheckSquareOutlined, FileTextOutlined, CheckOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons'
import { Calendar } from 'antd'
import api from '../../api/axios'
import { formatDateTime, formatDate } from '../../utils/format'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const TIPO_ICONS = {
  llamada: <PhoneOutlined />,
  reunion: <TeamOutlined />,
  email: <MailOutlined />,
  tarea: <CheckSquareOutlined />,
  nota: <FileTextOutlined />
}

const TIPO_COLORS = {
  llamada: 'blue',
  reunion: 'purple',
  email: 'cyan',
  tarea: 'orange',
  nota: 'default'
}

const ESTADO_COLORS = {
  pendiente: 'orange',
  en_progreso: 'blue',
  completada: 'green',
  cancelada: 'red'
}

export default function Actividades() {
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('lista')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [fechaRange, setFechaRange] = useState(null)
  const [contactos, setContactos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [oportunidades, setOportunidades] = useState([])
  const [form] = Form.useForm()

  const fetchActividades = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let url = '/Actividad?'
      if (filtroTipo) url += `tipo=${filtroTipo}&`
      if (filtroEstado) url += `estado=${filtroEstado}&`
      if (fechaRange?.[0]) url += `fechaInicio=${fechaRange[0].toISOString()}&`
      if (fechaRange?.[1]) url += `fechaFin=${fechaRange[1].toISOString()}&`
      const res = await api.get(url)
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setActividades(data)
    } catch {
      setError('Error al cargar actividades')
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroEstado, fechaRange])

  const fetchSupport = useCallback(async () => {
    try {
      const [cRes, eRes, opRes] = await Promise.all([
        api.get('/Contacto'),
        api.get('/Empresa'),
        api.get('/Oportunidad')
      ])
      setContactos(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []))
      setEmpresas(Array.isArray(eRes.data) ? eRes.data : (eRes.data?.items || []))
      setOportunidades(Array.isArray(opRes.data) ? opRes.data : (opRes.data?.items || []))
    } catch {}
  }, [])

  useEffect(() => {
    fetchActividades()
  }, [fetchActividades])

  useEffect(() => {
    fetchSupport()
  }, [fetchSupport])

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingId(record.id || record.Id)
    form.setFieldsValue({
      tipo: record.tipo || record.Tipo || '',
      titulo: record.titulo || record.Titulo || '',
      descripcion: record.descripcion || record.Descripcion || '',
      fecha: (record.fecha || record.Fecha) ? dayjs(record.fecha || record.Fecha) : null,
      estado: record.estado || record.Estado || 'pendiente',
      idContacto: record.idContacto || record.IdContacto || null,
      idEmpresa: record.idEmpresa || record.IdEmpresa || null,
      idOportunidad: record.idOportunidad || record.IdOportunidad || null
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/Actividad/${id}`)
      message.success('Actividad eliminada')
      fetchActividades()
    } catch {
      message.error('Error al eliminar')
    }
  }

  const handleComplete = async (record) => {
    try {
      await api.put(`/Actividad/${record.id || record.Id}`, {
        ...record,
        estado: 'completada',
        fecha: record.fecha || record.Fecha
      })
      message.success('Actividad completada')
      fetchActividades()
    } catch {
      message.error('Error al actualizar')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const { estado, fecha, ...rest } = values
      const payload = {
        ...rest,
        estadoActividad: estado ?? 'pendiente',
        fechaActividad: fecha ? fecha.toISOString() : null
      }
      if (editingId) {
        await api.put(`/Actividad/${editingId}`, payload)
        message.success('Actividad actualizada')
      } else {
        await api.post('/Actividad', payload)
        message.success('Actividad creada')
      }
      setModalOpen(false)
      fetchActividades()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Tipo',
      key: 'tipo',
      width: 100,
      render: (_, r) => {
        const tipo = r.tipo || r.Tipo
        return (
          <Tag color={TIPO_COLORS[tipo] || 'default'} icon={TIPO_ICONS[tipo]}>
            {tipo || '-'}
          </Tag>
        )
      }
    },
    {
      title: 'Título',
      key: 'titulo',
      render: (_, r) => <strong>{r.titulo || r.Titulo || '-'}</strong>
    },
    {
      title: 'Fecha',
      key: 'fecha',
      render: (_, r) => formatDateTime(r.fecha || r.Fecha)
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, r) => {
        const e = r.estado || r.Estado
        return <Badge status={e === 'completada' ? 'success' : e === 'en_progreso' ? 'processing' : 'warning'} text={e || '-'} />
      }
    },
    {
      title: 'Relacionado con',
      key: 'relacion',
      render: (_, r) => {
        const c = r.contacto || r.Contacto
        const e = r.empresa || r.Empresa
        const o = r.oportunidad || r.Oportunidad
        if (c) return <Text style={{ fontSize: 12 }}>{`${c.nombres || c.Nombres || ''} ${c.apellidos || c.Apellidos || ''}`.trim()}</Text>
        if (e) return <Text style={{ fontSize: 12 }}>{e.nombre || e.Nombre}</Text>
        if (o) return <Text style={{ fontSize: 12 }}>{o.titulo || o.Titulo}</Text>
        return '-'
      }
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 140,
      render: (_, r) => {
        const id = r.id || r.Id
        const estado = r.estado || r.Estado
        return (
          <Space>
            {estado !== 'completada' && (
              <Tooltip title="Marcar completada">
                <Button size="small" icon={<CheckOutlined />} onClick={() => handleComplete(r)} style={{ color: '#52c41a', borderColor: '#52c41a' }} />
              </Tooltip>
            )}
            <Tooltip title="Editar">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
            <Popconfirm title="¿Eliminar?" onConfirm={() => handleDelete(id)} okText="Sí" cancelText="No">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  const getDateCellData = (date) => {
    return actividades.filter(a => {
      const fecha = a.fecha || a.Fecha
      return fecha && dayjs(fecha).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    })
  }

  const dateCellRender = (date) => {
    const acts = getDateCellData(date)
    return (
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {acts.slice(0, 3).map((a, i) => (
          <li key={i}>
            <Badge
              status={TIPO_COLORS[a.tipo || a.Tipo] === 'orange' ? 'warning' : 'processing'}
              text={<span style={{ fontSize: 11 }}>{a.titulo || a.Titulo}</span>}
            />
          </li>
        ))}
        {acts.length > 3 && <li><Text type="secondary" style={{ fontSize: 11 }}>+{acts.length - 3} más</Text></li>}
      </ul>
    )
  }

  if (error) return <Alert message={error} type="error" showIcon />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Actividades</Title>
        <Space>
          <Radio.Group value={view} onChange={e => setView(e.target.value)} buttonStyle="solid">
            <Radio.Button value="lista">Lista</Radio.Button>
            <Radio.Button value="calendario">Calendario</Radio.Button>
          </Radio.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nueva Actividad
          </Button>
        </Space>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            placeholder="Filtrar por tipo"
            allowClear
            style={{ width: 160 }}
            value={filtroTipo}
            onChange={setFiltroTipo}
          >
            <Option value="llamada">Llamada</Option>
            <Option value="reunion">Reunión</Option>
            <Option value="email">Email</Option>
            <Option value="tarea">Tarea</Option>
            <Option value="nota">Nota</Option>
          </Select>
        </Col>
        <Col>
          <Select
            placeholder="Filtrar por estado"
            allowClear
            style={{ width: 160 }}
            value={filtroEstado}
            onChange={setFiltroEstado}
          >
            <Option value="pendiente">Pendiente</Option>
            <Option value="en_progreso">En Progreso</Option>
            <Option value="completada">Completada</Option>
            <Option value="cancelada">Cancelada</Option>
          </Select>
        </Col>
        <Col>
          <RangePicker
            onChange={setFechaRange}
            placeholder={['Fecha inicio', 'Fecha fin']}
          />
        </Col>
      </Row>

      {view === 'lista' ? (
        <Table
          dataSource={actividades}
          columns={columns}
          rowKey={r => r.id || r.Id}
          loading={loading}
          pagination={{ pageSize: 20, showTotal: t => `Total: ${t}` }}
          size="middle"
        />
      ) : (
        <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
          {loading ? <Spin /> : (
            <Calendar cellRender={dateCellRender} />
          )}
        </div>
      )}

      <Modal
        title={editingId ? 'Editar Actividad' : 'Nueva Actividad'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Tipo" name="tipo" rules={[{ required: true }]}>
                <Select>
                  <Option value="llamada"><PhoneOutlined /> Llamada</Option>
                  <Option value="reunion"><TeamOutlined /> Reunión</Option>
                  <Option value="email"><MailOutlined /> Email</Option>
                  <Option value="tarea"><CheckSquareOutlined /> Tarea</Option>
                  <Option value="nota"><FileTextOutlined /> Nota</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Estado" name="estado" initialValue="pendiente">
                <Select>
                  <Option value="pendiente">Pendiente</Option>
                  <Option value="en_progreso">En Progreso</Option>
                  <Option value="completada">Completada</Option>
                  <Option value="cancelada">Cancelada</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Título" name="titulo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Fecha" name="fecha">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Contacto relacionado" name="idContacto">
            <Select showSearch optionFilterProp="children" allowClear>
              {contactos.map(c => {
                const n = `${c.nombres || c.Nombres || ''} ${c.apellidos || c.Apellidos || ''}`.trim()
                return <Option key={c.id || c.Id} value={c.id || c.Id}>{n}</Option>
              })}
            </Select>
          </Form.Item>
          <Form.Item label="Empresa relacionada" name="idEmpresa">
            <Select showSearch optionFilterProp="children" allowClear>
              {empresas.map(e => <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Oportunidad relacionada" name="idOportunidad">
            <Select showSearch optionFilterProp="children" allowClear>
              {oportunidades.map(o => <Option key={o.id || o.Id} value={o.id || o.Id}>{o.titulo || o.Titulo}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
