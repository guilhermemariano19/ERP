function getOrCreateFolder_(name, parentFolder, propertyKey) {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(propertyKey);
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); } catch (error) { console.warn('Pasta anterior indisponível: ' + error.message); }
  }
  const folders = parentFolder ? parentFolder.getFoldersByName(name) : null;
  const folder = folders && folders.hasNext() ? folders.next() : (parentFolder ? parentFolder.createFolder(name) : DriveApp.createFolder(name));
  props.setProperty(propertyKey, folder.getId());
  return folder;
}

function saveReceipt_(session, receipt, expenseDate) {
  const mime = String(receipt.mimeType || '');
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) throw new Error('Formato de comprovante não permitido.');
  const bytes = Utilities.base64Decode(String(receipt.dataBase64 || '').replace(/^data:[^;]+;base64,/, ''));
  if (bytes.length > DMB_CONFIG.MAX_UPLOAD_BYTES) throw new Error('O comprovante ultrapassa 5 MB após a compressão.');
  const root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(DMB_CONFIG.PROPERTIES.RECEIPTS_FOLDER_ID));
  const parts = dateOnly_(expenseDate).split('-');
  const year = getChildFolder_(root, parts[0]); const month = getChildFolder_(year, parts[1]);
  const extension = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  const filename = dateOnly_(expenseDate).replace(/-/g, '') + '_' + sanitizeText_(session.name, 40).replace(/\s+/g, '_') + '_' + Utilities.getUuid().slice(0, 8) + extension;
  const file = month.createFile(Utilities.newBlob(bytes, mime, filename));
  if (String(getConfigValue_('COMPROVANTE_ACESSO', 'PRIVATE')).toUpperCase() === 'DOMAIN_WITH_LINK') {
    try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (error) { console.warn('Compartilhamento de domínio não aplicado: ' + error.message); }
  }
  return { id: file.getId(), url: file.getUrl() };
}

function getChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name); return folders.hasNext() ? folders.next() : parent.createFolder(name);
}
