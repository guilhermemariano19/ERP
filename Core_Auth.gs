function apiLogin(login, password, deviceInfo) {
  const normalizedLogin = normalizeLogin_(login);
  const user = getSheetObjects_('USUARIOS').find(function(row) { return normalizeLogin_(row.EMAIL) === normalizedLogin; });
  if (!user || !asBoolean_(user.ATIVO) || !verifyPasswordRecord_(password, user)) {
    audit_({ email: normalizedLogin }, 'LOGIN_FALHOU', 'AUTH', '', 'Credenciais inválidas', deviceInfo);
    throw new Error('Login ou senha inválidos.');
  }

  // O hash de inicialização permite entregar o banco sem gravar senha aberta.
  // No primeiro login ele é promovido para HMAC com a chave secreta do projeto.
  if (isBootstrapPasswordHash_(user.SENHA_HASH)) {
    const mustChangePassword = asBoolean_(user.TROCAR_SENHA);
    const upgradedSalt = createSalt_();
    updateObjectById_('USUARIOS', user.ID, {
      SENHA_HASH: hashPassword_(password, upgradedSalt),
      SALT: upgradedSalt,
      TROCAR_SENHA: mustChangePassword,
      ATUALIZADO_EM: nowIso_()
    });
    user.TROCAR_SENHA = mustChangePassword;
  }

  const token = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ':' + new Date().getTime()));
  const session = { id: user.ID, name: user.NOME, email: user.EMAIL, role: String(user.PERFIL || 'VENDEDOR').toUpperCase(), sellerId: user.VENDEDOR_ID || '', mustChangePassword: asBoolean_(user.TROCAR_SENHA) };
  CacheService.getScriptCache().put('SESSION:' + token, JSON.stringify(session), DMB_CONFIG.SESSION_SECONDS);
  audit_(session, 'LOGIN_OK', 'AUTH', '', 'Sessão iniciada', deviceInfo);
  return { token: token, user: publicSession_(session), permissions: permissionsFor_(session.role) };
}

function apiSessao(token) {
  const session = requireSession_(token);
  return { user: publicSession_(session), permissions: permissionsFor_(session.role) };
}

function apiLogout(token) {
  const session = readSession_(token);
  if (session) audit_(session, 'LOGOUT', 'AUTH', '', 'Sessão encerrada', '');
  CacheService.getScriptCache().remove('SESSION:' + String(token || ''));
  return true;
}

function apiAlterarSenha(token, currentPassword, newPassword) {
  const session = requireSession_(token);
  validatePassword_(newPassword);
  const rows = getSheetObjects_('USUARIOS');
  const user = rows.find(function(row) { return row.ID === session.id; });
  if (!user || !verifyPasswordRecord_(currentPassword, user)) throw new Error('Senha atual incorreta.');
  if (safeEquals_(String(currentPassword), String(newPassword))) throw new Error('A nova senha deve ser diferente da senha atual.');
  const salt = createSalt_();
  updateObjectById_('USUARIOS', user.ID, { SENHA_HASH: hashPassword_(newPassword, salt), SALT: salt, TROCAR_SENHA: false, ATUALIZADO_EM: nowIso_() });
  session.mustChangePassword = false;
  CacheService.getScriptCache().put('SESSION:' + token, JSON.stringify(session), DMB_CONFIG.SESSION_SECONDS);
  audit_(session, 'SENHA_ALTERADA', 'AUTH', user.ID, '', '');
  return true;
}

function requireSession_(token) {
  const session = readSession_(token);
  if (!session) throw new Error('Sessão expirada. Entre novamente.');
  CacheService.getScriptCache().put('SESSION:' + token, JSON.stringify(session), DMB_CONFIG.SESSION_SECONDS);
  return session;
}

function readSession_(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get('SESSION:' + token);
  return raw ? JSON.parse(raw) : null;
}

function publicSession_(session) {
  return { id: session.id, name: session.name, email: session.email, role: session.role, sellerId: session.sellerId, mustChangePassword: !!session.mustChangePassword };
}
