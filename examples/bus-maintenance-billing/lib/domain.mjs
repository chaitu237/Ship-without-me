export const STATUS_ORDER = ['draft', 'verified', 'approved', 'paid', 'voided'];

export const STATUS_LABELS = {
  draft: 'Pending verification',
  verified: 'Verified',
  approved: 'Approved for payment',
  paid: 'Paid',
  voided: 'Voided',
};

export function parseMoneyToPaise(value) {
  const raw = String(value ?? '').trim().replace(/,/g, '');
  if (!raw) return 0;
  if (!/^-?\d+(?:\.\d{0,2})?$/.test(raw)) {
    throw new Error('Enter an amount with up to 2 decimal places.');
  }
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [rupees, decimals = ''] = unsigned.split('.');
  const paise = Number(rupees) * 100 + Number((decimals + '00').slice(0, 2));
  if (!Number.isSafeInteger(paise)) throw new Error('Amount is too large.');
  return negative ? -paise : paise;
}

export function formatMoney(paise, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);
}

export function calculateLine(line) {
  const quantityMilli = Math.max(0, Math.round(Number(line.quantity || 0) * 1000));
  const ratePaise = Number(line.ratePaise || 0);
  const taxablePaise = Math.round((quantityMilli * ratePaise) / 1000);
  const gstRateBps = Math.max(0, Math.round(Number(line.gstRate || 0) * 100));
  const taxPaise = Math.round((taxablePaise * gstRateBps) / 10000);
  return { ...line, quantityMilli, taxablePaise, taxPaise, totalPaise: taxablePaise + taxPaise };
}

export function calculateBill(lines, deductionPaise = 0, otherChargePaise = 0) {
  const calculated = (lines || []).map(calculateLine);
  const taxablePaise = calculated.reduce((sum, line) => sum + line.taxablePaise, 0);
  const taxPaise = calculated.reduce((sum, line) => sum + line.taxPaise, 0);
  const grossPaise = taxablePaise + taxPaise + Number(otherChargePaise || 0);
  const payablePaise = grossPaise - Number(deductionPaise || 0);
  return { lines: calculated, taxablePaise, taxPaise, grossPaise, payablePaise };
}

export function deriveBillStatus(billId, events) {
  const matching = (events || [])
    .filter((event) => event.billId === billId)
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));
  let status = 'draft';
  for (const event of matching) {
    if (event.type === 'bill.created') status = 'draft';
    if (event.type === 'bill.verified') status = 'verified';
    if (event.type === 'bill.approved') status = 'approved';
    if (event.type === 'bill.paid') status = 'paid';
    if (event.type === 'bill.voided') status = 'voided';
  }
  return status;
}

export function validateBill(input, vendors, buses, existingBills = []) {
  const errors = {};
  if (!input.vendorId || !(vendors || []).some((vendor) => vendor.id === input.vendorId)) {
    errors.vendorId = 'Choose a vendor from the vendor master.';
  }
  if (!input.busId || !(buses || []).some((bus) => bus.id === input.busId)) {
    errors.busId = 'Choose the bus this maintenance bill belongs to.';
  }
  if (!String(input.invoiceNumber || '').trim()) errors.invoiceNumber = 'Enter the vendor invoice number.';
  if (!input.invoiceDate) errors.invoiceDate = 'Enter the invoice date.';
  if (!input.jobCardNumber || !String(input.jobCardNumber).trim()) errors.jobCardNumber = 'Enter the job card / work order number.';
  const duplicate = (existingBills || []).some(
    (bill) =>
      bill.vendorId === input.vendorId &&
      String(bill.invoiceNumber).trim().toLowerCase() === String(input.invoiceNumber || '').trim().toLowerCase()
  );
  if (duplicate) errors.invoiceNumber = 'This vendor invoice number already exists.';
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    errors.lines = 'Add at least one part or service line.';
  } else {
    const badIndex = input.lines.findIndex(
      (line) => !String(line.description || '').trim() || Number(line.quantity || 0) <= 0 || Number(line.ratePaise || 0) < 0
    );
    if (badIndex >= 0) errors.lines = `Complete description, quantity and rate for line ${badIndex + 1}.`;
  }
  if (Number(input.odometerKm || 0) < 0) errors.odometerKm = 'Odometer cannot be negative.';
  return errors;
}

export function nextWorkflowAction(status) {
  if (status === 'draft') return { type: 'bill.verified', label: 'Verify bill' };
  if (status === 'verified') return { type: 'bill.approved', label: 'Approve for payment' };
  if (status === 'approved') return { type: 'bill.paid', label: 'Mark paid' };
  return null;
}

export function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows, columns) {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(',')).join('\n');
  return `${header}\n${body}${body ? '\n' : ''}`;
}

export function parseSimpleCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current || row.length) {
    row.push(current.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }
  return rows;
}

export function sanitizeRegistration(value) {
  return String(value || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

export function monthKey(dateString) {
  return String(dateString || '').slice(0, 7);
}
