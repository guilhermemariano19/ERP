function apiSalvarDespesa(token, payload) {
  const session = requireSession_(token); requirePermission_(session, 'DESPESAS.CRIAR'); payload = payload || {};
  const amount = sanitizeNumber_(payload.amount);
  if (amount <= 0) throw new Error('O valor deve ser maior que zero.');
  const date = dateOnly_(payload.date);
  const route = sanitizeText_(payload.route, 160);
  const clientName = sanitizeText_(payload.clientName, 180);
  const category = sanitizeText_(payload.category, 60);
  if (!date || !route || !clientName || !category) throw new Error('Data, rota, cliente e categoria são obrigatórios.');

  let receipt = { url: '', id: '' };
  if (payload.receipt && payload.receipt.dataBase64) receipt = saveReceipt_(session, payload.receipt, date);

  const item = {
    ID: uuid_(), DATA: date, VENDEDOR_ID: session.sellerId || session.id, VENDEDOR_NOME: session.name,
    ROTA: route, CLIENTE_ID: sanitizeText_(payload.clientId, 80), CLIENTE_NOME: clientName,
    CATEGORIA: category, DESCRICAO: sanitizeText_(payload.description, 1000), VALOR: amount,
    FORMA_PAGAMENTO: sanitizeText_(payload.paymentMethod, 80), QUILOMETRAGEM: payload.mileage === '' || payload.mileage == null ? '' : sanitizeNumber_(payload.mileage),
    COMPROVANTE_URL: receipt.url, COMPROVANTE_ID: receipt.id, STATUS: 'EM_ELABORACAO', CRIADO_EM: nowIso_(), ATUALIZADO_EM: nowIso_()
  };
  appendObject_('DESPESAS', item);
  audit_(session, 'DESPESA_CRIADA', 'DESPESAS', item.ID, 'Valor: ' + amount, payload.deviceInfo || '');
  return expenseToClient_(item);
}

function apiListarDespesas(token, filters) {
  const session = requireSession_(token); filters = filters || {};
  let rows = getSheetObjects_('DESPESAS');
  if (!canSeeAllExpenses_(session)) rows = rows.filter(function(row) { return String(row.VENDEDOR_ID) === String(session.sellerId || session.id); });
  if (filters.sellerId && canSeeAllExpenses_(session)) rows = rows.filter(function(row) { return String(row.VENDEDOR_ID) === String(filters.sellerId); });
  if (filters.route) rows = rows.filter(function(row) { return String(row.ROTA) === String(filters.route); });
  if (filters.startDate) rows = rows.filter(function(row) { return dateOnly_(row.DATA) >= dateOnly_(filters.startDate); });
  if (filters.endDate) rows = rows.filter(function(row) { return dateOnly_(row.DATA) <= dateOnly_(filters.endDate); });
  return rows.sort(function(a, b) { return String(b.DATA + b.CRIADO_EM).localeCompare(String(a.DATA + a.CRIADO_EM)); }).map(expenseToClient_);
}

function apiResumoDespesas(token, filters) {
  const items = apiListarDespesas(token, filters);
  const byCategory = {}; const bySeller = {}; const byRoute = {};
  items.forEach(function(item) {
    byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
    bySeller[item.sellerName] = (bySeller[item.sellerName] || 0) + item.amount;
    byRoute[item.route] = (byRoute[item.route] || 0) + item.amount;
  });
  return { total: items.reduce(function(sum, item) { return sum + item.amount; }, 0), count: items.length, approved: items.filter(function(item) { return item.status === 'APROVADO'; }).reduce(function(sum, item) { return sum + item.amount; }, 0), pending: items.filter(function(item) { return item.status !== 'APROVADO'; }).length, byCategory: byCategory, bySeller: bySeller, byRoute: byRoute };
}

function apiAtualizarStatusDespesa(token, expenseId, status, comment) {
  const session = requireSession_(token); requirePermission_(session, 'APROVACOES.GERENCIAR');
  const allowed = ['EM_ELABORACAO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'PAGO'];
  status = String(status || '').toUpperCase(); if (allowed.indexOf(status) < 0) throw new Error('Status inválido.');
  updateObjectById_('DESPESAS', expenseId, { STATUS: status, ATUALIZADO_EM: nowIso_() });
  appendObject_('APROVACOES', { ID: uuid_(), TIPO: 'DESPESA', REFERENCIA_ID: expenseId, APROVADOR_ID: session.id, DECISAO: status, COMENTARIO: sanitizeText_(comment, 1000), DATA_HORA: nowIso_() });
  audit_(session, 'STATUS_ATUALIZADO', 'DESPESAS', expenseId, status, ''); return true;
}

function expenseToClient_(row) {
  return { id: row.ID, date: dateOnly_(row.DATA), sellerId: row.VENDEDOR_ID, sellerName: row.VENDEDOR_NOME, route: row.ROTA, clientId: row.CLIENTE_ID, clientName: row.CLIENTE_NOME, category: row.CATEGORIA, description: row.DESCRICAO, amount: Number(row.VALOR || 0), paymentMethod: row.FORMA_PAGAMENTO, mileage: row.QUILOMETRAGEM === '' ? '' : Number(row.QUILOMETRAGEM || 0), receiptUrl: row.COMPROVANTE_URL, status: row.STATUS || 'EM_ELABORACAO', createdAt: String(row.CRIADO_EM || '') };
}
