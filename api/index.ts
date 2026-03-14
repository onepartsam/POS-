import express from 'express';
import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';

const sqliteDb = new Database('pos.db');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const useSupabase = !!(supabaseUrl && supabaseKey);
const supabase = useSupabase ? createClient(supabaseUrl, supabaseKey) : null;

// Log Supabase connection status on startup
if (supabase) {
  (async () => {
    try {
      const { error } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      if (error) {
        console.error('Supabase connection check failed:', error.message);
      } else {
        console.log('Supabase connection successful');
      }
    } catch (err: any) {
      console.error('Supabase initialization error:', err.message);
    }
  })();
} else {
  console.log('Using SQLite database (Supabase not configured)');
}

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- API Routes ---

// Tenants
app.get('/api/tenants', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    let requestor: any = null;
    
    if (supabase) {
      const { data, error } = await supabase.from('tenants').select('is_super_admin').eq('id', tenantId).maybeSingle();
      if (error) throw error;
      requestor = data;
    } else {
      requestor = sqliteDb.prepare("SELECT is_super_admin FROM tenants WHERE id = ?").get(tenantId);
    }
    
    if (!requestor || !requestor.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }
    
    let tenants: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('tenants').select('id, name, username, email, contact_number, tax_percentage, created_at, is_super_admin, logo_url');
      tenants = data || [];
    } else {
      tenants = sqliteDb.prepare("SELECT id, name, username, email, contact_number, tax_percentage, created_at, is_super_admin, logo_url FROM tenants").all();
    }
    res.json(tenants);
  } catch (err: any) {
    console.error('Fetch tenants error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tenants/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const cleanUsername = username.trim();
  
  try {
    let tenant: any = null;
    
    if (supabase) {
      // Try to find by username (case-insensitive)
      let { data, error } = await supabase.from('tenants')
        .select('id, name, username, email, contact_number, tax_percentage, is_super_admin, logo_url')
        .ilike('username', cleanUsername)
        .eq('password', password)
        .maybeSingle();
        
      if (error) throw error;
      tenant = data;
        
      // If not found by username, try by email
      if (!tenant) {
        const { data: tenantByEmail, error: emailError } = await supabase.from('tenants')
          .select('id, name, username, email, contact_number, tax_percentage, is_super_admin, logo_url')
          .ilike('email', cleanUsername)
          .eq('password', password)
          .maybeSingle();
          
        if (emailError) throw emailError;
        tenant = tenantByEmail;
      }
    } else {
      // Use SQLite
      tenant = sqliteDb.prepare(`
        SELECT id, name, username, email, contact_number, tax_percentage, is_super_admin, logo_url 
        FROM tenants 
        WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) 
        AND password = ?
      `).get(cleanUsername, cleanUsername, password);
    }
      
    if (tenant) {
      res.json({ ...tenant, is_super_admin: !!tenant.is_super_admin });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error: any) {
    console.error('Login error:', error.message || error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message || 'Unknown error',
      code: error.code
    });
  }
});

app.post('/api/tenants/forgot-password', async (req, res) => {
  const { username, email } = req.body;
  if (!username && !email) {
    return res.status(400).json({ error: 'Username or email is required' });
  }
  
  try {
    let tenant: any = null;
    
    if (supabase) {
      let query = supabase.from('tenants').select('password');
      if (username && email) {
        query = query.ilike('username', username.trim()).ilike('email', email.trim());
      } else if (username) {
        query = query.ilike('username', username.trim());
      } else {
        query = query.ilike('email', email.trim());
      }
      const { data } = await query.maybeSingle();
      tenant = data;
    } else {
      // Use SQLite
      if (username && email) {
        tenant = sqliteDb.prepare("SELECT password FROM tenants WHERE LOWER(username) = LOWER(?) AND LOWER(email) = LOWER(?)").get(username.trim(), email.trim());
      } else if (username) {
        tenant = sqliteDb.prepare("SELECT password FROM tenants WHERE LOWER(username) = LOWER(?)").get(username.trim());
      } else {
        tenant = sqliteDb.prepare("SELECT password FROM tenants WHERE LOWER(email) = LOWER(?)").get(email.trim());
      }
    }
    
    if (tenant) {
      res.json({ success: true, password: tenant.password });
    } else {
      res.status(404).json({ error: 'No account found with those details' });
    }
  } catch (err: any) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tenants', async (req, res) => {
  const { name, username, email, contact_number, address, registration_number, password, is_super_admin } = req.body;
  
  try {
    let existing: any = null;
    if (supabase) {
      const { data } = await supabase.from('tenants').select('id').ilike('username', username).maybeSingle();
      existing = data;
    } else {
      existing = sqliteDb.prepare("SELECT id FROM tenants WHERE LOWER(username) = LOWER(?)").get(username);
    }
    
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    let newTenant: any = null;
    if (supabase) {
      const { data, error } = await supabase.from('tenants').insert({
        name, username, email, contact_number, address: address || null, registration_number: registration_number || null, password, is_super_admin: is_super_admin ? 1 : 0
      }).select('id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin, logo_url').single();
      
      if (error) throw error;
      newTenant = data;
    } else {
      const result = sqliteDb.prepare(`
        INSERT INTO tenants (name, username, email, contact_number, address, registration_number, password, is_super_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, username, email, contact_number, address || null, registration_number || null, password, is_super_admin ? 1 : 0);
      
      newTenant = sqliteDb.prepare("SELECT id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin, logo_url FROM tenants WHERE id = ?").get(result.lastInsertRowid);
    }
    
    res.json({ ...newTenant, is_super_admin: !!newTenant.is_super_admin });
  } catch (err: any) {
    console.error('Create tenant error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tenants/:id', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    let requestor: any = null;
    if (supabase) {
      const { data, error } = await supabase.from('tenants').select('is_super_admin').eq('id', tenantId).maybeSingle();
      if (error) throw error;
      requestor = data;
    } else {
      requestor = sqliteDb.prepare("SELECT is_super_admin FROM tenants WHERE id = ?").get(tenantId);
    }

    if (!requestor || (!requestor.is_super_admin && String(tenantId) !== String(req.params.id))) {
      return res.status(403).json({ error: 'Forbidden. Super Admin access or self-edit required.' });
    }

    let { name, username, email, contact_number, address, registration_number, password, is_super_admin, logo_url } = req.body;
    
    if (!requestor.is_super_admin) {
      let currentTarget: any = null;
      if (supabase) {
        const { data } = await supabase.from('tenants').select('is_super_admin').eq('id', req.params.id).single();
        currentTarget = data;
      } else {
        currentTarget = sqliteDb.prepare("SELECT is_super_admin FROM tenants WHERE id = ?").get(req.params.id);
      }
      is_super_admin = currentTarget ? currentTarget.is_super_admin : 0;
    }
    
    let existing: any = null;
    if (supabase) {
      const { data } = await supabase.from('tenants').select('id').ilike('username', username).neq('id', req.params.id).maybeSingle();
      existing = data;
    } else {
      existing = sqliteDb.prepare("SELECT id FROM tenants WHERE LOWER(username) = LOWER(?) AND id != ?").get(username, req.params.id);
    }

    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    let currentTenant: any = null;
    if (supabase) {
      const { data } = await supabase.from('tenants').select('address, registration_number, logo_url').eq('id', req.params.id).single();
      currentTenant = data;
    } else {
      currentTenant = sqliteDb.prepare("SELECT address, registration_number, logo_url FROM tenants WHERE id = ?").get(req.params.id);
    }

    const finalAddress = address !== undefined ? (address || null) : currentTenant?.address;
    const finalRegNumber = registration_number !== undefined ? (registration_number || null) : currentTenant?.registration_number;
    const finalLogoUrl = logo_url !== undefined ? (logo_url || null) : currentTenant?.logo_url;

    const updateData: any = {
      name, username, email, contact_number, address: finalAddress, registration_number: finalRegNumber, is_super_admin: is_super_admin ? 1 : 0, logo_url: finalLogoUrl
    };
    if (password) updateData.password = password;

    if (supabase) {
      await supabase.from('tenants').update(updateData).eq('id', req.params.id);
    } else {
      const fields = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updateData);
      sqliteDb.prepare(`UPDATE tenants SET ${fields} WHERE id = ?`).run(...values, req.params.id);
    }
    
    let updatedTenant: any = null;
    if (supabase) {
      const { data } = await supabase.from('tenants').select('id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin, logo_url').eq('id', req.params.id).single();
      updatedTenant = data;
    } else {
      updatedTenant = sqliteDb.prepare("SELECT id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin, logo_url FROM tenants WHERE id = ?").get(req.params.id);
    }

    res.json({ success: true, tenant: { ...updatedTenant, is_super_admin: !!updatedTenant?.is_super_admin } });
  } catch (err: any) {
    console.error('Update tenant error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tenants/:id/settings', async (req, res) => {
  const { tax_percentage, address, registration_number, logo_url } = req.body;
  try {
    if (supabase) {
      await supabase.from('tenants').update({
        tax_percentage, address: address || null, registration_number: registration_number || null, logo_url: logo_url || null
      }).eq('id', req.params.id);
    } else {
      sqliteDb.prepare(`
        UPDATE tenants 
        SET tax_percentage = ?, address = ?, registration_number = ?, logo_url = ? 
        WHERE id = ?
      `).run(tax_percentage, address || null, registration_number || null, logo_url || null, req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tenants/:id', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    let requestor: any = null;
    if (supabase) {
      const { data, error } = await supabase.from('tenants').select('is_super_admin').eq('id', tenantId).maybeSingle();
      if (error) throw error;
      requestor = data;
    } else {
      requestor = sqliteDb.prepare("SELECT is_super_admin FROM tenants WHERE id = ?").get(tenantId);
    }

    if (!requestor || !requestor.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }
    if (req.params.id === String(tenantId)) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    // Delete tenant and associated data
    if (supabase) {
      const { data: invoices } = await supabase.from('invoices').select('id').eq('tenant_id', req.params.id);
      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map(i => i.id);
        await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds);
      }
      await supabase.from('invoices').delete().eq('tenant_id', req.params.id);
      await supabase.from('products').delete().eq('tenant_id', req.params.id);
      await supabase.from('payment_methods').delete().eq('tenant_id', req.params.id);
      await supabase.from('discount_codes').delete().eq('tenant_id', req.params.id);
      await supabase.from('taxes').delete().eq('tenant_id', req.params.id);
      await supabase.from('tenants').delete().eq('id', req.params.id);
    } else {
      sqliteDb.prepare("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = ?)").run(req.params.id);
      sqliteDb.prepare("DELETE FROM invoices WHERE tenant_id = ?").run(req.params.id);
      sqliteDb.prepare("DELETE FROM products WHERE tenant_id = ?").run(req.params.id);
      sqliteDb.prepare("DELETE FROM payment_methods WHERE tenant_id = ?").run(req.params.id);
      sqliteDb.prepare("DELETE FROM discount_codes WHERE tenant_id = ?").run(req.params.id);
      sqliteDb.prepare("DELETE FROM taxes WHERE tenant_id = ?").run(req.params.id);
      sqliteDb.prepare("DELETE FROM tenants WHERE id = ?").run(req.params.id);
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete tenant error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  
  try {
    let products: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
      products = data || [];
    } else {
      products = sqliteDb.prepare("SELECT * FROM products WHERE tenant_id = ?").all(tenantId);
    }
    
    res.json(products.map((p: any) => {
      const sizes = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []);
      const colors = typeof p.colors === 'string' ? JSON.parse(p.colors) : (p.colors || []);
      let variations = typeof p.variations === 'string' ? JSON.parse(p.variations) : (p.variations || []);
      
      if (variations.length === 0) {
        if (sizes.length > 0) variations.push({ name: 'Size', options: sizes });
        if (colors.length > 0) variations.push({ name: 'Color', options: colors });
      }

      return { ...p, sizes, colors, variations };
    }));
  } catch (err: any) {
    console.error('Fetch products error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/products', async (req, res) => {
  const { tenant_id, name, price, category, image, stock, sizes, colors, variations, sku } = req.body;
  try {
    let productId: any = null;
    if (supabase) {
      const { data, error } = await supabase.from('products').insert({
        tenant_id, name, price, category, image, stock, sku,
        sizes: JSON.stringify(sizes || []), colors: JSON.stringify(colors || []), variations: JSON.stringify(variations || [])
      }).select('id').single();
      
      if (error) throw error;
      productId = data.id;
    } else {
      const result = sqliteDb.prepare(`
        INSERT INTO products (tenant_id, name, price, category, image, stock, sku, sizes, colors, variations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tenant_id, name, price, category, image, stock, sku,
        JSON.stringify(sizes || []), JSON.stringify(colors || []), JSON.stringify(variations || [])
      );
      productId = result.lastInsertRowid;
    }
    res.json({ id: productId });
  } catch (err: any) {
    console.error('Create product error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { name, price, category, image, stock, sizes, colors, variations, sku } = req.body;
  try {
    if (supabase) {
      await supabase.from('products').update({
        name, price, category, image, stock, sku,
        sizes: JSON.stringify(sizes || []), colors: JSON.stringify(colors || []), variations: JSON.stringify(variations || [])
      }).eq('id', req.params.id);
    } else {
      sqliteDb.prepare(`
        UPDATE products 
        SET name = ?, price = ?, category = ?, image = ?, stock = ?, sku = ?, sizes = ?, colors = ?, variations = ?
        WHERE id = ?
      `).run(
        name, price, category, image, stock, sku,
        JSON.stringify(sizes || []), JSON.stringify(colors || []), JSON.stringify(variations || []),
        req.params.id
      );
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update product error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    if (supabase) {
      await supabase.from('products').delete().eq('id', req.params.id);
    } else {
      sqliteDb.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/products/:id/stock', async (req, res) => {
  const { stock } = req.body;
  try {
    if (supabase) {
      await supabase.from('products').update({ stock }).eq('id', req.params.id);
    } else {
      sqliteDb.prepare("UPDATE products SET stock = ? WHERE id = ?").run(stock, req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update stock error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invoices
app.get('/api/invoices', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  
  try {
    let invoices: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      invoices = data || [];
    } else {
      invoices = sqliteDb.prepare("SELECT * FROM invoices WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId);
    }
    res.json(invoices);
  } catch (err: any) {
    console.error('Fetch invoices error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  const invoiceId = req.params.id;
  try {
    let invoice: any = null;
    let items: any[] = [];

    if (supabase) {
      const { data } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
      invoice = data;
      if (invoice) {
        const { data: itemsData } = await supabase.from('invoice_items').select(`
          *,
          products!inner(name)
        `).eq('invoice_id', invoiceId);
        items = (itemsData || []).map((item: any) => ({
          ...item,
          product_name: item.products?.name
        }));
      }
    } else {
      invoice = sqliteDb.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId);
      if (invoice) {
        items = sqliteDb.prepare(`
          SELECT ii.*, p.name as product_name 
          FROM invoice_items ii
          JOIN products p ON ii.product_id = p.id
          WHERE ii.invoice_id = ?
        `).all(invoiceId);
      }
    }

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ...invoice, items });
  } catch (err: any) {
    console.error('Fetch invoice details error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/invoices/:id/status', async (req, res) => {
  const { status } = req.body;
  const invoiceId = req.params.id;
  
  if (!['Pending', 'Completed', 'Void'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    if (supabase) {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId);
      if (error) throw error;
    } else {
      sqliteDb.prepare("UPDATE invoices SET status = ? WHERE id = ?").run(status, invoiceId);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update invoice status error:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.post('/api/invoices', async (req, res) => {
  const { tenant_id, total, tax, discount, items, status = 'Completed' } = req.body;
  
  try {
    let invoiceId: any = null;
    if (supabase) {
      const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
        tenant_id, total, tax, discount, status
      }).select('id').single();
      
      if (invoiceError || !invoice) throw invoiceError || new Error('Failed to create invoice');
      invoiceId = invoice.id;
      
      for (const item of items) {
        await supabase.from('invoice_items').insert({
          invoice_id: invoiceId, product_id: item.id, quantity: item.quantity, price: item.price, 
          size: item.selectedSize || null, color: item.selectedColor || null, 
          variations: item.selectedVariations ? JSON.stringify(item.selectedVariations) : null
        });
        
        const { data: product } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (product) {
          await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.id);
        }
      }
    } else {
      const transaction = sqliteDb.transaction(() => {
        const result = sqliteDb.prepare(`
          INSERT INTO invoices (tenant_id, total, tax, discount, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(tenant_id, total, tax, discount, status);
        
        const newInvoiceId = result.lastInsertRowid;
        
        for (const item of items) {
          sqliteDb.prepare(`
            INSERT INTO invoice_items (invoice_id, product_id, quantity, price, size, color, variations)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            newInvoiceId, item.id, item.quantity, item.price, 
            item.selectedSize || null, item.selectedColor || null, 
            item.selectedVariations ? JSON.stringify(item.selectedVariations) : null
          );
          
          sqliteDb.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
        }
        return newInvoiceId;
      });
      invoiceId = transaction();
    }
    res.json({ success: true, id: invoiceId });
  } catch (err: any) {
    console.error('Create invoice error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Payment Methods
app.get('/api/payment-methods', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  
  try {
    let methods: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('payment_methods').select('*').eq('tenant_id', tenantId);
      methods = data || [];
    } else {
      methods = sqliteDb.prepare("SELECT * FROM payment_methods WHERE tenant_id = ?").all(tenantId);
    }
    res.json(methods);
  } catch (err: any) {
    console.error('Fetch payment methods error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/payment-methods', async (req, res) => {
  const { tenant_id, name } = req.body;
  try {
    let methodId: any = null;
    if (supabase) {
      const { data, error } = await supabase.from('payment_methods').insert({ tenant_id, name }).select('id').single();
      if (error) throw error;
      methodId = data.id;
    } else {
      const result = sqliteDb.prepare("INSERT INTO payment_methods (tenant_id, name) VALUES (?, ?)").run(tenant_id, name);
      methodId = result.lastInsertRowid;
    }
    res.json({ id: methodId, name });
  } catch (err: any) {
    console.error('Create payment method error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/payment-methods/:id', async (req, res) => {
  const { name } = req.body;
  try {
    if (supabase) {
      await supabase.from('payment_methods').update({ name }).eq('id', req.params.id);
    } else {
      sqliteDb.prepare("UPDATE payment_methods SET name = ? WHERE id = ?").run(name, req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update payment method error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/payment-methods/:id', async (req, res) => {
  try {
    if (supabase) {
      await supabase.from('payment_methods').delete().eq('id', req.params.id);
    } else {
      sqliteDb.prepare("DELETE FROM payment_methods WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete payment method error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Discount Codes
app.get('/api/discount-codes', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  
  try {
    let codes: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('discount_codes').select('*').eq('tenant_id', tenantId);
      codes = data || [];
    } else {
      codes = sqliteDb.prepare("SELECT * FROM discount_codes WHERE tenant_id = ?").all(tenantId);
    }
    res.json(codes);
  } catch (err: any) {
    console.error('Fetch discount codes error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/discount-codes', async (req, res) => {
  const { tenant_id, code, discount_type, discount_value, min_spending } = req.body;
  try {
    let codeId: any = null;
    const type = discount_type || 'percent';
    const value = discount_value || 0;
    const min = min_spending || 0;

    if (supabase) {
      const { data, error } = await supabase.from('discount_codes').insert({
        tenant_id, code, discount_percentage: value, discount_type: type, discount_value: value, min_spending: min
      }).select('id').single();
      if (error) throw error;
      codeId = data.id;
    } else {
      const result = sqliteDb.prepare(`
        INSERT INTO discount_codes (tenant_id, code, discount_type, discount_value, discount_percentage, min_spending)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(tenant_id, code, type, value, value, min);
      codeId = result.lastInsertRowid;
    }
    res.json({ id: codeId, code, discount_type: type, discount_value: value, min_spending: min });
  } catch (err: any) {
    console.error('Create discount code error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/discount-codes/:id', async (req, res) => {
  const { code, discount_type, discount_value, min_spending } = req.body;
  try {
    const type = discount_type || 'percent';
    const value = discount_value || 0;
    const min = min_spending || 0;

    if (supabase) {
      await supabase.from('discount_codes').update({
        code, discount_type: type, discount_value: value, min_spending: min
      }).eq('id', req.params.id);
    } else {
      sqliteDb.prepare(`
        UPDATE discount_codes 
        SET code = ?, discount_type = ?, discount_value = ?, discount_percentage = ?, min_spending = ?
        WHERE id = ?
      `).run(code, type, value, value, min, req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update discount code error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/discount-codes/:id', async (req, res) => {
  try {
    if (supabase) {
      await supabase.from('discount_codes').delete().eq('id', req.params.id);
    } else {
      sqliteDb.prepare("DELETE FROM discount_codes WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete discount code error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Taxes
app.get('/api/taxes', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  
  try {
    let taxes: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('taxes').select('*').eq('tenant_id', tenantId);
      taxes = data || [];
    } else {
      taxes = sqliteDb.prepare("SELECT * FROM taxes WHERE tenant_id = ?").all(tenantId);
    }
    res.json(taxes);
  } catch (err: any) {
    console.error('Fetch taxes error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/taxes', async (req, res) => {
  const { tenant_id, name, percentage } = req.body;
  try {
    let taxId: any = null;
    if (supabase) {
      const { data, error } = await supabase.from('taxes').insert({ tenant_id, name, percentage }).select('id').single();
      if (error) throw error;
      taxId = data.id;
    } else {
      const result = sqliteDb.prepare("INSERT INTO taxes (tenant_id, name, percentage) VALUES (?, ?, ?)").run(tenant_id, name, percentage);
      taxId = result.lastInsertRowid;
    }
    res.json({ id: taxId, name, percentage });
  } catch (err: any) {
    console.error('Create tax error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/taxes/:id', async (req, res) => {
  const { name, percentage } = req.body;
  try {
    if (supabase) {
      await supabase.from('taxes').update({ name, percentage }).eq('id', req.params.id);
    } else {
      sqliteDb.prepare("UPDATE taxes SET name = ?, percentage = ? WHERE id = ?").run(name, percentage, req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update tax error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/taxes/:id', async (req, res) => {
  try {
    if (supabase) {
      await supabase.from('taxes').delete().eq('id', req.params.id);
    } else {
      sqliteDb.prepare("DELETE FROM taxes WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete tax error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;
