function apiListarFornecedores(token) {
  requireSession_(token); return getSheetObjects_('FORNECEDORES').filter(function(row) { return asBoolean_(row.ATIVO); }).map(function(row) { return { id: row.ID, name: row.NOME, taxId: row.CNPJ, email: row.EMAIL, phone: row.TELEFONE }; });
}
