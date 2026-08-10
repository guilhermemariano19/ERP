function apiListarRegioes(token) { requireSession_(token); return listSimpleRegister_('REGIOES'); }
function apiSalvarRegiao(token, payload) { return saveSimpleRegister_(token, 'REGIOES', payload); }
