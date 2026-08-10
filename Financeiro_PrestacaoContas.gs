function calcularPrestacaoContas_(sellerId, startDate, endDate) {
  const expenses = getSheetObjects_('DESPESAS').filter(function(row) { return String(row.VENDEDOR_ID) === String(sellerId) && dateOnly_(row.DATA) >= startDate && dateOnly_(row.DATA) <= endDate; });
  const advances = getSheetObjects_('ADIANTAMENTOS').filter(function(row) { return String(row.VENDEDOR_ID) === String(sellerId) && dateOnly_(row.DATA) >= startDate && dateOnly_(row.DATA) <= endDate; });
  const totalExpenses = expenses.reduce(function(sum, row) { return sum + Number(row.VALOR || 0); }, 0);
  const totalAdvances = advances.reduce(function(sum, row) { return sum + Number(row.VALOR || 0); }, 0);
  return { totalExpenses: totalExpenses, totalAdvances: totalAdvances, balance: totalExpenses - totalAdvances };
}
