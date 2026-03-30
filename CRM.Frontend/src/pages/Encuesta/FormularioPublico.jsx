import React, { useState, useEffect } from 'react'
import {
  Card, Form, Input, Radio, Checkbox, Select, DatePicker, Rate, Slider,
  Button, Typography, Spin, Alert, Result, Space, Divider
} from 'antd'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

export default function FormularioPublico() {
  const { token } = useParams()
  const [encuesta, setEncuesta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [respuestas, setRespuestas] = useState({})
  const [form] = Form.useForm()

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`/api/EncuestaPublica/formulario/${token}`)
        setEncuesta(res.data)
        const estado = res.data?.estado || res.data?.Estado
        if (estado === 'completada') {
          setSubmitted(true)
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          setError('Esta encuesta no existe o el enlace es inválido.')
        } else {
          setError('Error al cargar la encuesta. Intenta de nuevo más tarde.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [token])

  const handleAnswerChange = (preguntaId, value) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: value }))
  }

  const isVisible = (pregunta) => {
    const condPregId = pregunta.condicionPreguntaId || pregunta.CondicionPreguntaId
    const condVal = pregunta.condicionValor || pregunta.CondicionValor
    if (!condPregId) return true
    const currentVal = respuestas[condPregId]
    if (!currentVal) return false
    return String(currentVal).toLowerCase() === String(condVal).toLowerCase()
  }

  const handleSubmit = async () => {
    try {
      await form.validateFields()
    } catch {
      return
    }
    setSubmitting(true)
    try {
      const preguntas = encuesta?.preguntas || encuesta?.Preguntas || []
      const respuestasArr = preguntas
        .filter(p => isVisible(p))
        .map(p => {
          const pid = p.id || p.Id || p.tempId
          return {
            idPregunta: typeof pid === 'number' ? pid : undefined,
            preguntaId: pid,
            valor: respuestas[pid] !== undefined ? respuestas[pid] : null
          }
        })
      await axios.post(`/api/EncuestaPublica/responder/${token}`, {
        respuestas: respuestasArr
      })
      setSubmitted(true)
    } catch {
      setError('Error al enviar tus respuestas. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24 }}>
        <Alert message="Error" description={error} type="error" showIcon style={{ maxWidth: 500 }} />
      </div>
    )
  }

  const alreadyCompleted = encuesta?.estado === 'completada' || encuesta?.Estado === 'completada'
  if (alreadyCompleted || submitted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24, background: '#f5f5f5' }}>
        <Result
          status="success"
          title="¡Gracias!"
          subTitle="Tu respuesta ha sido registrada exitosamente."
          style={{ background: '#fff', borderRadius: 12, padding: 40, maxWidth: 500, width: '100%' }}
        />
      </div>
    )
  }

  const preguntas = encuesta?.preguntas || encuesta?.Preguntas || []
  const nombre = encuesta?.nombre || encuesta?.Nombre || 'Encuesta'
  const descripcion = encuesta?.descripcion || encuesta?.Descripcion || ''

  const renderQuestion = (pregunta, idx) => {
    if (!isVisible(pregunta)) return null

    const pid = pregunta.id || pregunta.Id || pregunta.tempId
    const tipo = pregunta.tipo || pregunta.Tipo
    const titulo = pregunta.titulo || pregunta.Titulo || `Pregunta ${idx + 1}`
    const desc = pregunta.descripcion || pregunta.Descripcion
    const obligatorio = pregunta.obligatorio || pregunta.Obligatorio || false
    const opciones = pregunta.opciones || pregunta.Opciones || []

    const rules = obligatorio ? [{ required: true, message: 'Esta pregunta es obligatoria' }] : []

    return (
      <Card key={pid || idx} style={{ marginBottom: 16 }} size="small">
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ fontSize: 15 }}>
            {idx + 1}. {titulo}
            {obligatorio && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
          </Text>
          {desc && <div><Text type="secondary" style={{ fontSize: 13 }}>{desc}</Text></div>}
        </div>

        <Form.Item name={`q_${pid}`} rules={rules}>
          {tipo === 'texto_corto' && (
            <Input
              placeholder="Tu respuesta..."
              onChange={e => handleAnswerChange(pid, e.target.value)}
            />
          )}
          {tipo === 'texto_largo' && (
            <Input.TextArea
              rows={3}
              placeholder="Tu respuesta..."
              onChange={e => handleAnswerChange(pid, e.target.value)}
            />
          )}
          {tipo === 'opcion_unica' && (
            <Radio.Group onChange={e => handleAnswerChange(pid, e.target.value)}>
              <Space direction="vertical">
                {opciones.map((op, i) => (
                  <Radio key={op.id || i} value={op.texto || op.Texto || op.valor || op.Valor || op}>
                    {op.texto || op.Texto || op.valor || op.Valor || op}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          )}
          {tipo === 'opcion_multiple' && (
            <Checkbox.Group onChange={vals => handleAnswerChange(pid, vals)}>
              <Space direction="vertical">
                {opciones.map((op, i) => (
                  <Checkbox key={op.id || i} value={op.texto || op.Texto || op.valor || op.Valor || op}>
                    {op.texto || op.Texto || op.valor || op.Valor || op}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          )}
          {tipo === 'escala' && (
            (() => {
              const max = pregunta.escalaMax || pregunta.EscalaMax || 5
              return max <= 5
                ? <Rate onChange={val => handleAnswerChange(pid, val)} />
                : (
                  <div>
                    <Slider
                      min={1}
                      max={10}
                      marks={{ 1: '1', 5: '5', 10: '10' }}
                      onChange={val => handleAnswerChange(pid, val)}
                    />
                  </div>
                )
            })()
          )}
          {tipo === 'fecha' && (
            <DatePicker
              style={{ width: '100%' }}
              onChange={(_, str) => handleAnswerChange(pid, str)}
            />
          )}
          {tipo === 'si_no' && (
            <Radio.Group onChange={e => handleAnswerChange(pid, e.target.value)}>
              <Radio.Button value="si">Sí</Radio.Button>
              <Radio.Button value="no">No</Radio.Button>
            </Radio.Group>
          )}
          {tipo === 'desplegable' && (
            <Select
              style={{ width: '100%' }}
              placeholder="Selecciona una opción"
              onChange={val => handleAnswerChange(pid, val)}
            >
              {opciones.map((op, i) => (
                <Option key={op.id || i} value={op.texto || op.Texto || op.valor || op.Valor || op}>
                  {op.texto || op.Texto || op.valor || op.Valor || op}
                </Option>
              ))}
            </Select>
          )}
        </Form.Item>
      </Card>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          borderRadius: '12px 12px 0 0',
          padding: '24px 28px',
          color: 'white'
        }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>{nombre}</Title>
          {descripcion && (
            <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0', fontSize: 14 }}>
              {descripcion}
            </Paragraph>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', padding: '24px 28px' }}>
          <Form form={form} layout="vertical">
            {preguntas.map((p, idx) => renderQuestion(p, idx))}

            {preguntas.length === 0 && (
              <Alert message="Esta encuesta no tiene preguntas disponibles." type="info" showIcon />
            )}

            {preguntas.length > 0 && (
              <>
                <Divider />
                <Button
                  type="primary"
                  block
                  size="large"
                  onClick={handleSubmit}
                  loading={submitting}
                  style={{ height: 48 }}
                >
                  Enviar Respuestas
                </Button>
              </>
            )}
          </Form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Powered by CRM WhatsApp</Text>
        </div>
      </div>
    </div>
  )
}
