import api from './axios'

// Proxy genérico — llama cualquier endpoint de Baileys a través del .NET backend
const proxy = {
  get: (path, params) => api.get(`/WhatsApp/baileys/proxy/${path}`, { params }),
  post: (path, data) => api.post(`/WhatsApp/baileys/proxy/${path}`, data),
  del: (path) => api.delete(`/WhatsApp/baileys/proxy/${path}`),
}

const baileys = {
  // ── Conexión ──
  status: () => api.get('/WhatsApp/baileys/status'),
  iniciar: (phoneNumber) => api.post(`/WhatsApp/baileys/iniciar${phoneNumber ? `?phoneNumber=${phoneNumber}` : ''}`),
  cerrarSesion: () => api.post('/WhatsApp/baileys/cerrar-sesion'),
  limpiarSesion: () => api.delete('/WhatsApp/baileys/limpiar-sesion'),
  pairingCode: (numero) => api.get(`/WhatsApp/baileys/pairing-code?numero=${numero}`),

  // ── Mensajes (usan endpoints directos del controller por lógica de DB) ──
  sendMessage: (numero, mensaje) => api.post('/WhatsApp/send-message', { numero, mensaje }),
  sendMultimedia: (data) => api.post('/WhatsApp/send-multimedia-message', data),
  sendVoice: (numero, audioBase64) => api.post('/WhatsApp/send-voice', { numero, audioBase64 }),
  sendLocation: (numero, latitud, longitud) => api.post('/WhatsApp/send-location', { numero, latitud, longitud }),
  sendPoll: (numero, pregunta, opciones) => api.post('/WhatsApp/send-poll', { numero, pregunta, opciones }),
  sendEphemeral: (numero, mensaje, duracionSegundos) => api.post('/WhatsApp/send-ephemeral', { numero, mensaje, duracionSegundos }),
  sendReaction: (numero, whatsAppId, emoji) => api.post('/WhatsApp/send-reaction', { numero, whatsAppId, emoji }),
  sendList: (data) => api.post('/WhatsApp/send-list', data),
  sendContactCard: (data) => api.post('/WhatsApp/send-contact-card', data),

  // ── Contactos ──
  contacts: () => proxy.get('contacts'),
  contactName: (numero) => proxy.get('contact-name', { numero }),
  profilePic: (contactId) => api.get(`/WhatsApp/foto-perfil?numero=${contactId}`),
  blockContact: (contactId) => proxy.post('contact/block', { contactId }),
  unblockContact: (contactId) => proxy.post('contact/unblock', { contactId }),
  blocklist: () => proxy.get('contact/blocklist'),
  businessProfile: (contactId) => proxy.get('contact/business-profile', { contactId }),
  validateNumber: (number) => proxy.post('validate-number', { number }),

  // ── Chat Management ──
  archiveChat: (chatId, archive = true) => proxy.post('chat/archive', { chatId, archive }),
  pinChat: (chatId, pin = true) => proxy.post('chat/pin', { chatId, pin }),
  muteChat: (chatId, muteMs = null) => proxy.post('chat/mute', { chatId, muteMs }),
  starMessage: (chatId, messageId, star = true) => proxy.post('message/star', { chatId, messageId, star }),
  markRead: (chatId, messageIds) => proxy.post('message/read', { chatId, messageIds }),
  markSeen: (chatId) => proxy.post('mark-seen', { chatId }),
  updatePresence: (to, presence) => proxy.post('update-presence', { to, presence }),

  // ── Grupos ──
  groups: () => proxy.get('groups'),
  groupMetadata: (groupId) => proxy.get('group/metadata', { groupId }),
  groupInviteLink: (groupId) => proxy.get('group/invite-link', { groupId }),
  createGroup: (name, participants) => proxy.post('create-group', { name, participants }),
  addParticipants: (groupId, participants) => proxy.post('group/add-participants', { groupId, participants }),
  removeParticipants: (groupId, participants) => proxy.post('group/remove-participants', { groupId, participants }),
  promoteParticipants: (groupId, participants) => proxy.post('group/promote', { groupId, participants }),
  demoteParticipants: (groupId, participants) => proxy.post('group/demote', { groupId, participants }),
  updateGroupSubject: (groupId, subject) => proxy.post('group/update-subject', { groupId, subject }),
  updateGroupDescription: (groupId, description) => proxy.post('group/update-description', { groupId, description }),
  updateGroupPicture: (groupId, base64Image) => proxy.post('group/update-picture', { groupId, base64Image }),
  revokeGroupInvite: (groupId) => proxy.post('group/revoke-invite', { groupId }),
  joinGroup: (inviteCode) => proxy.post('group/join', { inviteCode }),
  leaveGroup: (groupId) => proxy.post('group/leave', { groupId }),
  groupSettings: (groupId, setting) => proxy.post('group/settings', { groupId, setting }),

  // ── Perfil propio ──
  updateName: (name) => proxy.post('profile/update-name', { name }),
  updateStatus: (status) => proxy.post('profile/update-status', { status }),
  updateProfilePic: (base64Image) => proxy.post('profile/update-picture', { base64Image }),

  // ── Privacidad ──
  updatePrivacy: (setting, value) => proxy.post('privacy/update', { setting, value }),

  // ── Labels (WhatsApp Business) ──
  addLabel: (chatId, labelId) => proxy.post('label/add', { chatId, labelId }),
  removeLabel: (chatId, labelId) => proxy.post('label/remove', { chatId, labelId }),

  // ── Chats ──
  chats: () => proxy.get('chats'),
}

export default baileys
