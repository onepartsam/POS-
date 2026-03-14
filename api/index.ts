import express from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wotypimhxwjpsvgvxcch.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kcowi3rGFpzG4Fwlt84Zaw_aNFhT6-m';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- API Routes ---

// Tenants
app.get('/api/tenants', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: requestor } = await supabase.from('tenants').select('is_super_admin').eq('id', tenantId).single();
  if (!requestor || !requestor.is_super_admin) {
    return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
  }
  
  const { data: tenants } = await supabase.from('tenants').select('id, name, username, email, contact_number, tax_percentage, created_at, is_super_admin, logo_url');
  res.json(tenants);
});

app.post('/api/tenants/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: tenant } = await supabase.from('tenants')
    .select('id, name, username, email, contact_number, tax_percentage, is_super_admin, logo_url')
    .ilike('username', username)
    .eq('password', password)
    .single();
    
  if (tenant) {
    res.json({ ...tenant, is_super_admin: !!tenant.is_super_admin });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/tenants/forgot-password', async (req, res) => {
  const { username, email } = req.body;
  const { data: tenant } = await supabase.from('tenants')
    .select('password')
    .ilike('username', username)
    .ilike('email', email)
    .single();
    
  if (tenant) {
    res.json({ success: true, password: tenant.password });
  } else {
    res.status(404).json({ error: 'No account found with that username and email' });
  }
});

app.post('/api/tenants', async (req, res) => {
  const { name, username, email, contact_number, address, registration_number, password, is_super_admin } = req.body;
  
  const { data: existing } = await supabase.from('tenants').select('id').ilike('username', username).maybeSingle();
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const { data: newTenant, error } = await supabase.from('tenants').insert({
    name, username, email, contact_number, address: address || null, registration_number: registration_number || null, password, is_super_admin: is_super_admin ? 1 : 0
  }).select('id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin, logo_url').single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...newTenant, is_super_admin: !!newTenant.is_super_admin });
});

app.put('/api/tenants/:id', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: requestor } = await supabase.from('tenants').select('is_super_admin').eq('id', tenantId).single();
  if (!requestor || (!requestor.is_super_admin && String(tenantId) !== String(req.params.id))) {
    return res.status(403).json({ error: 'Forbidden. Super Admin access or self-edit required.' });
  }

  let { name, username, email, contact_number, address, registration_number, password, is_super_admin } = req.body;
  
  if (!requestor.is_super_admin) {
    const { data: currentTarget } = await supabase.from('tenants').select('is_super_admin').eq('id', req.params.id).single();
    is_super_admin = currentTarget ? currentTarget.is_super_admin : 0;
  }
  
  const { data: existing } = await supabase.from('tenants').select('id').ilike('username', username).neq('id', req.params.id).maybeSingle();
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const { data: currentTenant } = await supabase.from('tenants').select('address, registration_number').eq('id', req.params.id).single();
  const finalAddress = address !== undefined ? (address || null) : currentTenant?.address;
  const finalRegNumber = registration_number !== undefined ? (registration_number || null) : currentTenant?.registration_number;

  const updateData: any = {
    name, username, email, contact_number, address: finalAddress, registration_number: finalRegNumber, is_super_admin: is_super_admin ? 1 : 0
  };
  if (password) updateData.password = password;

  await supabase.from('tenants').update(updateData).eq('id', req.params.id);
  
  const { data: updatedTenant } = await supabase.from('tenants').select('id, name, username, email, contact_number, address, registration_number, tax_percentage, is_super_admin, logo_url').eq('id', req.params.id).single();
  res.json({ success: true, tenant: { ...updatedTenant, is_super_admin: !!updatedTenant?.is_super_admin } });
});

app.put('/api/tenants/:id/settings', async (req, res) => {
  const { tax_percentage, address, registration_number, logo_url } = req.body;
  await supabase.from('tenants').update({
    tax_percentage, address: address || null, registration_number: registration_number || null, logo_url: logo_url || null
  }).eq('id', req.params.id);
  res.json({ success: true });
});

app.delete('/api/tenants/:id', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: requestor } = await supabase.from('tenants').select('is_super_admin').eq('id', tenantId).single();
  if (!requestor || !requestor.is_super_admin) {
    return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
  }
  if (req.params.id === String(tenantId)) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  
  // Delete tenant and associated data
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
  
  res.json({ success: true });
});

// Products
app.get('/api/products', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  
  const { data: products } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
  
  res.json((products || []).map((p: any) => {
    const sizes = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []);
    const colors = typeof p.colors === 'string' ? JSON.parse(p.colors) : (p.colors || []);
    let variations = typeof p.variations === 'string' ? JSON.parse(p.variations) : (p.variations || []);
    
    if (variations.length === 0) {
      if (sizes.length > 0) variations.push({ name: 'Size', options: sizes });
      if (colors.length > 0) variations.push({ name: 'Color', options: colors });
    }

    return { ...p, sizes, colors, variations };
  }));
});

app.post('/api/products', async (req, res) => {
  const { tenant_id, name, price, category, image, stock, sizes, colors, variations, sku } = req.body;
  const { data: info, error } = await supabase.from('products').insert({
    tenant_id, name, price, category, image, stock, sku,
    sizes: JSON.stringify(sizes || []), colors: JSON.stringify(colors || []), variations: JSON.stringify(variations || [])
  }).select('id').single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: info.id });
});

app.put('/api/products/:id', async (req, res) => {
  const { name, price, category, image, stock, sizes, colors, variations, sku } = req.body;
  await supabase.from('products').update({
    name, price, category, image, stock, sku,
    sizes: JSON.stringify(sizes || []), colors: JSON.stringify(colors || []), variations: JSON.stringify(variations || [])
  }).eq('id', req.params.id);
  res.json({ success: true });
});

app.delete('/api/products/:id', async (req, res) => {
  await supabase.from('products').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.put('/api/products/:id/stock', async (req, res) => {
  const { stock } = req.body;
  await supabase.from('products').update({ stock }).eq('id', req.params.id);
  res.json({ success: true });
});

// Invoices
app.get('/api/invoices', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  
  const { data: invoices } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  res.json(invoices || []);
});

app.get('/api/invoices/:id', async (req, res) => {
  const invoiceId = req.params.id;
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  
  const { data: items } = await supabase.from('invoice_items').select(`
    *,
    products!inner(name)
  `).eq('invoice_id', invoiceId);
  
  const formattedItems = (items || []).map((item: any) => ({
    ...item,
    product_name: item.products?.name
  }));
  
  res.json({ ...invoice, items: formattedItems });
});

app.put('/api/invoices/:id/status', async (req, res) => {
  const { status } = req.body;
  const invoiceId = req.params.id;
  
  if (!['Pending', 'Completed', 'Void'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const { error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId);
  if (error) return res.status(500).json({ error: 'Failed to update status' });
  res.json({ success: true });
});

app.post('/api/invoices', async (req, res) => {
  const { tenant_id, total, tax, discount, items, status = 'Completed' } = req.body;
  
  const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
    tenant_id, total, tax, discount, status
  }).select('id').single();
  
  if (invoiceError || !invoice) return res.status(500).json({ error: 'Failed to create invoice' });
  
  const invoiceId = invoice.id;
  
  for (const item of items) {
    await supabase.from('invoice_items').insert({
      invoice_id: invoiceId, product_id: item.id, quantity: item.quantity, price: item.price, 
      size: item.selectedSize || null, color: item.selectedColor || null, 
      variations: item.selectedVariations ? JSON.stringify(item.selectedVariations) : null
    });
    
    // Update stock
    const { data: product } = await supabase.from('products').select('stock').eq('id', item.id).single();
    if (product) {
      await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.id);
    }
  }
  
  res.json({ id: invoiceId });
});

// Payment Methods
app.get('/api/payment-methods', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const { data: methods } = await supabase.from('payment_methods').select('*').eq('tenant_id', tenantId);
  res.json(methods || []);
});

app.post('/api/payment-methods', async (req, res) => {
  const { tenant_id, name } = req.body;
  const { data: info } = await supabase.from('payment_methods').insert({ tenant_id, name }).select('id').single();
  res.json({ id: info?.id, name });
});

app.put('/api/payment-methods/:id', async (req, res) => {
  const { name } = req.body;
  await supabase.from('payment_methods').update({ name }).eq('id', req.params.id);
  res.json({ success: true });
});

app.delete('/api/payment-methods/:id', async (req, res) => {
  await supabase.from('payment_methods').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// Discount Codes
app.get('/api/discount-codes', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const { data: codes } = await supabase.from('discount_codes').select('*').eq('tenant_id', tenantId);
  res.json(codes || []);
});

app.post('/api/discount-codes', async (req, res) => {
  const { tenant_id, code, discount_type, discount_value, min_spending } = req.body;
  const { data: info } = await supabase.from('discount_codes').insert({
    tenant_id, code, discount_percentage: discount_value, discount_type: discount_type || 'percent', discount_value, min_spending: min_spending || 0
  }).select('id').single();
  res.json({ id: info?.id, code, discount_type: discount_type || 'percent', discount_value, min_spending: min_spending || 0 });
});

app.put('/api/discount-codes/:id', async (req, res) => {
  const { code, discount_type, discount_value, min_spending } = req.body;
  await supabase.from('discount_codes').update({
    code, discount_type: discount_type || 'percent', discount_value, min_spending: min_spending || 0
  }).eq('id', req.params.id);
  res.json({ success: true });
});

app.delete('/api/discount-codes/:id', async (req, res) => {
  await supabase.from('discount_codes').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// Taxes
app.get('/api/taxes', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const { data: taxes } = await supabase.from('taxes').select('*').eq('tenant_id', tenantId);
  res.json(taxes || []);
});

app.post('/api/taxes', async (req, res) => {
  const { tenant_id, name, percentage } = req.body;
  const { data: info } = await supabase.from('taxes').insert({ tenant_id, name, percentage }).select('id').single();
  res.json({ id: info?.id, name, percentage });
});

app.put('/api/taxes/:id', async (req, res) => {
  const { name, percentage } = req.body;
  await supabase.from('taxes').update({ name, percentage }).eq('id', req.params.id);
  res.json({ success: true });
});

app.delete('/api/taxes/:id', async (req, res) => {
  await supabase.from('taxes').delete().eq('id', req.params.id);
  res.json({ success: true });
});

export default app;
