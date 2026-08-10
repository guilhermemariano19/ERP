function getSpreadsheetInfo_() {
  const ss = getDatabase_(); return { id: ss.getId(), name: ss.getName(), url: ss.getUrl() };
}
