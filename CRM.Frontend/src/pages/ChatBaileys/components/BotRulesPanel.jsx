import React, { useEffect, useState } from 'react'
import {
  Drawer, Table, Button, Modal, Form, Input, InputNumber, Switch, Tooltip,
  Space, Popconfirm, Alert, Tag, Select, Collapse,
  Typography, Tabs, Card, Row, Col, Badge, Divider, App
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined,
  RobotOutlined, UserOutlined, ThunderboltOutlined, ClockCircleOutlined,
  EnvironmentOutlined, PhoneOutlined, CalendarOutlined, MedicineBoxOutlined,
  FileTextOutlined, ExclamationCircleOutlined, SmileOutlined, StarOutlined,
  CheckOutlined
} from '@ant-design/icons'

const { Text, Paragraph } = Typography

// ── Tipos de acción ──────────────────────────────────────────────────────────
const TIPO_ACCIONES = [
  {
    value: 'respuesta_texto',
    label: 'Responder texto',
    color: 'blue',
    icon: <RobotOutlined />,
    desc: 'Envía el texto de respuesta al cliente.'
  },
  {
    value: 'redirigir_agente',
    label: 'Pasar a agente humano',
    color: 'orange',
    icon: <UserOutlined />,
    desc: 'Cambia el modo a "agente" y opcionalmente envía un aviso.'
  }
]

// ── Plantillas predefinidas ──────────────────────────────────────────────────
const PLANTILLAS = [
  // ── Saludos ─────────────────────────────────────────────────────────────
  {
    categoria: 'Saludos y bienvenida',
    icono: <SmileOutlined />,
    color: '#52c41a',
    reglas: [
      {
        nombre: 'Saludo inicial',
        patron: 'hola|buenos dias|buenas tardes|buenas noches|buen dia|buenas|saludos',
        respuesta: '¡Hola! 👋 Bienvenido/a. Soy el asistente virtual. ¿En qué te puedo ayudar hoy?',
        tipoAccion: 'respuesta_texto',
        prioridad: 10
      },
      {
        nombre: 'Respuesta a "gracias"',
        patron: 'gracias|muchas gracias|mil gracias|te agradezco|agradecido',
        respuesta: '¡Con mucho gusto! 😊 Si necesitás algo más, no dudes en escribirnos.',
        tipoAccion: 'respuesta_texto',
        prioridad: 20
      },
      {
        nombre: 'Despedida',
        patron: 'chau|adios|hasta luego|nos vemos|bye|hasta pronto',
        respuesta: '¡Hasta luego! Que tengas un excelente día. 👋',
        tipoAccion: 'respuesta_texto',
        prioridad: 20
      }
    ]
  },
  // ── Información ──────────────────────────────────────────────────────────
  {
    categoria: 'Información general',
    icono: <FileTextOutlined />,
    color: '#1677ff',
    reglas: [
      {
        nombre: 'Horarios de atención',
        patron: 'horario|horarios|que hora|a que hora|cuando atienden|dias de atencion|estan abiertos',
        respuesta: '🕐 Nuestro horario de atención es:\n• Lunes a Viernes: 8:00 am – 6:00 pm\n• Sábados: 8:00 am – 1:00 pm\n• Domingos y feriados: Cerrado\n\nSi tu consulta es urgente, escribinos y un agente te atenderá.',
        tipoAccion: 'respuesta_texto',
        prioridad: 30
      },
      {
        nombre: 'Dirección / ubicación',
        patron: 'donde estan|donde queda|direccion|dirección|ubicacion|como llegar|mapa|local',
        respuesta: '📍 Nos encontramos en: [COMPLETAR DIRECCIÓN]\n\nPodés ver cómo llegar en Google Maps: [COMPLETAR LINK]',
        tipoAccion: 'respuesta_texto',
        prioridad: 30
      },
      {
        nombre: 'Teléfono / contacto',
        patron: 'telefono|teléfono|numero de contacto|llamar|celular|whatsapp|contacto',
        respuesta: '📞 Podés contactarnos por:\n• WhatsApp: este mismo número\n• Teléfono: [COMPLETAR]\n• Email: [COMPLETAR]\n\n¿Preferís que un agente te llame?',
        tipoAccion: 'respuesta_texto',
        prioridad: 30
      },
      {
        nombre: 'Precios / tarifas',
        patron: 'precio|precios|costo|cuanto cuesta|cuánto cuesta|tarifa|tarifas|valor|cuanto sale',
        respuesta: 'Para información detallada de precios y tarifas, un agente te puede asesorar personalmente. ¿Querés que te contactemos?',
        tipoAccion: 'respuesta_texto',
        prioridad: 40
      }
    ]
  },
  // ── Citas ────────────────────────────────────────────────────────────────
  {
    categoria: 'Citas y turnos',
    icono: <CalendarOutlined />,
    color: '#722ed1',
    reglas: [
      {
        nombre: 'Solicitar cita / turno',
        patron: 'cita|turno|reservar|reserva|agendar|sacar turno|quiero una cita|necesito cita|consulta',
        respuesta: '📅 ¡Claro! Para agendar tu cita necesito algunos datos:\n\n1. ¿Con qué especialidad o doctor?\n2. ¿Qué fecha y horario preferís?\n3. Tu nombre completo y DNI/documento\n\nEnseguida te paso con un agente para confirmar.',
        tipoAccion: 'redirigir_agente',
        prioridad: 50
      },
      {
        nombre: 'Cancelar o reprogramar cita',
        patron: 'cancelar|cancelar cita|cancel|reprogramar|cambiar cita|cambiar turno|no puedo ir',
        respuesta: 'Entendido, te voy a pasar con un agente para gestionar la cancelación o cambio de tu cita.',
        tipoAccion: 'redirigir_agente',
        prioridad: 50
      },
      {
        nombre: 'Confirmar cita',
        patron: 'confirmar|confirmo|si voy|confirmacion|tengo cita',
        respuesta: '✅ ¡Perfecto! Tu cita queda confirmada. Si necesitás más información o tenés alguna pregunta, no dudes en escribirnos.',
        tipoAccion: 'respuesta_texto',
        prioridad: 50
      }
    ]
  },
  // ── Servicios médicos ─────────────────────────────────────────────────────
  {
    categoria: 'Servicios y trámites',
    icono: <MedicineBoxOutlined />,
    color: '#13c2c2',
    reglas: [
      {
        nombre: 'Resultados de exámenes',
        patron: 'resultado|resultados|examenes|análisis|analisis|laboratorio|examen de sangre|placa|radiografia',
        respuesta: '🔬 Para consultar resultados de exámenes, un agente te va a ayudar a acceder a tu historial. ¿Podés indicarnos tu nombre y DNI?',
        tipoAccion: 'redirigir_agente',
        prioridad: 60
      },
      {
        nombre: 'Servicios disponibles / especialidades',
        patron: 'servicio|servicios|especialidad|especialidades|que atienden|que ofrecen|doctores|medicos',
        respuesta: '🏥 Contamos con las siguientes especialidades:\n• [COMPLETAR ESPECIALIDAD 1]\n• [COMPLETAR ESPECIALIDAD 2]\n• [COMPLETAR ESPECIALIDAD 3]\n\n¿Necesitás información de alguna en particular?',
        tipoAccion: 'respuesta_texto',
        prioridad: 60
      },
      {
        nombre: 'Receta médica / medicamentos',
        patron: 'receta|medicamento|medicamentos|medicina|pastillas|prescripcion',
        respuesta: 'Para temas relacionados con recetas médicas, te voy a pasar con un profesional.',
        tipoAccion: 'redirigir_agente',
        prioridad: 60
      }
    ]
  },
  // ── Urgencias y derivación ────────────────────────────────────────────────
  {
    categoria: 'Urgencias y derivación',
    icono: <ExclamationCircleOutlined />,
    color: '#f5222d',
    reglas: [
      {
        nombre: 'Emergencia urgente',
        patron: 'emergencia|urgente|urgencia|ayuda|llamada de emergencia|es urgente|necesito ayuda ya',
        respuesta: '🚨 Entendemos que es urgente. Un agente te va a atender inmediatamente.',
        tipoAccion: 'redirigir_agente',
        prioridad: 1
      },
      {
        nombre: 'Hablar con persona / agente',
        patron: 'hablar con (una )?persona|agente|humano|atencion humana|quiero hablar|con alguien',
        respuesta: 'Claro, te paso con un agente ahora mismo. 👤',
        tipoAccion: 'redirigir_agente',
        prioridad: 5
      },
      {
        nombre: 'Queja o reclamo',
        patron: 'queja|reclamo|denuncia|mal servicio|insatisfecho|problema|molestia',
        respuesta: 'Lamentamos que hayas tenido una experiencia negativa. Un responsable te va a atender personalmente para resolver tu situación.',
        tipoAccion: 'redirigir_agente',
        prioridad: 15
      }
    ]
  }
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function TipoTag({ tipo }) {
  const info = TIPO_ACCIONES.find(t => t.value === tipo) || TIPO_ACCIONES[0]
  return <Tag color={info.color} icon={info.icon} style={{ fontSize: 11 }}>{info.label}</Tag>
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function BotRulesPanel({
  open, onClose, reglas, loading, saving,
  onLoad, onCreate, onUpdate, onDelete, onToggle,
  onGetModoGlobal, onActivarGlobal, onDesactivarGlobal
}) {
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editing,       setEditing]       = useState(null)
  const [adding,        setAdding]        = useState({})
  const [toggling,      setToggling]      = useState({})
  const [modoGlobal,    setModoGlobal]    = useState(null)   // { modoDefecto, totalConversaciones, conversacionesEnBot }
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const { message: antMsg }               = App.useApp()
  const [form]                            = Form.useForm()
  const tipoAccion                        = Form.useWatch('tipoAccion', form)

  useEffect(() => {
    if (open) {
      onLoad()
      onGetModoGlobal().then(setModoGlobal).catch(() => {})
    }
  }, [open])

  // IDs de patrones ya existentes para marcar plantillas instaladas
  const patronesExistentes = new Set(reglas.map(r => (r.patron || r.Patron || '').trim()))

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ tipoAccion: 'respuesta_texto', prioridad: 100, esActivo: true })
    setModalOpen(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    form.setFieldsValue({
      nombre:     r.nombre     || r.Nombre,
      patron:     r.patron     || r.Patron,
      respuesta:  r.respuesta  || r.Respuesta,
      tipoAccion: r.tipoAccion || r.TipoAccion || 'respuesta_texto',
      prioridad:  r.prioridad  ?? r.Prioridad ?? 100,
      esActivo:   r.esActivo   ?? r.EsActivo  ?? true
    })
    setModalOpen(true)
  }

  const openFromTemplate = (plantilla) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ ...plantilla, esActivo: true })
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(async vals => {
      try {
        if (editing) {
          await onUpdate(editing.id || editing.Id, vals)
          antMsg.success('Regla actualizada')
        } else {
          await onCreate(vals)
          antMsg.success('Regla creada')
        }
        setModalOpen(false)
      } catch {
        antMsg.error('Error al guardar la regla')
      }
    })
  }

  const handleToggleGlobal = async (activar) => {
    setLoadingGlobal(true)
    try {
      if (activar) {
        await onActivarGlobal()
        antMsg.success('Bot activado en todas las conversaciones')
      } else {
        await onDesactivarGlobal()
        antMsg.success('Bot desactivado en todas las conversaciones')
      }
      const nuevo = await onGetModoGlobal()
      setModoGlobal(nuevo)
    } catch {
      antMsg.error('Error al cambiar el modo global')
    } finally {
      setLoadingGlobal(false)
    }
  }

  const handleAddTemplate = async (plantilla) => {
    const key = plantilla.patron
    setAdding(prev => ({ ...prev, [key]: true }))
    try {
      await onCreate({ ...plantilla, esActivo: true })
      antMsg.success(`Regla "${plantilla.nombre}" agregada`)
    } catch {
      antMsg.error('Error al agregar la plantilla')
    } finally {
      setAdding(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleToggle = async (r) => {
    const id = r.id || r.Id
    if (toggling[id]) return
    setToggling(prev => ({ ...prev, [id]: true }))
    try {
      await onToggle(id)
    } catch {
      antMsg.error('Error al cambiar estado')
    } finally {
      setToggling(prev => ({ ...prev, [id]: false }))
    }
  }

  // ── Columnas de la tabla ──────────────────────────────────────────────────
  const columns = [
    {
      title: 'Nombre', dataIndex: 'nombre', key: 'nombre',
      render: (v, r) => <Text strong style={{ fontSize: 13 }}>{v || r.Nombre}</Text>
    },
    {
      title: 'Patrón', dataIndex: 'patron', key: 'patron',
      render: (v, r) => (
        <Tooltip title="Palabras clave que disparan esta regla">
          <code style={{ fontSize: 11, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v || r.Patron}
          </code>
        </Tooltip>
      )
    },
    {
      title: 'Acción', dataIndex: 'tipoAccion', key: 'tipoAccion', width: 170,
      render: (v, r) => <TipoTag tipo={v || r.TipoAccion} />
    },
    {
      title: 'Prior.', dataIndex: 'prioridad', key: 'prioridad', width: 55,
      render: (v, r) => <Text type="secondary" style={{ fontSize: 12 }}>{v ?? r.Prioridad}</Text>
    },
    {
      title: 'On', dataIndex: 'esActivo', key: 'esActivo', width: 55,
      render: (v, r) => {
        const id = r.id || r.Id
        return (
          <Switch
            checked={v ?? r.EsActivo}
            size="small"
            loading={!!toggling[id]}
            disabled={!!toggling[id]}
            onChange={() => handleToggle(r)}
          />
        )
      }
    },
    {
      title: '', key: 'actions', width: 75,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar esta regla?"
            okText="Eliminar" cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              try { await onDelete(r.id || r.Id); antMsg.success('Eliminada') }
              catch { antMsg.error('Error al eliminar') }
            }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // ── Pestaña Plantillas ────────────────────────────────────────────────────
  const tabPlantillas = (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Plantillas predefinidas"
        description='Hacé clic en "Agregar" para instalar la regla directamente, o en "Editar antes" para personalizarla primero.'
      />
      {PLANTILLAS.map(cat => (
        <div key={cat.categoria} style={{ marginBottom: 24 }}>
          <Divider orientation="left" style={{ margin: '0 0 12px' }}>
            <Space>
              <span style={{ color: cat.color, fontSize: 16 }}>{cat.icono}</span>
              <Text strong style={{ fontSize: 13 }}>{cat.categoria}</Text>
            </Space>
          </Divider>
          <Row gutter={[10, 10]}>
            {cat.reglas.map(p => {
              const yaInstalada = patronesExistentes.has(p.patron.trim())
              return (
                <Col xs={24} key={p.patron}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 8,
                      border: yaInstalada ? '1px solid #b7eb8f' : '1px solid #d9d9d9',
                      background: yaInstalada ? '#f6ffed' : '#fff'
                    }}
                    styles={{ body: { padding: '10px 14px' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: 13 }}>{p.nombre}</Text>
                          <TipoTag tipo={p.tipoAccion} />
                          <Tag style={{ fontSize: 11 }}>Prioridad {p.prioridad}</Tag>
                          {yaInstalada && <Tag color="success" icon={<CheckOutlined />} style={{ fontSize: 11 }}>Instalada</Tag>}
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Palabras clave: </Text>
                          <code style={{ fontSize: 11, background: '#f0f0f0', padding: '1px 5px', borderRadius: 3 }}>
                            {p.patron}
                          </code>
                        </div>
                        <Text style={{ fontSize: 12, color: '#555', whiteSpace: 'pre-line', display: 'block' }}>
                          {p.respuesta.length > 120 ? p.respuesta.slice(0, 117) + '...' : p.respuesta}
                        </Text>
                      </div>
                      <Space direction="vertical" size={4} style={{ flexShrink: 0 }}>
                        <Button
                          size="small"
                          type="primary"
                          icon={yaInstalada ? <CheckOutlined /> : <PlusOutlined />}
                          disabled={yaInstalada}
                          loading={adding[p.patron]}
                          onClick={() => handleAddTemplate(p)}
                          style={{ width: 100 }}
                        >
                          {yaInstalada ? 'Instalada' : 'Agregar'}
                        </Button>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openFromTemplate(p)}
                          style={{ width: 100 }}
                        >
                          Editar antes
                        </Button>
                      </Space>
                    </div>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>
      ))}
    </div>
  )

  // ── Pestaña Mis reglas ────────────────────────────────────────────────────
  const tabMisReglas = (
    <div>
      <Collapse
        ghost size="small"
        style={{ marginBottom: 12, background: '#f0f5ff', borderRadius: 8 }}
        items={[{
          key: '1',
          label: (
            <Space>
              <QuestionCircleOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ color: '#1677ff' }}>¿Cómo funcionan las reglas?</Text>
            </Space>
          ),
          children: (
            <div style={{ padding: '0 8px 8px' }}>
              <Alert type="info" showIcon style={{ marginBottom: 10 }}
                message="El bot solo actúa en conversaciones con el modo 'Bot' activado (toggle en el encabezado del chat)."
              />
              <Paragraph style={{ margin: '0 0 10px' }}>
                <Text strong>Lógica de evaluación:</Text>
                <ol style={{ marginTop: 6, paddingLeft: 20, marginBottom: 0 }}>
                  <li>Al llegar un mensaje, revisa todas las reglas <strong>activas por orden de prioridad</strong> (menor número = primero).</li>
                  <li>Si el mensaje coincide con el <strong>patrón</strong>, ejecuta la acción y <strong>se detiene</strong> (no evalúa las demás).</li>
                  <li>Si ninguna regla coincide, el mensaje queda sin respuesta automática.</li>
                </ol>
              </Paragraph>
              <Paragraph style={{ margin: '0 0 10px' }}>
                <Text strong>Cómo escribir el patrón:</Text>
                <ul style={{ marginTop: 6, paddingLeft: 20, marginBottom: 0 }}>
                  <li><code>hola|buenas</code> → detecta "hola" <strong>o</strong> "buenas"</li>
                  <li><code>precio|costo|cuanto</code> → cualquiera de esas palabras</li>
                </ul>
                <Text type="secondary" style={{ fontSize: 12 }}>No hace falta preocuparse por mayúsculas, el bot las ignora.</Text>
              </Paragraph>
              <Text strong>Variables en la respuesta: </Text>
              <code style={{ fontSize: 12 }}>{'{numero}'}</code><Text type="secondary" style={{ fontSize: 12 }}> número del cliente — </Text>
              <code style={{ fontSize: 12 }}>{'{nombre}'}</code><Text type="secondary" style={{ fontSize: 12 }}> nombre del contacto</Text>
            </div>
          )
        }]}
      />

      {reglas.length === 0 && !loading && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          message="No hay reglas creadas"
          description='Creá una desde cero con "Nueva regla" o agregá una plantilla desde la pestaña Plantillas.'
        />
      )}

      <Table
        dataSource={reglas}
        columns={columns}
        rowKey={r => r.id || r.Id}
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Sin reglas. Usá las plantillas o creá una nueva.' }}
      />
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Drawer
        title={<Space><RobotOutlined style={{ color: '#1677ff' }} /><span>Chatbot — Reglas automáticas</span></Space>}
        open={open}
        onClose={onClose}
        width={Math.min(700, window.innerWidth - (window.innerWidth < 480 ? 0 : 32))}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nueva regla</Button>}
      >
        {/* ── Control global ── */}
        <Card
          size="small"
          style={{ marginBottom: 16, borderRadius: 8, border: modoGlobal?.modoDefecto === 'bot' ? '1px solid #b7eb8f' : '1px solid #ffd591', background: modoGlobal?.modoDefecto === 'bot' ? '#f6ffed' : '#fffbe6' }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <RobotOutlined style={{ color: modoGlobal?.modoDefecto === 'bot' ? '#52c41a' : '#fa8c16', fontSize: 16 }} />
                <Text strong>Bot global</Text>
                <Tag color={modoGlobal?.modoDefecto === 'bot' ? 'success' : 'warning'} style={{ marginLeft: 4 }}>
                  {modoGlobal?.modoDefecto === 'bot' ? 'ACTIVO' : 'INACTIVO'}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {modoGlobal
                  ? `${modoGlobal.conversacionesEnBot} de ${modoGlobal.totalConversaciones} conversaciones en modo bot`
                  : 'Cargando...'}
              </Text>
              <div style={{ marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Las conversaciones nuevas arrancarán en modo <strong>{modoGlobal?.modoDefecto === 'bot' ? 'Bot' : 'Agente'}</strong> automáticamente.
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button
                type="primary"
                size="small"
                icon={<RobotOutlined />}
                disabled={modoGlobal?.modoDefecto === 'bot' || loadingGlobal}
                loading={loadingGlobal && modoGlobal?.modoDefecto !== 'bot'}
                onClick={() => handleToggleGlobal(true)}
              >
                Activar en todas
              </Button>
              <Button
                size="small"
                icon={<UserOutlined />}
                disabled={modoGlobal?.modoDefecto === 'agente' || loadingGlobal}
                loading={loadingGlobal && modoGlobal?.modoDefecto === 'bot'}
                onClick={() => handleToggleGlobal(false)}
              >
                Desactivar en todas
              </Button>
            </div>
          </div>
        </Card>

        <Tabs
          defaultActiveKey="reglas"
          items={[
            {
              key: 'reglas',
              label: (
                <Space>
                  <ThunderboltOutlined />
                  Mis reglas
                  {reglas.length > 0 && <Badge count={reglas.length} style={{ backgroundColor: '#1677ff' }} />}
                </Space>
              ),
              children: tabMisReglas
            },
            {
              key: 'plantillas',
              label: (
                <Space>
                  <StarOutlined />
                  Plantillas
                  <Badge count={PLANTILLAS.reduce((acc, c) => acc + c.reglas.length, 0)} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              ),
              children: tabPlantillas
            }
          ]}
        />
      </Drawer>

      {/* ── Modal crear / editar ── */}
      <Modal
        title={<Space>{editing ? <EditOutlined /> : <PlusOutlined />}{editing ? 'Editar regla' : 'Nueva regla'}</Space>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Guardar"
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="nombre" label="Nombre de la regla"
            rules={[{ required: true, message: 'Poné un nombre descriptivo' }]}
            extra="Solo para identificarla en la lista."
          >
            <Input placeholder="Ej: Saludo inicial, Consulta de precios..." />
          </Form.Item>

          <Form.Item name="patron" label="Patrón de detección (palabras clave)"
            rules={[
              { required: true, message: 'Escribí el patrón' },
              {
                validator: (_, val) => {
                  if (!val) return Promise.resolve()
                  try { new RegExp(val); return Promise.resolve() }
                  catch { return Promise.reject('El patrón no es válido como expresión regular') }
                }
              }
            ]}
            extra={<span>Usá <code>|</code> para "o". Ej: <code>hola|buenas|buen dia</code></span>}
          >
            <Input placeholder="hola|buenos dias|buen dia" />
          </Form.Item>

          <Form.Item name="tipoAccion" label="Tipo de acción" rules={[{ required: true }]}>
            <Select>
              {TIPO_ACCIONES.map(t => (
                <Select.Option key={t.value} value={t.value}>
                  <Space>{t.icon}<span>{t.label}</span><Text type="secondary" style={{ fontSize: 11 }}>— {t.desc}</Text></Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="respuesta"
            label={tipoAccion === 'redirigir_agente' ? 'Mensaje de aviso al cliente (opcional)' : 'Respuesta automática'}
            rules={tipoAccion !== 'redirigir_agente' ? [{ required: true, message: 'Escribí la respuesta' }] : []}
            extra={
              tipoAccion === 'redirigir_agente'
                ? 'Si lo dejás vacío, el bot cambia el modo sin enviar mensaje.'
                : <span>Variables disponibles: <code>{'{numero}'}</code> y <code>{'{nombre}'}</code></span>
            }
          >
            <Input.TextArea rows={3}
              placeholder={tipoAccion === 'redirigir_agente' ? 'Enseguida te atiendo un agente...' : '¡Hola! ¿En qué te puedo ayudar? 😊'}
            />
          </Form.Item>

          <Space size={24}>
            <Form.Item name="prioridad" initialValue={100}
              label={
                <Tooltip title="Menor número = mayor prioridad. Ej: una regla con prioridad 1 se evalúa antes que una con prioridad 100.">
                  Prioridad <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              }
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={1} max={999} style={{ width: 100 }} />
            </Form.Item>

            <Form.Item name="esActivo" label="Activada" valuePropName="checked" initialValue={true} style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  )
}
