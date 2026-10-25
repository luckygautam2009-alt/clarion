const db = require('../db/connection');

function rowToOrder(row) {
  if (!row) return null;
  return {
    ...row,
    returnRequested: Boolean(row.returnRequested),
    deliveredAt: row.deliveredAt || row.deliveredOn || null,
    deliveredOn: row.deliveredOn || (row.deliveredAt ? row.deliveredAt.slice(0, 10) : null),
  };
}

function rowToSecurityEvent(row) {
  if (!row) return null;
  return { ...row, flagged: Boolean(row.flagged) };
}

function nextId(table, prefix, idColumn = 'id') {
  const rows = db.prepare(`SELECT ${idColumn} as id FROM ${table}`).all();
  const nums = rows
    .map((r) => parseInt(String(r.id).replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

const getAllCustomers = () => db.prepare('SELECT * FROM customers').all();

const getCustomerById = (id) =>
  db.prepare('SELECT * FROM customers WHERE id = ?').get(id) || null;

const getOrdersByCustomerId = (id) =>
  db.prepare('SELECT * FROM orders WHERE customerId = ?').all(id).map(rowToOrder);

const getPaymentsByCustomerId = (id) =>
  db.prepare('SELECT * FROM payments WHERE customerId = ?').all(id);

const getTicketsByCustomerId = (id) =>
  db.prepare('SELECT * FROM tickets WHERE customerId = ?').all(id);

const getRefundsByCustomerId = (id) =>
  db.prepare('SELECT * FROM refunds WHERE customerId = ?').all(id);

const getSecurityEventsByCustomerId = (id) =>
  db.prepare('SELECT * FROM security_events WHERE customerId = ?').all(id).map(rowToSecurityEvent);

const getAllPolicies = () => db.prepare('SELECT * FROM policies').all();

function addCustomer(payload) {
  const customerId = payload.id || nextId('customers', 'CUST');
  const customer = {
    id: customerId,
    name: payload.name,
    email: payload.email,
    tier: payload.tier || 'silver',
    joinedDate: payload.joinedDate || payload.joinedOn || new Date().toISOString().slice(0, 10),
    joinedOn: payload.joinedOn || payload.joinedDate || new Date().toISOString().slice(0, 10),
  };

  db.prepare(`
    INSERT OR REPLACE INTO customers (id, name, email, tier, joinedDate, joinedOn)
    VALUES (@id, @name, @email, @tier, @joinedDate, @joinedOn)
  `).run(customer);

  const rawOrders = Array.isArray(payload.orders)
    ? payload.orders
    : payload.order
    ? [payload.order]
    : [];

  const createdOrders = [];
  const createdPayments = [];

  rawOrders.forEach((o, index) => {
    if (!o) return;
    const orderId = o.id || nextId('orders', 'ORDER');
    const orderAmount = Number(o.amount || 0);
    const orderRecord = {
      id: orderId,
      customerId: customer.id,
      product: o.product || 'Standard Product',
      amount: orderAmount,
      status: o.status || 'delivered',
      deliveredAt: o.deliveredAt || (o.status === 'in_transit' ? null : new Date().toISOString()),
      deliveredOn: o.deliveredOn || (o.status === 'in_transit' ? null : new Date().toISOString().slice(0, 10)),
      returnRequested: o.returnRequested ? 1 : 0,
      cancelledAt: o.cancelledAt || null,
      cancellationReason: o.cancellationReason || null,
      returnStatus: o.returnStatus || null,
      returnedAt: o.returnedAt || null,
      courierTracking: o.courierTracking || null,
      courierStatus: o.courierStatus || null,
      estimatedDelivery: o.estimatedDelivery || null,
    };

    db.prepare(`
      INSERT OR REPLACE INTO orders (
        id, customerId, product, amount, status, deliveredAt, deliveredOn,
        returnRequested, cancelledAt, cancellationReason, returnStatus,
        returnedAt, courierTracking, courierStatus, estimatedDelivery
      ) VALUES (
        @id, @customerId, @product, @amount, @status, @deliveredAt, @deliveredOn,
        @returnRequested, @cancelledAt, @cancellationReason, @returnStatus,
        @returnedAt, @courierTracking, @courierStatus, @estimatedDelivery
      )
    `).run(orderRecord);

    createdOrders.push(rowToOrder(orderRecord));

    // Create payment if amount is positive and order is not just cancelled without payment
    if (orderAmount > 0) {
      const paymentRecord = {
        id: nextId('payments', 'PAY'),
        orderId: orderRecord.id,
        customerId: customer.id,
        amount: orderRecord.amount,
        status: o.gatewayStatus || 'success',
        gatewayStatus: o.gatewayStatus || 'success',
        localStatus: o.localStatus || 'success',
        gatewayRef: `gw_auto_${Date.now()}_${index}`,
        timestamp: new Date().toISOString(),
      };

      db.prepare(`
        INSERT OR REPLACE INTO payments (
          id, orderId, customerId, amount, status, gatewayStatus, localStatus, gatewayRef, timestamp
        ) VALUES (
          @id, @orderId, @customerId, @amount, @status, @gatewayStatus, @localStatus, @gatewayRef, @timestamp
        )
      `).run(paymentRecord);

      createdPayments.push(paymentRecord);
    }
  });

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    tier: customer.tier,
    joinedOn: customer.joinedOn,
    customer,
    order: createdOrders[0] || null,
    orders: createdOrders,
    payment: createdPayments[0] || null,
    payments: createdPayments,
  };
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  getOrdersByCustomerId,
  getPaymentsByCustomerId,
  getTicketsByCustomerId,
  getRefundsByCustomerId,
  getSecurityEventsByCustomerId,
  getAllPolicies,
  addCustomer,
};
