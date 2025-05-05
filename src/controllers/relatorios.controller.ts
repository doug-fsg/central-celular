// Corrigir tratamento para mês zero (janeiro)
exports.criarRelatorio = async (req, res) => {
  try {
    // Obter dados do corpo da requisição
    const { celulaId, mes, ano, observacoes } = req.body;
    
    // Verificação de campos obrigatórios
    const camposFaltando = [];
    if (celulaId === undefined) camposFaltando.push('celulaId');
    if (mes === undefined) camposFaltando.push('mes');
    if (ano === undefined) camposFaltando.push('ano');
    
    if (camposFaltando.length > 0) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios não informados',
        errors: camposFaltando.map(campo => `Campo '${campo}' é obrigatório`) 
      });
    }
    
    // Verificação CRÍTICA: mes deve estar entre 0 e 11 (janeiro a dezembro)
    if (mes < 0 || mes > 11) {
      return res.status(400).json({ 
        message: 'Mês inválido',
        errors: [`Mês deve estar entre 0 (janeiro) e 11 (dezembro), valor informado: ${mes}`] 
      });
    }
    
    // Verificar se já existe um relatório para este mês/ano/célula
    const relatorioExistente = await prisma.relatorio.findFirst({
      where: {
        celulaId: Number(celulaId),
        mes: Number(mes),
        ano: Number(ano)
      }
    });
    
    if (relatorioExistente) {
      return res.status(400).json({ 
        message: 'Já existe um relatório para este mês',
        errors: ['Não é possível criar mais de um relatório para o mesmo mês e célula'] 
      });
    }
    
    // Criar o relatório
    const novoRelatorio = await prisma.relatorio.create({
      data: {
        celulaId: Number(celulaId),
        mes: Number(mes),
        ano: Number(ano),
        observacoes: observacoes || ''
      }
    });
    
    res.status(201).json(novoRelatorio);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar relatório', errors: [error.message] });
  }
}; 