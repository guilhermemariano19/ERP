function apiListarAgendamentos(token) {
  const session = requireSession_(token);
  return getSheetObjects_('AGENDAMENTOS').filter(function(row) { return canSeeAllExpenses_(session) || String(row.VENDEDOR_ID) === String(session.sellerId || session.id); });
}
