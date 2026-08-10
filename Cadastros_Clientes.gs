function apiListarClientes(token, searchText) {
  const session = requireSession_(token);
  const search = sanitizeText_(searchText, 120).toLowerCase();
  return getSheetObjects_('CLIENTES').filter(function(row) {
    const belongs = canSeeAllExpenses_(session) || !session.sellerId || String(row.VENDEDOR_ID) === String(session.sellerId);
    const matches = !search || String(row.NOME + ' ' + row.NOME_FANTASIA + ' ' + row.CIDADE).toLowerCase().indexOf(search) >= 0;
    return belongs && matches && asBoolean_(row.ATIVO);
  }).map(function(row) { return { id: row.ID, protheusCode: row.CODIGO_PROTHEUS, name: row.NOME, tradeName: row.NOME_FANTASIA, sellerId: row.VENDEDOR_ID, regionId: row.REGIAO_ID, segmentId: row.SEGMENTO_ID, state: row.ESTADO, city: row.CIDADE }; });
}

function apiSalvarCliente(token, payload) {
  const session = requireSession_(token); requirePermission_(session, 'CADASTROS.GERENCIAR'); payload = payload || {};
  const changes = { CODIGO_PROTHEUS: sanitizeText_(payload.protheusCode, 20), NOME: sanitizeText_(payload.name, 160), NOME_FANTASIA: sanitizeText_(payload.tradeName, 160), VENDEDOR_ID: payload.sellerId || '', REGIAO_ID: payload.regionId || '', SEGMENTO_ID: payload.segmentId || '', ESTADO: sanitizeText_(payload.state, 2).toUpperCase(), CIDADE: sanitizeText_(payload.city, 100), ATIVO: payload.active !== false, ATUALIZADO_EM: nowIso_() };
  if (!changes.NOME) throw new Error('Nome do cliente é obrigatório.');
  if (payload.id) { updateObjectById_('CLIENTES', payload.id, changes); return { id: payload.id }; }
  const item = Object.assign({ ID: uuid_(), CRIADO_EM: nowIso_() }, changes); appendObject_('CLIENTES', item); return { id: item.ID };
}
