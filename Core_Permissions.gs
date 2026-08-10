const DMB_PERMISSIONS = Object.freeze({
  ADMIN: ['DESPESAS.CRIAR', 'DESPESAS.VER_TODAS', 'DESPESAS.EDITAR_TODAS', 'DESPESAS.EXCLUIR', 'CADASTROS.GERENCIAR', 'AUDITORIA.VER', 'APROVACOES.GERENCIAR'],
  GERENTE: ['DESPESAS.CRIAR', 'DESPESAS.VER_TODAS', 'DESPESAS.EDITAR_TODAS', 'APROVACOES.GERENCIAR'],
  SUPERVISOR: ['DESPESAS.CRIAR', 'DESPESAS.VER_EQUIPE', 'APROVACOES.GERENCIAR'],
  VENDEDOR: ['DESPESAS.CRIAR', 'DESPESAS.VER_PROPRIAS', 'DESPESAS.EDITAR_PROPRIAS']
});

function permissionsFor_(role) {
  return (DMB_PERMISSIONS[String(role || 'VENDEDOR').toUpperCase()] || []).slice();
}

function hasPermission_(session, permission) {
  return permissionsFor_(session.role).indexOf(permission) >= 0;
}

function requirePermission_(session, permission) {
  if (!hasPermission_(session, permission)) throw new Error('Você não possui permissão para esta ação.');
  return true;
}

function canSeeAllExpenses_(session) {
  return hasPermission_(session, 'DESPESAS.VER_TODAS');
}
