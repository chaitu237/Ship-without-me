import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMoneyToPaise,
  calculateBill,
  deriveBillStatus,
  validateBill,
  parseSimpleCsv,
  toCsv,
} from '../lib/domain.mjs';

test('money is parsed into integer paise without floating point drift', () => {
  assert.equal(parseMoneyToPaise('0.10'), 10);
  assert.equal(parseMoneyToPaise('12,345.67'), 1234567);
  assert.equal(parseMoneyToPaise('-99.50'), -9950);
});

test('bill total supports mixed GST rates and deductions', () => {
  const result = calculateBill([
    { quantity: 2, ratePaise: 10000, gstRate: 18 },
    { quantity: 1.5, ratePaise: 20000, gstRate: 5 },
  ], 500, 1000);
  assert.equal(result.taxablePaise, 50000);
  assert.equal(result.taxPaise, 5100);
  assert.equal(result.grossPaise, 56100);
  assert.equal(result.payablePaise, 55600);
});

test('status is derived from append-only events', () => {
  const events = [
    { billId: 'b1', type: 'bill.created', occurredAt: '2026-08-01T10:00:00Z' },
    { billId: 'b1', type: 'bill.verified', occurredAt: '2026-08-01T11:00:00Z' },
    { billId: 'b1', type: 'bill.approved', occurredAt: '2026-08-01T12:00:00Z' },
  ];
  assert.equal(deriveBillStatus('b1', events), 'approved');
});

test('duplicate vendor invoice is rejected', () => {
  const vendors = [{ id: 'v1' }];
  const buses = [{ id: 'bus1' }];
  const existing = [{ vendorId: 'v1', invoiceNumber: 'INV-9' }];
  const errors = validateBill({
    vendorId: 'v1', busId: 'bus1', invoiceNumber: 'inv-9', invoiceDate: '2026-08-01',
    jobCardNumber: 'JC-1', lines: [{ description: 'Oil', quantity: 1, ratePaise: 100 }],
  }, vendors, buses, existing);
  assert.equal(errors.invoiceNumber, 'This vendor invoice number already exists.');
});

test('CSV parser preserves commas inside quoted cells', () => {
  const rows = parseSimpleCsv('Name,Notes\n"ABC Garage","Brake, clutch"\n');
  assert.deepEqual(rows, [['Name', 'Notes'], ['ABC Garage', 'Brake, clutch']]);
});

test('CSV export quotes values when necessary', () => {
  const csv = toCsv([{ name: 'ABC, Garage' }], [{ label: 'Name', value: (row) => row.name }]);
  assert.equal(csv, 'Name\n"ABC, Garage"\n');
});
