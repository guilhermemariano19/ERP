function apiListarSegmentos(token) { requireSession_(token); return listSimpleRegister_('SEGMENTOS'); }
function apiSalvarSegmento(token, payload) { return saveSimpleRegister_(token, 'SEGMENTOS', payload); }

function listSimpleRegister_(sheetName) {
  return getSheetObjects_(sheetName).filter(function(row) { return asBoolean_(row.ATIVO); }).map(function(row) { return { id: row.ID, protheusCode: row.CODIGO_PROTHEUS, name: row.NOME, active: asBoolean_(row.ATIVO) }; });
}

function saveSimpleRegister_(token, sheetName, payload) {
  const session = requireSession_(token); requirePermission_(session, 'CADASTROS.GERENCIAR'); payload = payload || {};
  const changes = { CODIGO_PROTHEUS: sanitizeText_(payload.protheusCode, 20), NOME: sanitizeText_(payload.name, 120), ATIVO: payload.active !== false, ATUALIZADO_EM: nowIso_() };
  if (!changes.NOME) throw new Error('Nome é obrigatório.');
  if (payload.id) { updateObjectById_(sheetName, payload.id, changes); return { id: payload.id }; }
  const item = Object.assign({ ID: uuid_(), CRIADO_EM: nowIso_() }, changes); appendObject_(sheetName, item); return { id: item.ID };
}
