export const seedState = {
  version: 1,
  organisation: { id: 'org-1', name: 'Sahyadri Travels', depot: 'Pune Depot' },
  vendors: [
    { id: 'vendor-1', name: 'Shree Auto Diesel Works', gstin: '27AABCS1234A1Z5', phone: '9822011001', termsDays: 30 },
    { id: 'vendor-2', name: 'Pune Tyre & Retread', gstin: '27AAECP3321K1Z2', phone: '9822011002', termsDays: 15 },
    { id: 'vendor-3', name: 'National Electricals', gstin: '', phone: '9822011003', termsDays: 30 },
  ],
  buses: [
    { id: 'bus-1', registration: 'MH 12 AB 4812', makeModel: 'Volvo 9400', depot: 'Pune', active: true },
    { id: 'bus-2', registration: 'MH 12 CD 7288', makeModel: 'BharatBenz 1624', depot: 'Pune', active: true },
    { id: 'bus-3', registration: 'MH 14 JK 1190', makeModel: 'Ashok Leyland Viking', depot: 'Pimpri', active: true },
    { id: 'bus-4', registration: 'MH 12 PQ 5571', makeModel: 'Eicher Skyline Pro', depot: 'Pune', active: true },
  ],
  bills: [
    {
      id: 'bill-1', vendorId: 'vendor-1', busId: 'bus-1', invoiceNumber: 'SADW/26-27/118', invoiceDate: '2026-08-17',
      dueDate: '2026-09-16', jobCardNumber: 'JC-0817-12', odometerKm: 684220, taxMode: 'intra', currency: 'INR',
      notes: 'Brake chamber replacement and air-line inspection.', deductionPaise: 0, otherChargePaise: 0,
      lines: [
        { id: 'line-1', category: 'Part', description: 'Brake chamber assembly', quantity: 2, ratePaise: 825000, gstRate: 18 },
        { id: 'line-2', category: 'Service', description: 'Fitting and air leak test', quantity: 1, ratePaise: 240000, gstRate: 18 }
      ]
    },
    {
      id: 'bill-2', vendorId: 'vendor-2', busId: 'bus-2', invoiceNumber: 'PTR/1442', invoiceDate: '2026-08-15',
      dueDate: '2026-08-30', jobCardNumber: 'JC-0815-04', odometerKm: 412890, taxMode: 'intra', currency: 'INR',
      notes: 'Two rear tyres retreaded.', deductionPaise: 150000, otherChargePaise: 0,
      lines: [
        { id: 'line-3', category: 'Service', description: '295/80 R22.5 tyre retread', quantity: 2, ratePaise: 620000, gstRate: 18 }
      ]
    },
    {
      id: 'bill-3', vendorId: 'vendor-3', busId: 'bus-3', invoiceNumber: 'NE/882', invoiceDate: '2026-08-09',
      dueDate: '2026-09-08', jobCardNumber: 'JC-0809-19', odometerKm: 528100, taxMode: 'none', currency: 'INR',
      notes: 'Alternator wiring repair.', deductionPaise: 0, otherChargePaise: 50000,
      lines: [
        { id: 'line-4', category: 'Service', description: 'Alternator harness repair', quantity: 1, ratePaise: 480000, gstRate: 0 }
      ]
    },
    {
      id: 'bill-4', vendorId: 'vendor-1', busId: 'bus-4', invoiceNumber: 'SADW/26-27/101', invoiceDate: '2026-07-28',
      dueDate: '2026-08-27', jobCardNumber: 'JC-0728-07', odometerKm: 290440, taxMode: 'intra', currency: 'INR',
      notes: 'Periodic service.', deductionPaise: 0, otherChargePaise: 0,
      lines: [
        { id: 'line-5', category: 'Part', description: 'Engine oil 15W40', quantity: 28, ratePaise: 42000, gstRate: 18 },
        { id: 'line-6', category: 'Part', description: 'Oil filter', quantity: 1, ratePaise: 215000, gstRate: 18 },
        { id: 'line-7', category: 'Service', description: 'Periodic maintenance labour', quantity: 1, ratePaise: 350000, gstRate: 18 }
      ]
    }
  ],
  events: [
    { id: 'event-1', billId: 'bill-1', type: 'bill.created', occurredAt: '2026-08-17T07:15:00.000Z', actor: 'Maintenance Billing' },
    { id: 'event-2', billId: 'bill-2', type: 'bill.created', occurredAt: '2026-08-15T06:40:00.000Z', actor: 'Maintenance Billing' },
    { id: 'event-3', billId: 'bill-2', type: 'bill.verified', occurredAt: '2026-08-15T09:10:00.000Z', actor: 'Maintenance Supervisor' },
    { id: 'event-4', billId: 'bill-3', type: 'bill.created', occurredAt: '2026-08-09T05:45:00.000Z', actor: 'Maintenance Billing' },
    { id: 'event-5', billId: 'bill-3', type: 'bill.verified', occurredAt: '2026-08-09T08:00:00.000Z', actor: 'Maintenance Supervisor' },
    { id: 'event-6', billId: 'bill-3', type: 'bill.approved', occurredAt: '2026-08-10T05:30:00.000Z', actor: 'Maintenance Manager' },
    { id: 'event-7', billId: 'bill-4', type: 'bill.created', occurredAt: '2026-07-28T07:00:00.000Z', actor: 'Maintenance Billing' },
    { id: 'event-8', billId: 'bill-4', type: 'bill.verified', occurredAt: '2026-07-28T09:00:00.000Z', actor: 'Maintenance Supervisor' },
    { id: 'event-9', billId: 'bill-4', type: 'bill.approved', occurredAt: '2026-07-29T06:10:00.000Z', actor: 'Maintenance Manager' },
    { id: 'event-10', billId: 'bill-4', type: 'bill.paid', occurredAt: '2026-08-02T05:20:00.000Z', actor: 'Accounts', paymentReference: 'UTR672911820', paymentDate: '2026-08-02' }
  ]
};
