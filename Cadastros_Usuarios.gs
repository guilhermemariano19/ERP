const DMB_MASTER_BOOTSTRAP = Object.freeze({
  ID: 'USR-MASTER-001',
  NAME: 'Administrador Master',
  LOGIN: 'ADMINISTRATOR',
  SALT: '5eca95b7fd71d7fa3e77be714597fc542abd11af2deaf95a',
  PASSWORD_HASH: 'BOOTSTRAP$yY06sjYHeJg_GxH214MThmHy3mHffwRqnzw9NYlLXvw'
});

function seedMasterAdmin_(forceReset) {
  const users = getSheetObjects_('USUARIOS');
  const master = users.find(function(user) {
    return String(user.ID) === DMB_MASTER_BOOTSTRAP.ID || normalizeLogin_(user.EMAIL) === normalizeLogin_(DMB_MASTER_BOOTSTRAP.LOGIN);
  });
  const timestamp = nowIso_();

  if (!master) {
    appendObject_('USUARIOS', {
      ID: DMB_MASTER_BOOTSTRAP.ID,
      NOME: DMB_MASTER_BOOTSTRAP.NAME,
      EMAIL: DMB_MASTER_BOOTSTRAP.LOGIN,
      SENHA_HASH: DMB_MASTER_BOOTSTRAP.PASSWORD_HASH,
      SALT: DMB_MASTER_BOOTSTRAP.SALT,
      PERFIL: 'ADMIN',
      VENDEDOR_ID: '',
      ATIVO: true,
      TROCAR_SENHA: false,
      CRIADO_EM: timestamp,
      ATUALIZADO_EM: timestamp
    });
    return { created: true, repaired: false, login: DMB_MASTER_BOOTSTRAP.LOGIN };
  }

  const changes = { NOME: DMB_MASTER_BOOTSTRAP.NAME, EMAIL: DMB_MASTER_BOOTSTRAP.LOGIN, PERFIL: 'ADMIN', ATIVO: true, ATUALIZADO_EM: timestamp };
  const credentialsMissing = !master.SENHA_HASH || !master.SALT;
  const identityChanged = normalizeLogin_(master.EMAIL) !== normalizeLogin_(DMB_MASTER_BOOTSTRAP.LOGIN);
  if (forceReset || credentialsMissing || identityChanged) {
    changes.SENHA_HASH = DMB_MASTER_BOOTSTRAP.PASSWORD_HASH;
    changes.SALT = DMB_MASTER_BOOTSTRAP.SALT;
    changes.TROCAR_SENHA = false;
  }
  updateObjectById_('USUARIOS', master.ID, changes);
  return { created: false, repaired: !!(forceReset || credentialsMissing || identityChanged), login: DMB_MASTER_BOOTSTRAP.LOGIN };
}

function repararAdministradorMaster() {
  instalarSistema();
  ensurePepper_();
  return seedMasterAdmin_(true);
}

function criarAdministradorInicial(name, email, password) {
  // Compatibilidade com o botão Executar do editor: sem parâmetros,
  // instala o banco e configura o administrador master automaticamente.
  if (arguments.length === 0) return repararAdministradorMaster();
  validatePassword_(password);
  const users = getSheetObjects_('USUARIOS');
  if (users.some(function(user) { return String(user.PERFIL).toUpperCase() === 'ADMIN'; })) {
    throw new Error('Já existe um administrador. Use o módulo de Administração.');
  }
  const salt = createSalt_();
  const user = {
    ID: uuid_(), NOME: sanitizeText_(name, 120), EMAIL: normalizeEmail_(email),
    SENHA_HASH: hashPassword_(password, salt), SALT: salt, PERFIL: 'ADMIN', VENDEDOR_ID: '',
    ATIVO: true, TROCAR_SENHA: false, CRIADO_EM: nowIso_(), ATUALIZADO_EM: nowIso_()
  };
  if (!user.NOME || !user.EMAIL) throw new Error('Nome e e-mail são obrigatórios.');
  appendObject_('USUARIOS', user);
  audit_(user, 'ADMIN_INICIAL_CRIADO', 'USUARIOS', user.ID, '', 'Apps Script');
  return { id: user.ID, name: user.NOME, email: user.EMAIL };
}

function apiListarUsuarios(token) {
  const session = requireSession_(token);
  requirePermission_(session, 'CADASTROS.GERENCIAR');
  return getSheetObjects_('USUARIOS').map(function(user) {
    return { id: user.ID, name: user.NOME, login: user.EMAIL, email: user.EMAIL, role: user.PERFIL, isAdmin: String(user.PERFIL).toUpperCase() === 'ADMIN', sellerId: user.VENDEDOR_ID, active: asBoolean_(user.ATIVO), mustChangePassword: asBoolean_(user.TROCAR_SENHA), isMaster: String(user.ID) === DMB_MASTER_BOOTSTRAP.ID };
  });
}

function apiSalvarUsuario(token, payload) {
  const session = requireSession_(token);
  requirePermission_(session, 'CADASTROS.GERENCIAR');
  payload = payload || {};
  const login = normalizeLogin_(payload.login || payload.email);
  const users = getSheetObjects_('USUARIOS');
  const duplicate = users.find(function(user) { return normalizeLogin_(user.EMAIL) === login && String(user.ID) !== String(payload.id || ''); });
  if (duplicate) throw new Error('Já existe um usuário com este login ou e-mail.');
  const isMaster = String(payload.id || '') === DMB_MASTER_BOOTSTRAP.ID;
  const isAdmin = isMaster || payload.isAdmin === true || String(payload.isAdmin).toLowerCase() === 'true';
  const changes = { NOME: sanitizeText_(payload.name, 120), EMAIL: isMaster ? DMB_MASTER_BOOTSTRAP.LOGIN : login, PERFIL: isAdmin ? 'ADMIN' : 'VENDEDOR', VENDEDOR_ID: payload.sellerId || '', ATIVO: isMaster ? true : payload.active !== false, ATUALIZADO_EM: nowIso_() };
  if (!changes.NOME || !changes.EMAIL) throw new Error('Nome e login/e-mail são obrigatórios.');
  if (payload.id) {
    if (payload.temporaryPassword) {
      validatePassword_(payload.temporaryPassword);
      const updatedSalt = createSalt_();
      changes.SENHA_HASH = hashPassword_(payload.temporaryPassword, updatedSalt);
      changes.SALT = updatedSalt;
      changes.TROCAR_SENHA = !isMaster;
    }
    updateObjectById_('USUARIOS', payload.id, changes);
    audit_(session, 'USUARIO_ATUALIZADO', 'USUARIOS', payload.id, '', '');
    return { id: payload.id };
  }
  validatePassword_(payload.temporaryPassword);
  const salt = createSalt_();
  const user = Object.assign({ ID: uuid_(), SENHA_HASH: hashPassword_(payload.temporaryPassword, salt), SALT: salt, TROCAR_SENHA: true, CRIADO_EM: nowIso_() }, changes);
  appendObject_('USUARIOS', user);
  audit_(session, 'USUARIO_CRIADO', 'USUARIOS', user.ID, '', '');
  return { id: user.ID };
}

function apiRedefinirSenhaUsuario(token, userId, temporaryPassword) {
  const session = requireSession_(token);
  requirePermission_(session, 'CADASTROS.GERENCIAR');
  validatePassword_(temporaryPassword);
  const salt = createSalt_();
  updateObjectById_('USUARIOS', userId, { SENHA_HASH: hashPassword_(temporaryPassword, salt), SALT: salt, TROCAR_SENHA: true, ATUALIZADO_EM: nowIso_() });
  audit_(session, 'SENHA_REDEFINIDA', 'USUARIOS', userId, '', '');
  return true;
}
