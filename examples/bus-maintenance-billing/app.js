import {
  STATUS_LABELS,
  parseMoneyToPaise,
  formatMoney,
  calculateBill,
  deriveBillStatus,
  validateBill,
  nextWorkflowAction,
  toCsv,
  parseSimpleCsv,
  sanitizeRegistration,
  monthKey,
} from './lib/domain.mjs';
import { seedState } from './lib/seed.mjs';

const STORAGE_KEY = 'fleetledger:state:v1';
const DRAFT_KEY = 'fleetledger:bill-draft:v1';
const THEME_KEY = 'fleetledger:theme';
const main = document.querySelector('#main-content');
const pageTitle = document.querySelector('#page-title');
const orgLabel = document.querySelector('#org-label');
const toastRegion = document.querySelector('#toast-region');
const announcer = document.querySelector('#form-announcer');
let draftTimer = null;

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const todayLocal = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 1 && Array.isArray(saved.bills) && Array.isArray(saved.events)) return saved;
  } catch {}
  const initial = clone(seedState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

let state = loadState();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

function vendorById(id) { return state.vendors.find((item) => item.id === id); }
function busById(id) { return state.buses.find((item) => item.id === id); }
function billStatus(bill) { return deriveBillStatus(bill.id, state.events); }
function billTotals(bill) { return calculateBill(bill.lines, bill.deductionPaise, bill.otherChargePaise); }
function billEvents(id) { return state.events.filter((event) => event.billId === id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)); }

function currentView() {
  const params = new URLSearchParams(location.search);
  return params.get('view') || 'dashboard';
}

function navigate(view, params = {}) {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('view', view);
  Object.entries(params).forEach(([key, value]) => value != null && value !== '' && url.searchParams.set(key, value));
  history.pushState({}, '', url);
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function replaceParams(changes) {
  const url = new URL(location.href);
  Object.entries(changes).forEach(([key, value]) => {
    if (value == null || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  history.replaceState({}, '', url);
}

function setActiveNav(view) {
  const root = view.startsWith('bill') ? 'bills' : view;
  document.querySelectorAll('[data-route]').forEach((button) => button.classList.toggle('active', button.dataset.route === root));
}

function badge(status) {
  return `<span class="badge ${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
}

function friendlyDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function friendlyMoment(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function eventLabel(type) {
  return ({
    'bill.created': 'Bill entered',
    'bill.verified': 'Bill verified',
    'bill.approved': 'Approved for payment',
    'bill.paid': 'Payment recorded',
    'bill.voided': 'Bill voided',
  })[type] || type;
}

function monthDiff(current, previous) {
  if (!previous && current) return 'New this month';
  if (!previous && !current) return 'No change';
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs previous month`;
}

function renderDashboard() {
  const nowMonth = monthKey(todayLocal());
  const date = new Date(`${todayLocal()}T00:00:00`);
  const prior = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const priorMonth = `${prior.getFullYear()}-${String(prior.getMonth() + 1).padStart(2, '0')}`;
  const enriched = state.bills.map((bill) => ({ bill, status: billStatus(bill), totals: billTotals(bill) }));
  const pending = enriched.filter((item) => item.status === 'draft');
  const approved = enriched.filter((item) => item.status === 'approved');
  const paidCurrent = enriched.filter((item) => item.status === 'paid' && billEvents(item.bill.id).some((e) => e.type === 'bill.paid' && monthKey(e.paymentDate || e.occurredAt) === nowMonth));
  const paidPrevious = enriched.filter((item) => item.status === 'paid' && billEvents(item.bill.id).some((e) => e.type === 'bill.paid' && monthKey(e.paymentDate || e.occurredAt) === priorMonth));
  const invoicedCurrent = enriched.filter((item) => monthKey(item.bill.invoiceDate) === nowMonth && item.status !== 'voided');
  const invoicedPrevious = enriched.filter((item) => monthKey(item.bill.invoiceDate) === priorMonth && item.status !== 'voided');
  const paidCurrentPaise = paidCurrent.reduce((sum, item) => sum + item.totals.payablePaise, 0);
  const paidPreviousPaise = paidPrevious.reduce((sum, item) => sum + item.totals.payablePaise, 0);
  const currentInvoicedPaise = invoicedCurrent.reduce((sum, item) => sum + item.totals.payablePaise, 0);
  const previousInvoicedPaise = invoicedPrevious.reduce((sum, item) => sum + item.totals.payablePaise, 0);
  const approvedPaise = approved.reduce((sum, item) => sum + item.totals.payablePaise, 0);
  const queue = enriched.filter((item) => ['draft', 'verified', 'approved'].includes(item.status)).sort((a, b) => b.bill.invoiceDate.localeCompare(a.bill.invoiceDate)).slice(0, 6);

  const byBus = new Map();
  invoicedCurrent.forEach((item) => byBus.set(item.bill.busId, (byBus.get(item.bill.busId) || 0) + item.totals.payablePaise));
  const busSpend = [...byBus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxBusSpend = Math.max(1, ...busSpend.map(([, value]) => value));

  main.innerHTML = `
    <section class="page">
      <div class="page-heading">
        <div>
          <h2>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} · ${new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</h2>
          <p>See what needs attention before another maintenance invoice reaches accounts.</p>
        </div>
        <div class="page-actions"><button class="button" id="new-bill">+ New maintenance bill</button></div>
      </div>

      <div class="stats-grid">
        <article class="stat-card"><div class="stat-label">Pending verification</div><div class="stat-value">${pending.length}</div><div class="stat-delta attention">Needs supervisor check</div></article>
        <article class="stat-card"><div class="stat-label">Approved · unpaid</div><div class="stat-value">${formatMoney(approvedPaise)}</div><div class="stat-delta">Ready for accounts</div></article>
        <article class="stat-card"><div class="stat-label">Paid this month</div><div class="stat-value">${formatMoney(paidCurrentPaise)}</div><div class="stat-delta positive">${esc(monthDiff(paidCurrentPaise, paidPreviousPaise))}</div></article>
        <article class="stat-card"><div class="stat-label">Invoices this month</div><div class="stat-value">${formatMoney(currentInvoicedPaise)}</div><div class="stat-delta">${esc(monthDiff(currentInvoicedPaise, previousInvoicedPaise))}</div></article>
      </div>

      <div class="dashboard-grid">
        <section class="card">
          <div class="card-header"><div><h3>Action queue</h3><p>Oldest work should not disappear inside a spreadsheet.</p></div><button class="ghost-button compact" id="all-bills">View all</button></div>
          <div class="card-body">
            ${queue.length ? `<div class="workflow-list">${queue.map(({ bill, status, totals }) => `
              <div class="workflow-row">
                <div><button class="row-button open-bill" data-bill-id="${esc(bill.id)}">${esc(bill.invoiceNumber)}</button><div class="small muted">${esc(vendorById(bill.vendorId)?.name || 'Unknown vendor')} · ${esc(busById(bill.busId)?.registration || 'Unknown bus')}</div></div>
                <div>${badge(status)}</div><strong class="money">${formatMoney(totals.payablePaise)}</strong>
              </div>`).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">✓</div><strong>Queue is clear</strong><span>No bills need verification, approval or payment.</span></div>`}
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h3>Spend by bus</h3><p>${esc(nowMonth)} invoice value</p></div></div>
          <div class="card-body">
            ${busSpend.length ? busSpend.map(([busId, value]) => {
              const bus = busById(busId);
              const width = Math.max(8, Math.round((value / maxBusSpend) * 100));
              return `<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;gap:12px"><strong>${esc(bus?.registration || busId)}</strong><span class="money">${formatMoney(value)}</span></div><div aria-hidden="true" style="height:8px;background:var(--n-2);border-radius:999px;margin-top:8px;overflow:hidden"><div style="width:${width}%;height:100%;background:var(--accent);border-radius:999px"></div></div></div>`;
            }).join('') : '<div class="empty-state"><strong>No invoice spend this month</strong></div>'}
          </div>
        </section>
      </div>

      <div class="notice warning"><strong>MVP boundary:</strong> this branch stores data in the current browser and records payment references only. It does not initiate bank payments or file GST/TDS returns.</div>
    </section>`;

  document.querySelector('#new-bill').addEventListener('click', () => navigate('bill-new'));
  document.querySelector('#all-bills').addEventListener('click', () => navigate('bills'));
  document.querySelectorAll('.open-bill').forEach((button) => button.addEventListener('click', () => navigate('bill-detail', { id: button.dataset.billId })));
}

function filteredBills() {
  const params = new URLSearchParams(location.search);
  const q = (params.get('q') || '').trim().toLowerCase();
  const status = params.get('status') || 'all';
  return state.bills
    .map((bill) => ({ bill, status: billStatus(bill), totals: billTotals(bill) }))
    .filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (!q) return true;
      const haystack = [item.bill.invoiceNumber, item.bill.jobCardNumber, vendorById(item.bill.vendorId)?.name, busById(item.bill.busId)?.registration].join(' ').toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => b.bill.invoiceDate.localeCompare(a.bill.invoiceDate));
}

function renderBills() {
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const selectedStatus = params.get('status') || 'all';
  const rows = filteredBills();
  main.innerHTML = `
    <section class="page">
      <div class="page-heading">
        <div><h2>Maintenance bills</h2><p>Find an invoice by vendor, vehicle, invoice number or job card.</p></div>
        <div class="page-actions">
          <button class="ghost-button" id="import-bills">Import CSV</button>
          <button class="ghost-button" id="export-bills">Export ${rows.length} filtered</button>
          <button class="button" id="new-bill">+ New bill</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="field grow"><label for="bill-search">Search</label><input class="input" id="bill-search" type="search" value="${esc(q)}" placeholder="Invoice, vendor, bus or job card" autocomplete="off" /></div>
        <div class="field"><label for="bill-status">Status</label><select id="bill-status">
          ${['all','draft','verified','approved','paid','voided'].map((value) => `<option value="${value}" ${selectedStatus === value ? 'selected' : ''}>${value === 'all' ? 'All statuses' : STATUS_LABELS[value]}</option>`).join('')}
        </select></div>
      </div>
      <section class="card">
        ${rows.length ? `
          <div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Vendor</th><th>Bus</th><th>Invoice date</th><th>Status</th><th class="numeric">Payable</th></tr></thead><tbody>
            ${rows.map(({ bill, status, totals }) => `<tr>
              <td><button class="row-button open-bill" data-bill-id="${esc(bill.id)}">${esc(bill.invoiceNumber)}</button><div class="small muted">${esc(bill.jobCardNumber)}</div></td>
              <td>${esc(vendorById(bill.vendorId)?.name || 'Unknown')}</td><td>${esc(busById(bill.busId)?.registration || 'Unknown')}</td><td>${friendlyDate(bill.invoiceDate)}</td><td>${badge(status)}</td><td class="numeric"><strong>${formatMoney(totals.payablePaise)}</strong></td>
            </tr>`).join('')}
          </tbody></table></div>
          <div class="mobile-cards">${rows.map(({ bill, status, totals }) => `<article class="record-card"><div class="record-card-top"><button class="row-button open-bill" data-bill-id="${esc(bill.id)}">${esc(bill.invoiceNumber)}</button>${badge(status)}</div><p><strong>${esc(vendorById(bill.vendorId)?.name || 'Unknown')}</strong></p><p class="small muted">${esc(busById(bill.busId)?.registration || 'Unknown')} · ${friendlyDate(bill.invoiceDate)}</p><div class="record-card-bottom"><span class="small muted">${esc(bill.jobCardNumber)}</span><strong class="money">${formatMoney(totals.payablePaise)}</strong></div></article>`).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">₹</div><strong>No bills match this view</strong><span>Clear the filters or enter a new maintenance bill.</span></div>`}
      </section>
      <input id="bill-import-file" type="file" accept=".csv,text/csv" class="sr-only" />
    </section>`;

  let searchTimer;
  document.querySelector('#bill-search').addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { replaceParams({ q: event.target.value }); renderBills(); }, 250);
  });
  document.querySelector('#bill-status').addEventListener('change', (event) => { replaceParams({ status: event.target.value === 'all' ? '' : event.target.value }); renderBills(); });
  document.querySelector('#new-bill').addEventListener('click', () => navigate('bill-new'));
  document.querySelectorAll('.open-bill').forEach((button) => button.addEventListener('click', () => navigate('bill-detail', { id: button.dataset.billId })));
  document.querySelector('#export-bills').addEventListener('click', () => exportBills(rows));
  const fileInput = document.querySelector('#bill-import-file');
  document.querySelector('#import-bills').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => importBillsCsv(fileInput.files?.[0]));
}

function blankDraft() {
  const invoiceDate = todayLocal();
  return { vendorId: '', busId: '', invoiceNumber: '', invoiceDate, dueDate: '', jobCardNumber: '', odometerKm: '', taxMode: 'intra', notes: '', deduction: '', otherCharge: '', lines: [{ id: uid('draft-line'), category: 'Part', description: '', quantity: '1', rate: '', gstRate: '18' }] };
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || blankDraft(); } catch { return blankDraft(); }
}

function renderNewBill() {
  const draft = loadDraft();
  main.innerHTML = `
    <section class="page">
      <div class="page-heading"><div><button class="ghost-button compact" id="back-bills">← Bills</button><h2 style="margin-top:12px">New maintenance bill</h2><p>Capture the vendor invoice once. Verification and payment history are added later without overwriting it.</p></div></div>
      <form id="bill-form" novalidate>
        <div class="form-layout">
          <section class="card form-card">
            <div class="form-section">
              <div><h3>Invoice & vehicle</h3><p class="small muted">Use the same identifiers printed on the vendor bill and workshop job card.</p></div>
              <div class="form-grid three">
                <div class="field"><label for="vendorId">Vendor</label><select id="vendorId" name="vendorId"><option value="">Choose vendor</option>${state.vendors.map((vendor) => `<option value="${esc(vendor.id)}" ${draft.vendorId === vendor.id ? 'selected' : ''}>${esc(vendor.name)}</option>`).join('')}</select><span class="error-text" data-error-for="vendorId"></span></div>
                <div class="field"><label for="busId">Bus</label><select id="busId" name="busId"><option value="">Choose bus</option>${state.buses.filter((bus) => bus.active !== false).map((bus) => `<option value="${esc(bus.id)}" ${draft.busId === bus.id ? 'selected' : ''}>${esc(bus.registration)} · ${esc(bus.makeModel)}</option>`).join('')}</select><span class="error-text" data-error-for="busId"></span></div>
                <div class="field"><label for="jobCardNumber">Job card / work order</label><input class="input" id="jobCardNumber" name="jobCardNumber" value="${esc(draft.jobCardNumber)}" autocomplete="off" /><span class="error-text" data-error-for="jobCardNumber"></span></div>
                <div class="field"><label for="invoiceNumber">Vendor invoice number</label><input class="input" id="invoiceNumber" name="invoiceNumber" value="${esc(draft.invoiceNumber)}" autocomplete="off" /><span class="error-text" data-error-for="invoiceNumber"></span></div>
                <div class="field"><label for="invoiceDate">Invoice date</label><input class="input" id="invoiceDate" name="invoiceDate" type="date" value="${esc(draft.invoiceDate)}" /><span class="error-text" data-error-for="invoiceDate"></span></div>
                <div class="field"><label for="dueDate">Due date</label><input class="input" id="dueDate" name="dueDate" type="date" value="${esc(draft.dueDate)}" /><span class="field-hint">Defaults from vendor payment terms.</span></div>
                <div class="field"><label for="odometerKm">Odometer (km)</label><input class="input" id="odometerKm" name="odometerKm" type="number" inputmode="numeric" min="0" step="1" value="${esc(draft.odometerKm)}" /><span class="error-text" data-error-for="odometerKm"></span></div>
                <div class="field"><label for="taxMode">GST treatment</label><select id="taxMode" name="taxMode"><option value="intra" ${draft.taxMode === 'intra' ? 'selected' : ''}>Intra-state · CGST + SGST</option><option value="inter" ${draft.taxMode === 'inter' ? 'selected' : ''}>Inter-state · IGST</option><option value="none" ${draft.taxMode === 'none' ? 'selected' : ''}>No GST / exempt</option></select></div>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-head"><div><h3>Parts & services</h3><p class="small muted">GST is calculated per line so mixed-rate bills reconcile correctly.</p></div><button class="ghost-button compact" type="button" id="add-line">+ Add line</button></div>
              <div class="line-items" id="line-items">${draft.lines.map(renderLineItem).join('')}</div>
              <span class="error-text" data-error-for="lines"></span>
            </div>

            <div class="form-section">
              <h3>Adjustments & notes</h3>
              <div class="form-grid">
                <div class="field"><label for="deduction">Deduction / withholding</label><input class="input" id="deduction" name="deduction" inputmode="decimal" value="${esc(draft.deduction)}" placeholder="0.00" /><span class="field-hint">Record an approved deduction amount; this app does not determine tax applicability.</span></div>
                <div class="field"><label for="otherCharge">Other charge</label><input class="input" id="otherCharge" name="otherCharge" inputmode="decimal" value="${esc(draft.otherCharge)}" placeholder="0.00" /></div>
              </div>
              <div class="field"><label for="notes">Maintenance note</label><textarea id="notes" name="notes" maxlength="500" placeholder="What work was done, exceptions, or reference notes">${esc(draft.notes)}</textarea><span class="field-hint"><span id="notes-count">${String(draft.notes || '').length}</span> / 500</span></div>
            </div>

            <div class="form-footer"><span class="draft-note" id="draft-note">Draft autosaves in this browser.</span><button class="ghost-button" type="button" id="discard-draft">Discard draft</button><button class="button" type="submit" id="save-bill">Save bill for verification</button></div>
          </section>

          <aside class="card form-card summary-card" aria-label="Bill summary">
            <div><h3>Bill summary</h3><p class="small muted">Calculated from the line items above.</p></div>
            <div class="summary-lines" id="bill-summary"></div>
            <div class="notice">The saved invoice is immutable. If it is wrong after entry, void it and create the corrected bill so the audit trail remains intact.</div>
          </aside>
        </div>
      </form>
    </section>`;

  const form = document.querySelector('#bill-form');
  document.querySelector('#back-bills').addEventListener('click', () => navigate('bills'));
  document.querySelector('#add-line').addEventListener('click', () => {
    document.querySelector('#line-items').insertAdjacentHTML('beforeend', renderLineItem({ id: uid('draft-line'), category: 'Part', description: '', quantity: '1', rate: '', gstRate: '18' }));
    wireLineButtons(); updateBillSummary(); scheduleDraftSave();
  });
  wireLineButtons();
  form.addEventListener('input', (event) => {
    if (event.target.id === 'notes') document.querySelector('#notes-count').textContent = event.target.value.length;
    updateBillSummary(); scheduleDraftSave();
  });
  form.addEventListener('change', (event) => {
    if (event.target.id === 'vendorId' && !document.querySelector('#dueDate').value) applyVendorTerms();
    if (event.target.id === 'taxMode' && event.target.value === 'none') {
      form.querySelectorAll('[data-line-field="gstRate"]').forEach((select) => { select.value = '0'; });
    }
    updateBillSummary(); scheduleDraftSave();
  });
  form.addEventListener('submit', submitBill);
  document.querySelector('#discard-draft').addEventListener('click', () => {
    if (confirm('Discard this unsaved bill draft?')) { localStorage.removeItem(DRAFT_KEY); renderNewBill(); showToast('Draft discarded.'); }
  });
  updateBillSummary();
}

function renderLineItem(line) {
  return `<div class="line-item" data-line-id="${esc(line.id || uid('draft-line'))}">
    <div class="field"><label>Type</label><select data-line-field="category"><option ${line.category === 'Part' ? 'selected' : ''}>Part</option><option ${line.category === 'Service' ? 'selected' : ''}>Service</option></select></div>
    <div class="field description-field"><label>Description</label><input class="input" data-line-field="description" value="${esc(line.description)}" autocomplete="off" /></div>
    <div class="field"><label>Qty</label><input class="input" data-line-field="quantity" type="number" inputmode="decimal" min="0.001" step="0.001" value="${esc(line.quantity)}" /></div>
    <div class="field"><label>Rate (₹)</label><input class="input" data-line-field="rate" inputmode="decimal" value="${esc(line.rate)}" placeholder="0.00" /></div>
    <div class="field"><label>GST</label><select data-line-field="gstRate">${[0,5,12,18,28].map((rate) => `<option value="${rate}" ${Number(line.gstRate) === rate ? 'selected' : ''}>${rate}%</option>`).join('')}</select></div>
    <button class="ghost-button compact remove-line" type="button" aria-label="Remove line">Remove</button>
    <div class="line-total" data-line-total style="grid-column:1/-1">Line total ₹0.00</div>
  </div>`;
}

function wireLineButtons() {
  document.querySelectorAll('.remove-line').forEach((button) => {
    button.onclick = () => {
      const all = document.querySelectorAll('.line-item');
      if (all.length === 1) { showToast('A bill needs at least one line item.'); return; }
      button.closest('.line-item').remove(); updateBillSummary(); scheduleDraftSave();
    };
  });
}

function collectDraft({ strict = false } = {}) {
  const get = (id) => document.querySelector(`#${id}`)?.value ?? '';
  const lines = [...document.querySelectorAll('.line-item')].map((row) => {
    const field = (name) => row.querySelector(`[data-line-field="${name}"]`)?.value ?? '';
    let ratePaise = 0;
    try { ratePaise = parseMoneyToPaise(field('rate')); } catch { if (strict) throw new Error('Check the rate amount on each line.'); }
    return { id: row.dataset.lineId, category: field('category'), description: field('description'), quantity: field('quantity'), rate: field('rate'), ratePaise, gstRate: field('gstRate') };
  });
  let deductionPaise = 0; let otherChargePaise = 0;
  try { deductionPaise = parseMoneyToPaise(get('deduction')); } catch { if (strict) throw new Error('Check the deduction amount.'); }
  try { otherChargePaise = parseMoneyToPaise(get('otherCharge')); } catch { if (strict) throw new Error('Check the other charge amount.'); }
  return {
    vendorId: get('vendorId'), busId: get('busId'), invoiceNumber: get('invoiceNumber'), invoiceDate: get('invoiceDate'), dueDate: get('dueDate'),
    jobCardNumber: get('jobCardNumber'), odometerKm: get('odometerKm'), taxMode: get('taxMode'), notes: get('notes'), deduction: get('deduction'), otherCharge: get('otherCharge'),
    deductionPaise, otherChargePaise, lines,
  };
}

function scheduleDraftSave() {
  clearTimeout(draftTimer);
  document.querySelector('#draft-note').textContent = 'Saving draft…';
  draftTimer = setTimeout(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft())); document.querySelector('#draft-note').textContent = 'Draft saved locally.'; } catch {}
  }, 450);
}

function updateBillSummary() {
  const draft = collectDraft();
  const totals = calculateBill(draft.lines, draft.deductionPaise, draft.otherChargePaise);
  document.querySelectorAll('.line-item').forEach((row, index) => {
    const line = totals.lines[index];
    row.querySelector('[data-line-total]').textContent = `Line total ${formatMoney(line?.totalPaise || 0)}`;
  });
  const taxName = draft.taxMode === 'inter' ? 'IGST' : draft.taxMode === 'intra' ? 'GST total' : 'Tax';
  document.querySelector('#bill-summary').innerHTML = `
    <div class="summary-row"><span>Taxable value</span><strong>${formatMoney(totals.taxablePaise)}</strong></div>
    <div class="summary-row"><span>${taxName}</span><strong>${formatMoney(totals.taxPaise)}</strong></div>
    ${draft.taxMode === 'intra' ? `<div class="summary-row small muted"><span>CGST / SGST</span><span>${formatMoney(Math.round(totals.taxPaise / 2))} / ${formatMoney(totals.taxPaise - Math.round(totals.taxPaise / 2))}</span></div>` : ''}
    <div class="summary-row"><span>Other charge</span><strong>${formatMoney(draft.otherChargePaise)}</strong></div>
    <div class="summary-row"><span>Deduction</span><strong>− ${formatMoney(draft.deductionPaise)}</strong></div>
    <div class="summary-row total"><span>Net payable</span><span>${formatMoney(totals.payablePaise)}</span></div>`;
}

function applyVendorTerms() {
  const vendor = vendorById(document.querySelector('#vendorId').value);
  const invoiceDate = document.querySelector('#invoiceDate').value;
  if (!vendor || !invoiceDate) return;
  const date = new Date(`${invoiceDate}T00:00:00`);
  date.setDate(date.getDate() + Number(vendor.termsDays || 0));
  document.querySelector('#dueDate').value = date.toISOString().slice(0, 10);
}

function clearErrors() {
  document.querySelectorAll('[data-error-for]').forEach((el) => { el.textContent = ''; });
  document.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
}

function showFormErrors(errors) {
  clearErrors();
  Object.entries(errors).forEach(([key, message]) => {
    const error = document.querySelector(`[data-error-for="${key}"]`);
    const field = document.querySelector(`#${key}`);
    if (error) error.textContent = message;
    if (field) field.classList.add('error');
  });
  const firstKey = Object.keys(errors)[0];
  const first = document.querySelector(`#${firstKey}`) || document.querySelector('[data-error-for="lines"]');
  if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus?.(); }
  announcer.textContent = `${Object.keys(errors).length} problem${Object.keys(errors).length === 1 ? '' : 's'} prevented saving. Review the fields marked below.`;
}

function submitBill(event) {
  event.preventDefault();
  clearErrors();
  const button = document.querySelector('#save-bill');
  button.disabled = true; button.textContent = 'Saving…';
  try {
    const draft = collectDraft({ strict: true });
    const input = {
      ...draft,
      invoiceNumber: draft.invoiceNumber.trim(),
      jobCardNumber: draft.jobCardNumber.trim(),
      odometerKm: Number(draft.odometerKm || 0),
      lines: draft.lines.map((line) => ({ id: uid('line'), category: line.category, description: line.description.trim(), quantity: Number(line.quantity), ratePaise: line.ratePaise, gstRate: Number(line.gstRate) })),
    };
    const errors = validateBill(input, state.vendors, state.buses, state.bills);
    const totals = calculateBill(input.lines, input.deductionPaise, input.otherChargePaise);
    if (totals.payablePaise < 0) errors.deduction = 'Deduction cannot make the payable amount negative.';
    if (Object.keys(errors).length) { showFormErrors(errors); return; }
    const bill = {
      id: uid('bill'), vendorId: input.vendorId, busId: input.busId, invoiceNumber: input.invoiceNumber, invoiceDate: input.invoiceDate,
      dueDate: input.dueDate || null, jobCardNumber: input.jobCardNumber, odometerKm: input.odometerKm, taxMode: input.taxMode, currency: 'INR', notes: input.notes.trim(),
      deductionPaise: input.deductionPaise, otherChargePaise: input.otherChargePaise, lines: input.lines,
    };
    state.bills.push(bill);
    state.events.push({ id: uid('event'), billId: bill.id, type: 'bill.created', occurredAt: new Date().toISOString(), actor: 'Maintenance Billing' });
    persist(); localStorage.removeItem(DRAFT_KEY);
    showToast(`Bill ${bill.invoiceNumber} saved for verification.`);
    navigate('bill-detail', { id: bill.id });
  } catch (error) {
    announcer.textContent = error.message;
    showToast(error.message);
  } finally {
    button.disabled = false; button.textContent = 'Save bill for verification';
  }
}

function renderBillDetail() {
  const id = new URLSearchParams(location.search).get('id');
  const bill = state.bills.find((item) => item.id === id);
  if (!bill) { main.innerHTML = '<div class="empty-state"><strong>Bill not found</strong><button class="ghost-button" id="back-bills">Back to bills</button></div>'; document.querySelector('#back-bills').onclick = () => navigate('bills'); return; }
  const status = billStatus(bill);
  const totals = billTotals(bill);
  const vendor = vendorById(bill.vendorId);
  const bus = busById(bill.busId);
  const action = nextWorkflowAction(status);
  const events = billEvents(bill.id);

  main.innerHTML = `
    <section class="page">
      <div class="page-heading"><div><button class="ghost-button compact" id="back-bills">← Bills</button><h2 style="margin-top:12px">${esc(bill.invoiceNumber)}</h2><p>${esc(vendor?.name || 'Unknown vendor')} · ${esc(bus?.registration || 'Unknown bus')}</p></div><div class="page-actions">${badge(status)}</div></div>
      <div class="detail-grid">
        <div class="page" style="gap:16px">
          <section class="card"><div class="card-header"><div><h3>Invoice record</h3><p>Original entry is preserved; lifecycle changes appear in activity.</p></div></div><div class="card-body">
            <dl class="definition-grid">
              <div class="definition"><dt>Vendor</dt><dd>${esc(vendor?.name || 'Unknown')}</dd></div><div class="definition"><dt>GSTIN</dt><dd>${esc(vendor?.gstin || 'Not recorded')}</dd></div><div class="definition"><dt>Bus</dt><dd>${esc(bus?.registration || 'Unknown')}</dd></div>
              <div class="definition"><dt>Job card</dt><dd>${esc(bill.jobCardNumber)}</dd></div><div class="definition"><dt>Invoice date</dt><dd>${friendlyDate(bill.invoiceDate)}</dd></div><div class="definition"><dt>Due date</dt><dd>${friendlyDate(bill.dueDate)}</dd></div>
              <div class="definition"><dt>Odometer</dt><dd>${Number(bill.odometerKm || 0).toLocaleString('en-IN')} km</dd></div><div class="definition"><dt>Tax treatment</dt><dd>${bill.taxMode === 'intra' ? 'CGST + SGST' : bill.taxMode === 'inter' ? 'IGST' : 'No GST / exempt'}</dd></div><div class="definition"><dt>Net payable</dt><dd>${formatMoney(totals.payablePaise)}</dd></div>
            </dl>
            ${bill.notes ? `<p class="notice" style="margin-top:20px">${esc(bill.notes)}</p>` : ''}
          </div></section>

          <section class="card"><div class="card-header"><div><h3>Parts & services</h3><p>${bill.lines.length} line item${bill.lines.length === 1 ? '' : 's'}</p></div></div>
            <div class="table-wrap" style="display:block"><table style="min-width:640px"><thead><tr><th>Type</th><th>Description</th><th class="numeric">Qty</th><th class="numeric">Rate</th><th class="numeric">GST</th><th class="numeric">Total</th></tr></thead><tbody>
              ${totals.lines.map((line) => `<tr><td>${esc(line.category)}</td><td>${esc(line.description)}</td><td class="numeric">${Number(line.quantity).toLocaleString('en-IN')}</td><td class="numeric">${formatMoney(line.ratePaise)}</td><td class="numeric">${Number(line.gstRate)}%</td><td class="numeric"><strong>${formatMoney(line.totalPaise)}</strong></td></tr>`).join('')}
            </tbody></table></div>
            <div class="card-body"><div class="summary-lines" style="margin-left:auto;max-width:360px"><div class="summary-row"><span>Taxable</span><strong>${formatMoney(totals.taxablePaise)}</strong></div><div class="summary-row"><span>GST</span><strong>${formatMoney(totals.taxPaise)}</strong></div><div class="summary-row"><span>Other charge</span><strong>${formatMoney(bill.otherChargePaise)}</strong></div><div class="summary-row"><span>Deduction</span><strong>− ${formatMoney(bill.deductionPaise)}</strong></div><div class="summary-row total"><span>Net payable</span><span>${formatMoney(totals.payablePaise)}</span></div></div></div>
          </section>
        </div>

        <aside class="page" style="gap:16px">
          <section class="card form-card">
            <div><h3>Workflow</h3><p class="small muted">Each action appends a timestamped event.</p></div>
            ${action && action.type !== 'bill.paid' ? `<button class="button" id="advance-bill" data-event-type="${action.type}">${esc(action.label)}</button>` : ''}
            ${action?.type === 'bill.paid' ? `<form id="payment-form" class="form-section" novalidate><div class="field"><label for="paymentReference">Payment reference / UTR</label><input class="input" id="paymentReference" autocomplete="off" /><span class="error-text" id="paymentReferenceError"></span></div><div class="field"><label for="paymentDate">Payment date</label><input class="input" id="paymentDate" type="date" value="${todayLocal()}" /></div><button class="button" type="submit">Mark paid</button></form>` : ''}
            ${!['paid','voided'].includes(status) ? `<button class="danger-button" id="void-bill">Void bill</button>` : ''}
            ${status === 'paid' ? '<div class="notice"><strong>Closed:</strong> payment has been recorded for this invoice.</div>' : ''}
            ${status === 'voided' ? '<div class="notice danger"><strong>Voided:</strong> this invoice remains visible for audit history.</div>' : ''}
          </section>
          <section class="card"><div class="card-header"><div><h3>Activity</h3><p>Newest first</p></div></div><div class="card-body timeline">
            ${events.map((event) => `<div class="timeline-item"><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-content"><p><strong>${esc(eventLabel(event.type))}</strong></p><p class="small muted">${esc(event.actor)} · ${friendlyMoment(event.occurredAt)}</p>${event.paymentReference ? `<p class="small">Ref: ${esc(event.paymentReference)}</p>` : ''}</div></div>`).join('')}
          </div></section>
        </aside>
      </div>
    </section>`;

  document.querySelector('#back-bills').onclick = () => navigate('bills');
  const advance = document.querySelector('#advance-bill');
  if (advance) advance.onclick = () => appendWorkflowEvent(bill.id, advance.dataset.eventType);
  const voidButton = document.querySelector('#void-bill');
  if (voidButton) voidButton.onclick = () => {
    if (confirm(`Void invoice ${bill.invoiceNumber}? The record will remain in history.`)) appendWorkflowEvent(bill.id, 'bill.voided');
  };
  const paymentForm = document.querySelector('#payment-form');
  if (paymentForm) paymentForm.onsubmit = (event) => {
    event.preventDefault();
    const reference = document.querySelector('#paymentReference').value.trim();
    const paymentDate = document.querySelector('#paymentDate').value;
    if (!reference) { document.querySelector('#paymentReferenceError').textContent = 'Enter the bank/payment reference used by accounts.'; document.querySelector('#paymentReference').focus(); return; }
    appendWorkflowEvent(bill.id, 'bill.paid', { paymentReference: reference, paymentDate });
  };
}

function appendWorkflowEvent(billId, type, extra = {}) {
  const actor = type === 'bill.verified' ? 'Maintenance Supervisor' : type === 'bill.approved' ? 'Maintenance Manager' : type === 'bill.paid' ? 'Accounts' : 'Maintenance Billing';
  state.events.push({ id: uid('event'), billId, type, occurredAt: new Date().toISOString(), actor, ...extra });
  persist();
  showToast(eventLabel(type));
  renderBillDetail();
}

function exportBills(rows) {
  const csv = toCsv(rows, [
    { label: 'Invoice Number', value: ({ bill }) => bill.invoiceNumber },
    { label: 'Invoice Date', value: ({ bill }) => bill.invoiceDate },
    { label: 'Vendor', value: ({ bill }) => vendorById(bill.vendorId)?.name || '' },
    { label: 'Bus Registration', value: ({ bill }) => busById(bill.busId)?.registration || '' },
    { label: 'Job Card', value: ({ bill }) => bill.jobCardNumber },
    { label: 'Status', value: ({ status }) => STATUS_LABELS[status] },
    { label: 'Net Payable INR', value: ({ totals }) => (totals.payablePaise / 100).toFixed(2) },
  ]);
  downloadText(`maintenance-bills-${todayLocal()}.csv`, csv, 'text/csv;charset=utf-8');
}

function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

async function importBillsCsv(file) {
  if (!file) return;
  try {
    const rows = parseSimpleCsv(await file.text());
    if (rows.length < 2) throw new Error('CSV has no bill rows.');
    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    const find = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
    const idx = {
      invoice: find('invoice number', 'invoice'), date: find('invoice date', 'date'), vendor: find('vendor'), bus: find('bus registration', 'bus'), job: find('job card', 'job card number'), description: find('description'), qty: find('qty', 'quantity'), rate: find('rate inr', 'rate'), gst: find('gst', 'gst rate'),
    };
    if ([idx.invoice, idx.date, idx.vendor, idx.bus, idx.job, idx.description, idx.rate].some((i) => i < 0)) throw new Error('Required headers: Invoice Number, Invoice Date, Vendor, Bus Registration, Job Card, Description, Rate INR.');
    let added = 0; const problems = [];
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      try {
        const vendor = state.vendors.find((v) => v.name.toLowerCase() === String(row[idx.vendor] || '').toLowerCase());
        const bus = state.buses.find((b) => sanitizeRegistration(b.registration).replace(/\s/g, '') === sanitizeRegistration(row[idx.bus]).replace(/\s/g, ''));
        if (!vendor) throw new Error(`unknown vendor “${row[idx.vendor]}”`);
        if (!bus) throw new Error(`unknown bus “${row[idx.bus]}”`);
        const ratePaise = parseMoneyToPaise(row[idx.rate]);
        const bill = {
          id: uid('bill'), vendorId: vendor.id, busId: bus.id, invoiceNumber: String(row[idx.invoice] || '').trim(), invoiceDate: row[idx.date], dueDate: null,
          jobCardNumber: String(row[idx.job] || '').trim(), odometerKm: 0, taxMode: Number(row[idx.gst] || 0) ? 'intra' : 'none', currency: 'INR', notes: 'Imported from CSV', deductionPaise: 0, otherChargePaise: 0,
          lines: [{ id: uid('line'), category: 'Service', description: row[idx.description], quantity: Number(row[idx.qty] || 1), ratePaise, gstRate: Number(row[idx.gst] || 0) }],
        };
        const errors = validateBill(bill, state.vendors, state.buses, state.bills);
        if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
        state.bills.push(bill); state.events.push({ id: uid('event'), billId: bill.id, type: 'bill.created', occurredAt: new Date().toISOString(), actor: 'CSV import' }); added += 1;
      } catch (error) { problems.push(`Row ${rowIndex + 1}: ${error.message}`); }
    }
    persist();
    showToast(`${added} bill${added === 1 ? '' : 's'} imported${problems.length ? ` · ${problems.length} skipped` : ''}.`);
    if (problems.length) announcer.textContent = problems.slice(0, 3).join('. ');
    renderBills();
  } catch (error) { showToast(error.message); }
}

function renderFleet() {
  const rows = [...state.buses].sort((a, b) => a.registration.localeCompare(b.registration));
  main.innerHTML = `
    <section class="page"><div class="page-heading"><div><h2>Fleet</h2><p>Vehicle master used to tie every maintenance bill to the correct bus.</p></div><div class="page-actions"><button class="ghost-button" id="export-fleet">Export CSV</button></div></div>
    <div class="dashboard-grid">
      <section class="card">${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Registration</th><th>Make / model</th><th>Depot</th><th>Status</th><th class="numeric">Bills</th><th class="numeric">Lifetime billed</th></tr></thead><tbody>${rows.map((bus) => {
        const bills = state.bills.filter((bill) => bill.busId === bus.id && billStatus(bill) !== 'voided'); const spend = bills.reduce((sum, bill) => sum + billTotals(bill).payablePaise, 0);
        return `<tr><td><strong>${esc(bus.registration)}</strong></td><td>${esc(bus.makeModel)}</td><td>${esc(bus.depot)}</td><td><span class="badge ${bus.active === false ? 'voided' : 'approved'}">${bus.active === false ? 'Inactive' : 'Active'}</span></td><td class="numeric">${bills.length}</td><td class="numeric">${formatMoney(spend)}</td></tr>`;
      }).join('')}</tbody></table></div><div class="mobile-cards">${rows.map((bus) => `<article class="record-card"><div class="record-card-top"><strong>${esc(bus.registration)}</strong><span class="badge ${bus.active === false ? 'voided' : 'approved'}">${bus.active === false ? 'Inactive' : 'Active'}</span></div><p>${esc(bus.makeModel)}</p><p class="small muted">${esc(bus.depot)}</p></article>`).join('')}</div>` : '<div class="empty-state"><strong>No buses yet</strong></div>'}</section>
      <section class="card form-card"><div><h3>Add bus</h3><p class="small muted">Keep registration format consistent with workshop records.</p></div><form id="fleet-form" class="form-section" novalidate><div class="field"><label for="registration">Registration number</label><input class="input" id="registration" autocomplete="off" placeholder="MH 12 AB 1234" /><span class="error-text" id="registration-error"></span></div><div class="field"><label for="makeModel">Make / model</label><input class="input" id="makeModel" autocomplete="off" /></div><div class="field"><label for="depot">Depot</label><input class="input" id="depot" autocomplete="organization" /></div><button class="button" type="submit">Add bus</button></form></section>
    </div></section>`;
  document.querySelector('#fleet-form').onsubmit = (event) => {
    event.preventDefault(); const registration = sanitizeRegistration(document.querySelector('#registration').value); const error = document.querySelector('#registration-error'); error.textContent = '';
    if (!registration) { error.textContent = 'Enter the registration number.'; return; }
    if (state.buses.some((bus) => sanitizeRegistration(bus.registration).replace(/\s/g,'') === registration.replace(/\s/g,''))) { error.textContent = 'This bus already exists.'; return; }
    state.buses.push({ id: uid('bus'), registration, makeModel: document.querySelector('#makeModel').value.trim() || 'Not specified', depot: document.querySelector('#depot').value.trim() || state.organisation.depot, active: true }); persist(); showToast(`${registration} added to fleet.`); renderFleet();
  };
  document.querySelector('#export-fleet').onclick = () => downloadText(`fleet-${todayLocal()}.csv`, toCsv(rows, [{label:'Registration',value:r=>r.registration},{label:'Make Model',value:r=>r.makeModel},{label:'Depot',value:r=>r.depot},{label:'Active',value:r=>r.active === false ? 'No':'Yes'}]), 'text/csv;charset=utf-8');
}

function renderVendors() {
  const rows = [...state.vendors].sort((a, b) => a.name.localeCompare(b.name));
  main.innerHTML = `
    <section class="page"><div class="page-heading"><div><h2>Vendors</h2><p>One vendor master prevents invoice duplication and inconsistent payment terms.</p></div><div class="page-actions"><button class="ghost-button" id="export-vendors">Export CSV</button></div></div>
    <div class="dashboard-grid">
      <section class="card">${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Vendor</th><th>GSTIN</th><th>Phone</th><th class="numeric">Terms</th><th class="numeric">Bills</th><th class="numeric">Billed value</th></tr></thead><tbody>${rows.map((vendor) => {
        const bills = state.bills.filter((bill) => bill.vendorId === vendor.id && billStatus(bill) !== 'voided'); const spend = bills.reduce((sum, bill) => sum + billTotals(bill).payablePaise, 0);
        return `<tr><td><strong>${esc(vendor.name)}</strong></td><td>${esc(vendor.gstin || '—')}</td><td>${esc(vendor.phone || '—')}</td><td class="numeric">${Number(vendor.termsDays || 0)} days</td><td class="numeric">${bills.length}</td><td class="numeric">${formatMoney(spend)}</td></tr>`;
      }).join('')}</tbody></table></div><div class="mobile-cards">${rows.map((vendor) => `<article class="record-card"><div class="record-card-top"><strong>${esc(vendor.name)}</strong><span class="small muted">${Number(vendor.termsDays || 0)}d terms</span></div><p class="small">${esc(vendor.gstin || 'GSTIN not recorded')}</p><p class="small muted">${esc(vendor.phone || 'Phone not recorded')}</p></article>`).join('')}</div>` : '<div class="empty-state"><strong>No vendors yet</strong></div>'}</section>
      <section class="card form-card"><div><h3>Add vendor</h3><p class="small muted">GSTIN is optional in this MVP; validate statutory details with accounts.</p></div><form id="vendor-form" class="form-section" novalidate><div class="field"><label for="vendorName">Vendor name</label><input class="input" id="vendorName" autocomplete="organization" /><span class="error-text" id="vendor-name-error"></span></div><div class="field"><label for="gstin">GSTIN</label><input class="input" id="gstin" autocomplete="off" maxlength="15" /></div><div class="field"><label for="phone">Phone</label><input class="input" id="phone" type="tel" inputmode="numeric" autocomplete="tel" /></div><div class="field"><label for="termsDays">Payment terms (days)</label><input class="input" id="termsDays" type="number" inputmode="numeric" min="0" step="1" value="30" /></div><button class="button" type="submit">Add vendor</button></form></section>
    </div></section>`;
  document.querySelector('#vendor-form').onsubmit = (event) => {
    event.preventDefault(); const name = document.querySelector('#vendorName').value.trim(); const error = document.querySelector('#vendor-name-error'); error.textContent = '';
    if (!name) { error.textContent = 'Enter the vendor name.'; return; }
    if (state.vendors.some((v) => v.name.toLowerCase() === name.toLowerCase())) { error.textContent = 'A vendor with this name already exists.'; return; }
    state.vendors.push({ id: uid('vendor'), name, gstin: document.querySelector('#gstin').value.trim().toUpperCase(), phone: document.querySelector('#phone').value.trim(), termsDays: Number(document.querySelector('#termsDays').value || 0) }); persist(); showToast(`${name} added.`); renderVendors();
  };
  document.querySelector('#export-vendors').onclick = () => downloadText(`vendors-${todayLocal()}.csv`, toCsv(rows, [{label:'Vendor',value:r=>r.name},{label:'GSTIN',value:r=>r.gstin},{label:'Phone',value:r=>r.phone},{label:'Payment Terms Days',value:r=>r.termsDays}]), 'text/csv;charset=utf-8');
}

function render() {
  state = loadState();
  const view = currentView();
  orgLabel.textContent = `${state.organisation.name} · ${state.organisation.depot}`;
  setActiveNav(view);
  const titles = { dashboard: 'Dashboard', bills: 'Bills', 'bill-new': 'New Bill', 'bill-detail': 'Bill Detail', fleet: 'Fleet', vendors: 'Vendors' };
  pageTitle.textContent = titles[view] || 'FleetLedger';
  if (view === 'dashboard') renderDashboard();
  else if (view === 'bills') renderBills();
  else if (view === 'bill-new') renderNewBill();
  else if (view === 'bill-detail') renderBillDetail();
  else if (view === 'fleet') renderFleet();
  else if (view === 'vendors') renderVendors();
  else navigate('dashboard');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
}

document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.route)));
document.querySelector('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; localStorage.setItem(THEME_KEY, next); showToast(`${next === 'dark' ? 'Dark' : 'Light'} theme enabled.`);
});
window.addEventListener('popstate', render);
initTheme();
render();
