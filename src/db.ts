import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'pos.db'));

db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    stock INTEGER DEFAULT 0,
    sizes TEXT,
    colors TEXT,
    variations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    total REAL NOT NULL,
    tax REAL NOT NULL,
    discount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    size TEXT,
    color TEXT,
    variations TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  );

  CREATE TABLE IF NOT EXISTS discount_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    discount_type TEXT DEFAULT 'percent',
    discount_value REAL NOT NULL,
    min_spending REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  );

  CREATE TABLE IF NOT EXISTS taxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    percentage REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  );
`);

// Add variations columns if they don't exist
try {
  db.exec('ALTER TABLE products ADD COLUMN variations TEXT');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE invoice_items ADD COLUMN variations TEXT');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN password TEXT');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN is_super_admin INTEGER DEFAULT 0');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN username TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_username ON tenants (username COLLATE NOCASE)');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN email TEXT');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN contact_number TEXT');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN tax_percentage REAL DEFAULT 5.0');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE discount_codes ADD COLUMN discount_type TEXT DEFAULT "percent"');
} catch (e) {}
try {
  db.exec('ALTER TABLE discount_codes ADD COLUMN discount_value REAL DEFAULT 0');
  db.exec('UPDATE discount_codes SET discount_value = discount_percentage WHERE discount_percentage IS NOT NULL');
} catch (e) {}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN address TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE tenants ADD COLUMN registration_number TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE discount_codes ADD COLUMN min_spending REAL DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT "Completed"');
} catch (e) {}

db.exec("UPDATE tenants SET password = 'password' WHERE password IS NULL");
db.exec("UPDATE tenants SET is_super_admin = 1 WHERE id = 1");
db.exec("UPDATE tenants SET username = lower(replace(name, ' ', '')) WHERE username IS NULL");
db.exec("UPDATE tenants SET email = 'admin@example.com' WHERE email IS NULL");
db.exec("UPDATE tenants SET contact_number = '0000000000' WHERE contact_number IS NULL");

const posPlusCount = db.prepare('SELECT COUNT(*) as count FROM tenants WHERE name = ?').get('POSPlus') as { count: number };
if (posPlusCount.count === 0) {
  db.prepare("INSERT INTO tenants (name, username, email, contact_number, password, is_super_admin) VALUES ('POSPlus', 'posplus', 'posplus@example.com', '0000000000', 'password1', 1)").run();
}

// Insert default tenant and products if none exists
const tenantCount = db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number };
if (tenantCount.count === 0) {
  const info = db.prepare("INSERT INTO tenants (name, username, email, contact_number, password, is_super_admin) VALUES ('Default Store', 'defaultstore', 'admin@example.com', '0000000000', 'password', 1)").run();
  const tenantId = info.lastInsertRowid;

  const insertProduct = db.prepare(`
    INSERT INTO products (tenant_id, name, price, category, image, stock, sizes, colors)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run(tenantId, 'Cotton - Linen Long Shirt', 24.94, "Men's Wear", 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?auto=format&fit=crop&q=80&w=400&h=500', 50, JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']), JSON.stringify(['#1e3a8a', '#e5e7eb', '#bfdbfe', '#86efac', '#93c5fd']));
  insertProduct.run(tenantId, 'Straight Fit - Washed Denim', 21.93, "Men's Wear", 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=400&h=500', 30, JSON.stringify(['32', '33', '34', '35', '36']), JSON.stringify(['#111827', '#4b5563', '#6b7280']));
  insertProduct.run(tenantId, 'Textured Knit Polo Shirt', 31.89, "Men's Wear", 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=400&h=500', 25, JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']), JSON.stringify(['#fef3c7', '#111827', '#451a03']));
  insertProduct.run(tenantId, 'Fabric Shoulder Bag', 45.00, "Accessories", 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=400&h=500', 15, JSON.stringify(['SM', 'MD', 'LG']), JSON.stringify(['#fef3c7']));
}

export default db;
