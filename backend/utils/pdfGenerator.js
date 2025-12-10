const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function gerarReciboPDF(familia, callback) {
  // Criar diretório de PDFs se não existir
  const pdfDir = path.join(__dirname, '../../pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const filename = `recibo_${familia.cod_familiar}_${Date.now()}.pdf`;
  const filepath = path.join(pdfDir, filename);

  // Criar documento PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filepath);

  doc.pipe(stream);

  // Cabeçalho
  doc
    .fontSize(20)
    .text('RECIBO DE ENTREGA', { align: 'center' })
    .moveDown();

  doc
    .fontSize(16)
    .text('Kit de Alimentação - Programa Bolsa Família', { align: 'center' })
    .moveDown(2);

  // Informações da família
  doc
    .fontSize(12)
    .text(`Código Familiar: ${familia.cod_familiar}`, { continued: false })
    .moveDown(0.5);

  doc
    .text(`Endereço: ${familia.endereco}${familia.bairro ? ' - ' + familia.bairro : ''}`)
    .moveDown(0.5);

  if (familia.telefone) {
    doc.text(`Telefone: ${familia.telefone}`).moveDown(0.5);
  }

  doc
    .text(`Número do Voucher: ${familia.numero_voucher}`)
    .moveDown(1.5);

  // Lista de membros
  if (familia.membros && familia.membros.length > 0) {
    doc
      .fontSize(14)
      .text('Membros da Família:', { underline: true })
      .moveDown(0.5);

    familia.membros.forEach((membro, index) => {
      doc
        .fontSize(11)
        .text(`${index + 1}. ${membro.nome}`)
        .fontSize(10)
        .text(`   CPF: ${membro.cpf} | NIS: ${membro.nis}`, { color: '#666' })
        .moveDown(0.3);
    });

    doc.moveDown(1);
  }

  // Data de entrega
  const dataAtual = new Date().toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  doc
    .text(`Data da Entrega: ${dataAtual}`)
    .moveDown(3);

  // Linha de assinatura
  doc
    .moveTo(100, doc.y)
    .lineTo(500, doc.y)
    .stroke();

  doc
    .moveDown(0.5)
    .fontSize(10)
    .text('Assinatura do Beneficiário', 100, doc.y, { align: 'center', width: 400 });

  // Rodapé
  doc
    .moveDown(3)
    .fontSize(8)
    .text('Este documento comprova o recebimento do Kit de Alimentação.', { align: 'center' })
    .text('Guarde este recibo para sua segurança.', { align: 'center' });

  doc.end();

  stream.on('finish', () => {
    callback(`/pdfs/${filename}`);
  });
}

module.exports = { gerarReciboPDF };
