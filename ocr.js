// Leitura de comprovantes via Tesseract.js (roda 100% no browser, sem API)

export async function lerComprovante(imageDataUrl, onProgress) {
  if (!window.Tesseract) throw new Error('Tesseract não disponível');
  const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'por+eng', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return parseRecibo(text);
}

function parseRecibo(text) {
  const linhas = text.split('\n').map(l => l.trim());
  let valor = null;

  // 1. Linha com TOTAL / A PAGAR próxima de um valor
  const reTotal = /(?:total|subtotal|a\s*pagar|valor\s*total|tot\.?)[^0-9\n]{0,10}(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i;
  const mTotal = text.match(reTotal);
  if (mTotal) {
    const v = Number(mTotal[1].replace(/\./g, '').replace(',', '.'));
    if (v > 0 && v < 100000) valor = v;
  }

  // 2. Maior valor com R$ explícito
  if (!valor) {
    const reMoeda = /R\$\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
    let m, maior = 0;
    while ((m = reMoeda.exec(text)) !== null) {
      const v = Number(m[1].replace(/\./g, '').replace(',', '.'));
      if (v > maior && v < 100000) maior = v;
    }
    if (maior > 0) valor = maior;
  }

  // 3. Maior número com 2 decimais no texto
  if (!valor) {
    const reNum = /\b(\d{1,5}[.,]\d{2})\b/g;
    let m, candidatos = [];
    while ((m = reNum.exec(text)) !== null) {
      const v = Number(m[1].replace(',', '.'));
      if (v > 0 && v < 100000) candidatos.push(v);
    }
    if (candidatos.length) valor = Math.max(...candidatos);
  }

  // Estabelecimento: primeiras linhas com texto real (sem só números/pontuação)
  const estab = linhas
    .filter(l => l.length >= 4 && !/^[\d\s./,:\-*|_]+$/.test(l) && !/^(cnpj|cpf|nf|nota|via|data|hora)/i.test(l))
    .slice(0, 2)
    .join(' — ')
    .replace(/\s+/g, ' ')
    .slice(0, 60)
    .trim();

  return {
    valor: valor != null ? Number(valor.toFixed(2)) : null,
    estab: estab || '',
  };
}
