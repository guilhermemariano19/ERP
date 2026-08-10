function apiSolicitarAdiantamento(token, payload) {
  const session = requireSession_(token); payload = payload || {};
  const item = { ID: uuid_(), VENDEDOR_ID: session.sellerId || session.id, DATA: dateOnly_(payload.date), OBJETIVO: sanitizeText_(payload.objective, 500), VALOR: sanitizeNumber_(payload.amount), PERIODO: sanitizeText_(payload.period, 20), STATUS: 'SOLICITADO', CRIADO_EM: nowIso_(), ATUALIZADO_EM: nowIso_() };
  if (!item.OBJETIVO || item.VALOR <= 0) throw new Error('Objetivo e valor são obrigatórios.');
  appendObject_('ADIANTAMENTOS', item); audit_(session, 'ADIANTAMENTO_SOLICITADO', 'ADIANTAMENTOS', item.ID, '', ''); return { id: item.ID };
}
