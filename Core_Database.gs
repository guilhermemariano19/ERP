function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.appName = DMB_CONFIG.APP_NAME;
  template.version = DMB_CONFIG.VERSION;
  return template.evaluate()
    .setTitle('Portal DMB ERP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function instalarSistema() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    let ss;
    const existingId = props.getProperty(DMB_CONFIG.PROPERTIES.SPREADSHEET_ID);
    if (existingId) {
      ss = SpreadsheetApp.openById(existingId);
    } else {
      ss = SpreadsheetApp.create('DMB ERP - Banco de Dados');
      props.setProperty(DMB_CONFIG.PROPERTIES.SPREADSHEET_ID, ss.getId());
    }

    Object.keys(DMB_CONFIG.SHEETS).forEach(function(name) {
      let sheet = ss.getSheetByName(name);
      if (!sheet) sheet = ss.insertSheet(name);
      const headers = DMB_CONFIG.SHEETS[name];
      if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#0f5a9e').setFontColor('#ffffff').setFontWeight('bold');
      sheet.autoResizeColumns(1, headers.length);
    });

    const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Página1');
    if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

    const rootFolder = getOrCreateFolder_(DMB_CONFIG.ROOT_FOLDER_NAME, null, DMB_CONFIG.PROPERTIES.ROOT_FOLDER_ID);
    const receipts = getOrCreateFolder_(DMB_CONFIG.RECEIPTS_FOLDER_NAME, rootFolder, DMB_CONFIG.PROPERTIES.RECEIPTS_FOLDER_ID);
    try { DriveApp.getFileById(ss.getId()).moveTo(rootFolder); } catch (error) { console.warn('Planilha não movida para a pasta do ERP: ' + error.message); }
    seedConfig_();
    ensurePepper_();
    const masterAdmin = seedMasterAdmin_(false);

    const result = { spreadsheetId: ss.getId(), spreadsheetUrl: ss.getUrl(), rootFolderId: rootFolder.getId(), receiptsFolderId: receipts.getId(), receiptsFolderUrl: receipts.getUrl(), masterAdmin: masterAdmin };
    console.log(JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function vincularBancoExistente(spreadsheetId) {
  const id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('Informe o ID da planilha Google Sheets.');
  const ss = SpreadsheetApp.openById(id);
  validateDatabaseStructure_(ss);
  PropertiesService.getScriptProperties().setProperty(DMB_CONFIG.PROPERTIES.SPREADSHEET_ID, id);

  const rootFolder = getOrCreateFolder_(DMB_CONFIG.ROOT_FOLDER_NAME, null, DMB_CONFIG.PROPERTIES.ROOT_FOLDER_ID);
  const receipts = getOrCreateFolder_(DMB_CONFIG.RECEIPTS_FOLDER_NAME, rootFolder, DMB_CONFIG.PROPERTIES.RECEIPTS_FOLDER_ID);
  seedConfig_();
  ensurePepper_();
  const masterAdmin = seedMasterAdmin_(false);
  return { spreadsheetId: id, spreadsheetUrl: ss.getUrl(), receiptsFolderUrl: receipts.getUrl(), masterAdmin: masterAdmin };
}

function validateDatabaseStructure_(ss) {
  Object.keys(DMB_CONFIG.SHEETS).forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) throw new Error('A planilha não contém a aba obrigatória: ' + name);
    const expected = DMB_CONFIG.SHEETS[name];
    const actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0].map(String);
    if (expected.join('|') !== actual.join('|')) throw new Error('Cabeçalhos inválidos na aba ' + name + '.');
  });
  return true;
}

function getDatabase_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(DMB_CONFIG.PROPERTIES.SPREADSHEET_ID);
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Banco não configurado. Execute instalarSistema().');
}

function getSheet_(name) {
  const sheet = getDatabase_().getSheetByName(name);
  if (!sheet) throw new Error('Aba não encontrada: ' + name + '. Execute instalarSistema().');
  return sheet;
}

function seedConfig_() {
  const current = getSheetObjects_('CONFIG');
  const defaults = [
    ['EMPRESA', 'DMB Bombas', 'Nome exibido no portal'],
    ['COMPROVANTE_ACESSO', 'PRIVATE', 'PRIVATE ou DOMAIN_WITH_LINK'],
    ['DOMINIO_EMPRESA', 'dmbbombas.com.br', 'Domínio do Google Workspace'],
    ['MOEDA', 'BRL', 'Moeda dos relatórios']
  ];
  defaults.forEach(function(item) {
    if (!current.some(function(row) { return row.CHAVE === item[0]; })) {
      appendObject_('CONFIG', { CHAVE: item[0], VALOR: item[1], DESCRICAO: item[2], ATUALIZADO_EM: nowIso_() });
    }
  });
}
