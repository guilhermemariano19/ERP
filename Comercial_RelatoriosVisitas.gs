function apiListarVisitas(token) {
  const session = requireSession_(token);
  return getSheetObjects_('VISITAS').filter(function(row) { return canSeeAllExpenses_(session) || String(row.VENDEDOR_ID) === String(session.sellerId || session.id); });
}
