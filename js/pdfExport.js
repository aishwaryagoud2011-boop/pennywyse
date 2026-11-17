(function (global) {
  const PW = (global.PW = global.PW || {});

  function formatPdfCurrency(amount, currency, withSign = false) {
    const prefixMap = {
      INR: 'Rs. ',
      USD: '$',
      EUR: 'EUR ',
      GBP: 'GBP ',
    };
    const meta = PW.CURRENCY_META[currency] || PW.CURRENCY_META.INR;
    const formatted = Math.abs(amount).toLocaleString(meta.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = withSign ? (amount < 0 ? '-' : amount > 0 ? '+' : '') : amount < 0 ? '-' : '';
    return `${sign}${prefixMap[currency] || ''}${formatted}`;
  }

  function pdfEscape(str) {
    const ascii = String(str || '').replace(/[^\x20-\x7E]/g, ' ');
    return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function buildPdfDocument(pagesStreams) {
    const objects = [];
    const addObj = (body) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = addObj('');
    const pagesId = addObj('');
    const fontRegularId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const pageIds = [];
    for (const streamContent of pagesStreams) {
      const contentId = addObj(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
      const pageId = addObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    }

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  }

  function exportTransactionsCsv({ transactions, currency }) {
    const headers = ['Date', 'Name', 'Category', 'Type', 'Amount', 'Currency', 'Note'];
    const rows = transactions.map((tx) => {
      const dateFormatted = new Date(tx.dateISO).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return [
        `"${dateFormatted.replace(/"/g, '""')}"`,
        `"${String(tx.name).replace(/"/g, '""')}"`,
        `"${String(tx.category).replace(/"/g, '""')}"`,
        tx.type,
        Number(tx.amount).toFixed(2),
        currency,
        `"${String(tx.note || '').replace(/"/g, '""')}"`,
      ];
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pennywyse-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportTransactionsPdf({
    user,
    transactions,
    totalBalance,
    exportType,
    exportFromDate,
    exportToDate,
  }) {
    const margin = 40;
    const pageWidth = 595;
    const pageHeight = 842;
    const contentWidth = pageWidth - margin * 2;
    const toY = (top) => pageHeight - top;

    const drawText = (cmds, font, size, rgb, x, topY, text) => {
      cmds.push(
        `BT /${font} ${size} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg 1 0 0 1 ${x.toFixed(1)} ${toY(topY).toFixed(1)} Tm (${pdfEscape(text)}) Tj ET`
      );
    };

    const drawRightText = (cmds, font, size, rgb, rightX, topY, text) => {
      const approxWidth = text.length * size * 0.52;
      drawText(cmds, font, size, rgb, Math.max(margin, rightX - approxWidth), topY, text);
    };

    const drawRect = (cmds, rgb, x, topY, w, h) => {
      cmds.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x.toFixed(1)} ${(pageHeight - topY - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
    };

    const drawTableHeader = (cmds, topY) => {
      drawRect(cmds, [0.953, 0.957, 0.965], margin, topY, contentWidth, 24);
      const dark = [0.216, 0.255, 0.318];
      drawText(cmds, 'F2', 9, dark, margin + 8, topY + 15, 'Date');
      drawText(cmds, 'F2', 9, dark, margin + 105, topY + 15, 'Description');
      drawText(cmds, 'F2', 9, dark, margin + 275, topY + 15, 'Category');
      drawText(cmds, 'F2', 9, dark, margin + 385, topY + 15, 'Type');
      drawRightText(cmds, 'F2', 9, dark, pageWidth - margin - 8, topY + 15, 'Amount');
      return topY + 26;
    };

    const pages = [];
    let cmds = [];

    drawRect(cmds, [0.659, 0.059, 0.059], 0, 0, pageWidth, 82);
    drawText(cmds, 'F2', 20, [1, 1, 1], margin, 36, 'pennywyse');
    drawText(cmds, 'F1', 10, [1, 1, 1], margin, 54, 'Personal Transaction Statement');
    drawRightText(
      cmds,
      'F1',
      10,
      [1, 1, 1],
      pageWidth - margin,
      54,
      `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`
    );

    let y = 104;
    drawText(cmds, 'F2', 12, [0.09, 0.09, 0.09], margin, y, user.name);
    drawText(cmds, 'F1', 9.5, [0.39, 0.39, 0.39], margin, y + 14, `${user.email} | Currency: ${user.currency}`);

    const filterSummary =
      exportFromDate || exportToDate
        ? `Range: ${exportFromDate || 'Start'} to ${exportToDate || 'Today'} (${exportType.toUpperCase()})`
        : `Filter: ${exportType.toUpperCase()} (${transactions.length} records)`;
    drawRightText(cmds, 'F1', 9.5, [0.39, 0.39, 0.39], pageWidth - margin, y + 14, filterSummary);

    y += 28;
    drawRect(cmds, [0.976, 0.98, 0.984], margin, y, contentWidth, 52);

    const filteredIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const filteredExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const colW = contentWidth / 3;

    drawText(cmds, 'F1', 8.5, [0.42, 0.45, 0.5], margin + 12, y + 19, 'Current Total Balance');
    drawText(cmds, 'F2', 11, [0.09, 0.09, 0.09], margin + 12, y + 37, formatPdfCurrency(totalBalance, user.currency));

    drawText(cmds, 'F1', 8.5, [0.42, 0.45, 0.5], margin + colW + 12, y + 19, 'Filtered Income');
    drawText(cmds, 'F2', 11, [0.02, 0.59, 0.41], margin + colW + 12, y + 37, formatPdfCurrency(filteredIncome, user.currency, true));

    drawText(cmds, 'F1', 8.5, [0.42, 0.45, 0.5], margin + colW * 2 + 12, y + 19, 'Filtered Expenses');
    drawText(cmds, 'F2', 11, [0.73, 0.11, 0.11], margin + colW * 2 + 12, y + 37, formatPdfCurrency(-filteredExpenses, user.currency, true));

    y += 72;
    y = drawTableHeader(cmds, y);

    if (transactions.length === 0) {
      drawText(cmds, 'F1', 10, [0.42, 0.45, 0.5], margin + 8, y + 18, 'No transactions match the selected export filter.');
    } else {
      transactions.forEach((tx, idx) => {
        if (y > pageHeight - 60) {
          pages.push(cmds);
          cmds = [];
          y = drawTableHeader(cmds, 40);
        }
        if (idx % 2 === 1) {
          drawRect(cmds, [0.98, 0.98, 0.98], margin, y, contentWidth, 22);
        }
        const dateLabel = new Date(tx.dateISO).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });
        const nameText = tx.name.length > 26 ? `${tx.name.slice(0, 24)}..` : tx.name;
        const catText = tx.category.length > 18 ? `${tx.category.slice(0, 16)}..` : tx.category;
        const signedAmt = tx.type === 'income' ? tx.amount : -tx.amount;

        drawText(cmds, 'F1', 8.5, [0.29, 0.33, 0.39], margin + 8, y + 15, dateLabel);
        drawText(cmds, 'F2', 8.5, [0.07, 0.09, 0.15], margin + 105, y + 15, nameText);
        drawText(cmds, 'F1', 8.5, [0.29, 0.33, 0.39], margin + 275, y + 15, catText);
        drawText(cmds, 'F1', 8.5, [0.29, 0.33, 0.39], margin + 385, y + 15, tx.type === 'income' ? 'Income' : 'Expense');
        drawRightText(
          cmds,
          'F2',
          8.5,
          tx.type === 'income' ? [0.02, 0.59, 0.41] : [0.73, 0.11, 0.11],
          pageWidth - margin - 8,
          y + 15,
          formatPdfCurrency(signedAmt, user.currency, true)
        );
        y += 22;
      });
    }

    pages.push(cmds);

    const pageStreams = pages.map((pageCmds, i) => {
      drawText(
        pageCmds,
        'F1',
        8,
        [0.61, 0.64, 0.69],
        margin + 135,
        pageHeight - 24,
        `Pennywyse Personal Finance Record - Page ${i + 1} of ${pages.length}`
      );
      return pageCmds.join('\n');
    });

    const blob = buildPdfDocument(pageStreams);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pennywyse-statement-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  PW.exportTransactionsCsv = exportTransactionsCsv;
  PW.exportTransactionsPdf = exportTransactionsPdf;
})(window);
