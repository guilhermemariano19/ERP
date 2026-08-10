function nowIso_() {
  return Utilities.formatDate(new Date(), DMB_CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
}

function dateOnly_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value) + (String(value).length === 10 ? 'T12:00:00' : ''));
  if (isNaN(date.getTime())) throw new Error('Data inválida.');
  return Utilities.formatDate(date, DMB_CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function uuid_() { return Utilities.getUuid(); }

function asBoolean_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value).toUpperCase() === 'SIM' || String(value) === '1';
}

function getSheetObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(function(row) { return row.some(function(cell) { return cell !== ''; }); }).map(function(row, index) {
    const object = { _row: index + 2 };
    headers.forEach(function(header, column) { object[header] = row[column]; });
    return object;
  });
}

function appendObject_(sheetName, object) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(header) { return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : ''; }));
  return object;
}

function updateObjectById_(sheetName, id, changes) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const row = getSheetObjects_(sheetName).find(function(item) { return String(item.ID) === String(id); });
  if (!row) throw new Error('Registro não encontrado: ' + id);
  Object.keys(changes).forEach(function(key) {
    const column = headers.indexOf(key);
    if (column >= 0) sheet.getRange(row._row, column + 1).setValue(changes[key]);
  });
  return true;
}

function audit_(session, action, moduleName, referenceId, details, deviceInfo) {
  try {
    appendObject_('AUDITORIA', {
      ID: uuid_(), DATA_HORA: nowIso_(), USUARIO_ID: session && session.id || '', USUARIO_EMAIL: session && session.email || '',
      ACAO: action, MODULO: moduleName, REFERENCIA_ID: referenceId || '', DETALHES: sanitizeText_(details, 1000), DISPOSITIVO: sanitizeText_(deviceInfo, 500)
    });
  } catch (error) { console.warn('Auditoria não registrada: ' + error.message); }
}
