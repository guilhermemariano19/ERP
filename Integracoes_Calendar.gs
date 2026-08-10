function criarEventoAgendamento_(agendamento) {
  if (!agendamento) throw new Error('Agendamento obrigatório.');
  return { prepared: true, module: 'Calendar' };
}
