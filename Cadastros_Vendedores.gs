function apiListarVendedores(token, activeOnly) {
  requireSession_(token);
  return getSheetObjects_('VENDEDORES').filter(function(row) { return !activeOnly || asBoolean_(row.ATIVO); }).map(function(row) {
    return { id: row.ID, protheusCode: row.CODIGO_PROTHEUS, name: row.NOME, email: row.EMAIL, defaultRoute: row.ROTA_PADRAO, supervisorId: row.SUPERVISOR_ID, managerId: row.GERENTE_ID, active: asBoolean_(row.ATIVO) };
  });
}

function apiSalvarVendedor(token, payload) {
  const session = requireSession_(token); requirePermission_(session, 'CADASTROS.GERENCIAR');
  payload = payload || {};
  const changes = { CODIGO_PROTHEUS: sanitizeText_(payload.protheusCode, 20), NOME: sanitizeText_(payload.name, 120), EMAIL: normalizeEmail_(payload.email), ROTA_PADRAO: sanitizeText_(payload.defaultRoute, 120), SUPERVISOR_ID: payload.supervisorId || '', GERENTE_ID: payload.managerId || '', ATIVO: payload.active !== false, ATUALIZADO_EM: nowIso_() };
  if (!changes.NOME) throw new Error('Nome do vendedor é obrigatório.');
  if (payload.id) { updateObjectById_('VENDEDORES', payload.id, changes); return { id: payload.id }; }
  const item = Object.assign({ ID: uuid_(), CRIADO_EM: nowIso_() }, changes); appendObject_('VENDEDORES', item); return { id: item.ID };
}
