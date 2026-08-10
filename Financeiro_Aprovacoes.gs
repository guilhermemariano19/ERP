function listarAprovacoesPorReferencia_(referenceId) {
  return getSheetObjects_('APROVACOES').filter(function(row) { return String(row.REFERENCIA_ID) === String(referenceId); });
}
