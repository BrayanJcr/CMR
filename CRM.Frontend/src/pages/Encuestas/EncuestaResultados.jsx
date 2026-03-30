import React, { useState, useEffect } from 'react'
import {
  Card, Row, Col, Statistic, Tabs, Table, Spin, Alert,
  Typography, Tag, Space, Button, Progress
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../../api/axios'
import { formatDateTime } from '../../utils/format'

const { Title, Text } = Typography

const COLORS = ['#25D366', '#1677ff', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#52c41a']

function QuestionResultCard({ pregunta, idx }) {
  const tipo = pregunta.tipo || pregunta.Tipo
  const titulo = pregunta.titulo || pregunta.Titulo || `Pregunta ${idx + 1}`
  const respuestas = pregunta.respuestas || pregunta.Respuestas || []

  if (['opcion_unica', 'desplegable'].includes(tipo)) {
    const counts = {}
    respuestas.forEach(r => {
      const val = r.valor || r.Valor || r.respuesta || r.Respuesta || 'Sin respuesta'
      counts[val] = (counts[val] || 0) + 1
    })
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }))
    return (
      <Card title={`${idx + 1}. ${titulo}`} size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={12}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Col>
          <Col xs={24} md={12}>
            {data.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Space size={6}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                  <Text style={{ fontSize: 13 }}>{item.name}</Text>
                </Space>
                <Text strong>{item.value} ({((item.value / respuestas.length) * 100).toFixed(0)}%)</Text>
              </div>
            ))}
          </Col>
        </Row>
      </Card>
    )
  }

  if (tipo === 'opcion_multiple') {
    const counts = {}
    respuestas.forEach(r => {
      const vals = r.valores || r.Valores || [r.valor || r.Valor || r.respuesta || r.Respuesta]
      const arr = Array.isArray(vals) ? vals : [vals]
      arr.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
    })
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }))
    return (
      <Card title={`${idx + 1}. ${titulo}`} size="small" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Bar dataKey="value" name="Respuestas" fill="#25D366" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    )
  }

  if (tipo === 'si_no') {
    let si = 0, no = 0
    respuestas.forEach(r => {
      const val = (r.valor || r.Valor || r.respuesta || r.Respuesta || '').toString().toLowerCase()
      if (val === 'si' || val === 'sí' || val === 'true' || val === '1') si++
      else no++
    })
    const data = [{ name: 'Sí', value: si }, { name: 'No', value: no }]
    return (
      <Card title={`${idx + 1}. ${titulo}`} size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={10}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label>
                  <Cell fill="#52c41a" />
                  <Cell fill="#ff4d4f" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Col>
          <Col xs={24} md={14}>
            <Statistic title="Sí" value={si} valueStyle={{ color: '#52c41a' }} />
            <Statistic title="No" value={no} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
        </Row>
      </Card>
    )
  }

  if (tipo === 'escala') {
    const counts = {}
    let total = 0, sum = 0
    respuestas.forEach(r => {
      const val = parseInt(r.valor || r.Valor || r.respuesta || r.Respuesta || 0)
      counts[val] = (counts[val] || 0) + 1
      sum += val
      total++
    })
    const avg = total > 0 ? (sum / total).toFixed(2) : 0
    const data = Object.entries(counts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([name, value]) => ({ name, value }))
    return (
      <Card title={`${idx + 1}. ${titulo}`} size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={16}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Respuestas" fill="#fa8c16" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <Statistic title="Promedio" value={avg} suffix={`/ ${data.length > 0 ? Math.max(...data.map(d => parseInt(d.name))) : 5}`} valueStyle={{ color: '#fa8c16', fontSize: 32 }} />
            <Text type="secondary">{total} respuestas</Text>
          </Col>
        </Row>
      </Card>
    )
  }

  return (
    <Card title={`${idx + 1}. ${titulo}`} size="small" style={{ marginBottom: 16 }}>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {respuestas.length === 0 ? (
          <Text type="secondary">Sin respuestas</Text>
        ) : (
          respuestas.slice(0, 20).map((r, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
              "{r.valor || r.Valor || r.respuesta || r.Respuesta || '-'}"
            </div>
          ))
        )}
        {respuestas.length > 20 && <Text type="secondary">... y {respuestas.length - 20} más</Text>}
      </div>
    </Card>
  )
}

export default function EncuestaResultados() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resultados, setResultados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/Encuesta/${id}/resultados`)
        setResultados(res.data)
      } catch {
        setError('Error al cargar resultados')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon />
  if (!resultados) return <Alert message="Sin resultados" type="info" showIcon />

  const enviadas = resultados.enviadas || resultados.Enviadas || 0
  const completadas = resultados.completadas || resultados.Completadas || 0
  const pendientes = enviadas - completadas
  const pctCompletacion = enviadas > 0 ? Math.round((completadas / enviadas) * 100) : 0
  const preguntas = resultados.preguntas || resultados.Preguntas || []
  const respuestasIndividuales = resultados.respuestasIndividuales || resultados.RespuestasIndividuales || []

  const individualColumns = [
    { title: 'Respondente', key: 'resp', render: (_, r) => r.nombreRespondente || r.NombreRespondente || r.contacto?.nombre || 'Anónimo' },
    { title: 'Fecha', key: 'fecha', render: (_, r) => formatDateTime(r.fechaRespuesta || r.FechaRespuesta) },
    { title: 'Estado', key: 'estado', render: (_, r) => <Tag color="green">{r.estado || r.Estado || 'Completada'}</Tag> }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/encuestas')}>
          Volver
        </Button>
      </div>

      <Title level={4} style={{ marginBottom: 16 }}>
        Resultados: {resultados.nombre || resultados.Nombre || 'Encuesta'}
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Enviadas" value={enviadas} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Completadas" value={completadas} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Pendientes" value={pendientes} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="% Completación"
              value={pctCompletacion}
              suffix="%"
              valueStyle={{ color: pctCompletacion >= 70 ? '#52c41a' : pctCompletacion >= 40 ? '#fa8c16' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'preguntas',
            label: 'Resultados por Pregunta',
            children: (
              <div>
                {preguntas.length === 0 ? (
                  <Alert message="No hay respuestas para mostrar" type="info" showIcon />
                ) : (
                  preguntas.map((p, idx) => (
                    <QuestionResultCard key={p.id || p.Id || idx} pregunta={p} idx={idx} />
                  ))
                )}
              </div>
            )
          },
          {
            key: 'individual',
            label: 'Respuestas Individuales',
            children: (
              <Table
                dataSource={respuestasIndividuales}
                columns={individualColumns}
                rowKey={r => r.id || r.Id}
                pagination={{ pageSize: 20 }}
                expandable={{
                  expandedRowRender: (record) => {
                    const respuestas = record.respuestas || record.Respuestas || []
                    return (
                      <div style={{ padding: '8px 16px' }}>
                        {respuestas.map((r, i) => (
                          <div key={i} style={{ marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {r.pregunta || r.Pregunta || `Pregunta ${i + 1}`}:
                            </Text>
                            <div style={{ fontWeight: 500 }}>
                              {r.valor || r.Valor || r.respuesta || r.Respuesta || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                }}
              />
            )
          }
        ]}
      />
    </div>
  )
}
