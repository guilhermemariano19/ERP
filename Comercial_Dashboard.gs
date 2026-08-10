function apiDashboardInicial(token) {
  const session = requireSession_(token);
  return { user: publicSession_(session), expenseSummary: apiResumoDespesas(token, {}), modules: { expenses: true, advances: false, schedules: false, visits: false, crm: false } };
}
