import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './src/db.ts';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API Routes ---

  // Tenants
  app.get('/api/tenants', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const requestor = db.prepare('SELECT is_super_admin FROM tenants WHERE id = ?').get(tenantId);
    if (!requestor || !requestor.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }
    const tenants = db.prepare('SELECT id, name, username, email, contact_number, tax_percentage, created_at, is_super_admin FROM tenants').all();
    res.json(tenants);
  });

  app.post('/api/tenants/login', (req, res) => {
    const { username, password } = req.body;
    const tenant = db.prepare('SELECT id, name, username, email, contact_number, tax_percentage, is_super_admin FROM tenants WHERE username = ? COLLATE NOCASE AND password = ?').get(username, password);
    if (tenant) {
      res.json({ ...tenant, is_super_admin: !!tenant.is_super_admin });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/tenants/forgot-password', (req, res) => {
    const { username, email } = req.body;
    const tenant = db.prepare('SELECT password FROM tenants WHERE username = ? COLLATE NOCASE AND email = ? COLLATE NOCASE').get(username, email);
    if (tenant) {
      // In a real app, send an email. For this prototype, we'll just return it.
      res.json({ success: true, password: tenant.password });
    } else {
      res.status(404).json({ error: 'No account found with that username and email' });
    }
  });

  app.post('/api/tenants', (req, res) => {
    const { name, username, email, contact_number, address, registration_number, password, is_super_admin } = req.body;
    
    // Check if exists
    const existing = db.prepare('SELECT id FROM tenants WHERE username = ? COLLATE NOCASE').get(username);
    if (existing) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    const stmt = db.prepare('INSERT INTO tenants (name, username, email, contact_number, address, registration_number, password, is_super_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, username, email, contact_number, address || null, registration_number || null, password, is_super_admin ? 1 : 0);
    const newTenant = db.prepare('SELECT id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin FROM tenants WHERE id = ?').get(info.lastInsertRowid);
    res.json({ ...newTenant, is_super_admin: !!newTenant.is_super_admin });
  });

  app.put('/api/tenants/:id', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const requestor = db.prepare('SELECT is_super_admin FROM tenants WHERE id = ?').get(tenantId);
    if (!requestor || (!requestor.is_super_admin && String(tenantId) !== String(req.params.id))) {
      return res.status(403).json({ error: 'Forbidden. Super Admin access or self-edit required.' });
    }

    let { name, username, email, contact_number, address, registration_number, password, is_super_admin } = req.body;
    
    // If not super admin, prevent changing is_super_admin status
    if (!requestor.is_super_admin) {
      const currentTarget = db.prepare('SELECT is_super_admin FROM tenants WHERE id = ?').get(req.params.id);
      is_super_admin = currentTarget ? currentTarget.is_super_admin : 0;
    }
    
    // Check if username exists for another tenant
    const existing = db.prepare('SELECT id FROM tenants WHERE username = ? COLLATE NOCASE AND id != ?').get(username, req.params.id);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const currentTenant = db.prepare('SELECT address, registration_number FROM tenants WHERE id = ?').get(req.params.id);
    const finalAddress = address !== undefined ? (address || null) : currentTenant.address;
    const finalRegNumber = registration_number !== undefined ? (registration_number || null) : currentTenant.registration_number;

    if (password) {
      db.prepare('UPDATE tenants SET name = ?, username = ?, email = ?, contact_number = ?, address = ?, registration_number = ?, password = ?, is_super_admin = ? WHERE id = ?')
        .run(name, username, email, contact_number, finalAddress, finalRegNumber, password, is_super_admin ? 1 : 0, req.params.id);
    } else {
      db.prepare('UPDATE tenants SET name = ?, username = ?, email = ?, contact_number = ?, address = ?, registration_number = ?, is_super_admin = ? WHERE id = ?')
        .run(name, username, email, contact_number, finalAddress, finalRegNumber, is_super_admin ? 1 : 0, req.params.id);
    }
    
    const updatedTenant = db.prepare('SELECT id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin FROM tenants WHERE id = ?').get(req.params.id);
    res.json({ success: true, tenant: { ...updatedTenant, is_super_admin: !!updatedTenant.is_super_admin } });
  });

  app.put('/api/tenants/:id/settings', (req, res) => {
    const { tax_percentage, address, registration_number } = req.body;
    db.prepare('UPDATE tenants SET tax_percentage = ?, address = ?, registration_number = ? WHERE id = ?').run(tax_percentage, address || null, registration_number || null, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/tenants/:id', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const requestor = db.prepare('SELECT is_super_admin FROM tenants WHERE id = ?').get(tenantId);
    if (!requestor || !requestor.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }
    if (req.params.id === String(tenantId)) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    // Delete tenant and associated data
    db.transaction(() => {
      db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = ?)').run(req.params.id);
      db.prepare('DELETE FROM invoices WHERE tenant_id = ?').run(req.params.id);
      db.prepare('DELETE FROM products WHERE tenant_id = ?').run(req.params.id);
      db.prepare('DELETE FROM payment_methods WHERE tenant_id = ?').run(req.params.id);
      db.prepare('DELETE FROM discount_codes WHERE tenant_id = ?').run(req.params.id);
      db.prepare('DELETE FROM taxes WHERE tenant_id = ?').run(req.params.id);
      db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);
    })();
    
    res.json({ success: true });
  });

  // Products
  app.get('/api/products', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }
    const products = db.prepare('SELECT * FROM products WHERE tenant_id = ?').all(tenantId);
    res.json(products.map((p: any) => {
      const sizes = p.sizes ? JSON.parse(p.sizes) : [];
      const colors = p.colors ? JSON.parse(p.colors) : [];
      let variations = p.variations ? JSON.parse(p.variations) : [];
      
      // Migrate legacy sizes and colors to variations for the frontend
      if (variations.length === 0) {
        if (sizes.length > 0) variations.push({ name: 'Size', options: sizes });
        if (colors.length > 0) variations.push({ name: 'Color', options: colors });
      }

      return {
        ...p,
        sizes,
        colors,
        variations
      };
    }));
  });

  app.post('/api/products', (req, res) => {
    const { tenant_id, name, price, category, image, stock, sizes, colors, variations } = req.body;
    const stmt = db.prepare(`
      INSERT INTO products (tenant_id, name, price, category, image, stock, sizes, colors, variations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      tenant_id, name, price, category, image, stock, 
      JSON.stringify(sizes || []), JSON.stringify(colors || []), JSON.stringify(variations || [])
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/products/:id', (req, res) => {
    const { name, price, category, image, stock, sizes, colors, variations } = req.body;
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, price = ?, category = ?, image = ?, stock = ?, sizes = ?, colors = ?, variations = ?
      WHERE id = ?
    `);
    stmt.run(
      name, price, category, image, stock, 
      JSON.stringify(sizes || []), JSON.stringify(colors || []), JSON.stringify(variations || []),
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/products/:id', (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put('/api/products/:id/stock', (req, res) => {
    const { stock } = req.body;
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, req.params.id);
    res.json({ success: true });
  });

  // Invoices
  app.get('/api/invoices', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }
    const invoices = db.prepare('SELECT * FROM invoices WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId);
    res.json(invoices);
  });

  app.get('/api/invoices/:id', (req, res) => {
    const invoiceId = req.params.id;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    const items = db.prepare(`
      SELECT ii.*, p.name as product_name 
      FROM invoice_items ii 
      JOIN products p ON ii.product_id = p.id 
      WHERE ii.invoice_id = ?
    `).all(invoiceId);
    
    res.json({ ...invoice, items });
  });

  app.put('/api/invoices/:id/status', (req, res) => {
    const { status } = req.body;
    const invoiceId = req.params.id;
    
    if (!['Pending', 'Completed', 'Void'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, invoiceId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  app.post('/api/invoices', (req, res) => {
    const { tenant_id, total, tax, discount, items, status = 'Completed' } = req.body;
    
    const insertInvoice = db.transaction(() => {
      const invoiceStmt = db.prepare('INSERT INTO invoices (tenant_id, total, tax, discount, status) VALUES (?, ?, ?, ?, ?)');
      const invoiceInfo = invoiceStmt.run(tenant_id, total, tax, discount, status);
      const invoiceId = invoiceInfo.lastInsertRowid;

      const itemStmt = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, quantity, price, size, color, variations) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const item of items) {
        itemStmt.run(invoiceId, item.id, item.quantity, item.price, item.selectedSize || null, item.selectedColor || null, item.selectedVariations ? JSON.stringify(item.selectedVariations) : null);
        
        // Update stock
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
      }
      return invoiceId;
    });

    try {
      const invoiceId = insertInvoice();
      res.json({ id: invoiceId });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  // Payment Methods
  app.get('/api/payment-methods', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const methods = db.prepare('SELECT * FROM payment_methods WHERE tenant_id = ?').all(tenantId);
    res.json(methods);
  });

  app.post('/api/payment-methods', (req, res) => {
    const { tenant_id, name } = req.body;
    const info = db.prepare('INSERT INTO payment_methods (tenant_id, name) VALUES (?, ?)').run(tenant_id, name);
    res.json({ id: info.lastInsertRowid, name });
  });

  app.put('/api/payment-methods/:id', (req, res) => {
    const { name } = req.body;
    db.prepare('UPDATE payment_methods SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/payment-methods/:id', (req, res) => {
    db.prepare('DELETE FROM payment_methods WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Discount Codes
  app.get('/api/discount-codes', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const codes = db.prepare('SELECT * FROM discount_codes WHERE tenant_id = ?').all(tenantId);
    res.json(codes);
  });

  app.post('/api/discount-codes', (req, res) => {
    const { tenant_id, code, discount_type, discount_value, min_spending } = req.body;
    const info = db.prepare('INSERT INTO discount_codes (tenant_id, code, discount_percentage, discount_type, discount_value, min_spending) VALUES (?, ?, ?, ?, ?, ?)').run(tenant_id, code, discount_value, discount_type || 'percent', discount_value, min_spending || 0);
    res.json({ id: info.lastInsertRowid, code, discount_type: discount_type || 'percent', discount_value, min_spending: min_spending || 0 });
  });

  app.put('/api/discount-codes/:id', (req, res) => {
    const { code, discount_type, discount_value, min_spending } = req.body;
    db.prepare('UPDATE discount_codes SET code = ?, discount_type = ?, discount_value = ?, min_spending = ? WHERE id = ?')
      .run(code, discount_type || 'percent', discount_value, min_spending || 0, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/discount-codes/:id', (req, res) => {
    db.prepare('DELETE FROM discount_codes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Taxes
  app.get('/api/taxes', (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const taxes = db.prepare('SELECT * FROM taxes WHERE tenant_id = ?').all(tenantId);
    res.json(taxes);
  });

  app.post('/api/taxes', (req, res) => {
    const { tenant_id, name, percentage } = req.body;
    const info = db.prepare('INSERT INTO taxes (tenant_id, name, percentage) VALUES (?, ?, ?)').run(tenant_id, name, percentage);
    res.json({ id: info.lastInsertRowid, name, percentage });
  });

  app.put('/api/taxes/:id', (req, res) => {
    const { name, percentage } = req.body;
    db.prepare('UPDATE taxes SET name = ?, percentage = ? WHERE id = ?').run(name, percentage, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/taxes/:id', (req, res) => {
    db.prepare('DELETE FROM taxes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
