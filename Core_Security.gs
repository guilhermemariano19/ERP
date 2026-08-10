function ensurePepper_() {
  const props = PropertiesService.getScriptProperties();
  let pepper = props.getProperty(DMB_CONFIG.PROPERTIES.PASSWORD_PEPPER);
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(DMB_CONFIG.PROPERTIES.PASSWORD_PEPPER, pepper);
  }
  return pepper;
}

function createSalt_() {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + new Date().getTime()));
}

function hashPassword_(password, salt) {
  const pepper = ensurePepper_();
  const signature = Utilities.computeHmacSha256Signature(String(password) + ':' + String(salt), pepper, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(signature);
}

function normalizeBase64_(value) {
  return String(value || '').replace(/=+$/g, '');
}

function bootstrapHashPassword_(password, salt) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password) + ':' + String(salt),
    Utilities.Charset.UTF_8
  );
  return 'BOOTSTRAP$' + normalizeBase64_(Utilities.base64EncodeWebSafe(digest));
}

function isBootstrapPasswordHash_(hash) {
  return String(hash || '').indexOf('BOOTSTRAP$') === 0;
}

function verifyPasswordRecord_(password, user) {
  if (!user || !user.SALT || !user.SENHA_HASH) return false;
  const expected = isBootstrapPasswordHash_(user.SENHA_HASH)
    ? bootstrapHashPassword_(password, user.SALT)
    : hashPassword_(password, user.SALT);
  return safeEquals_(expected, user.SENHA_HASH);
}

function safeEquals_(left, right) {
  left = String(left || ''); right = String(right || '');
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left.charCodeAt(i % Math.max(left.length, 1)) || 0) ^ (right.charCodeAt(i % Math.max(right.length, 1)) || 0);
  return diff === 0;
}

function validatePassword_(password) {
  if (String(password || '').length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
  return true;
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeLogin_(login) {
  return String(login || '').trim().toLowerCase();
}

function sanitizeText_(value, maxLength) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, maxLength || 500);
}

function sanitizeNumber_(value) {
  const number = Number(String(value == null ? '' : value).replace(',', '.'));
  if (!isFinite(number)) throw new Error('Valor numérico inválido.');
  return number;
}
