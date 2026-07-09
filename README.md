# ResolveDesk — Complaint Management System (PHP + MySQL)

A full-stack complaint management system: public complaint registration, an
admin dashboard, and an employee portal — backed by a real PHP API and MySQL
database.

## Folder structure

```
complaint-management-system/
├── index.html          ← the entire front-end (HTML/CSS/JS in one file)
├── api/
│   ├── config.php       ← database connection settings (EDIT THIS FIRST)
│   ├── helpers.php       ← shared response / auth / upload helpers
│   ├── auth.php          ← login / logout / session check
│   ├── employees.php     ← employee master CRUD
│   └── complaints.php    ← complaint create / list / update / assign / stats
├── database/
│   └── schema.sql        ← run this once to create the database + seed data
├── uploads/
│   ├── attachment/       ← files uploaded with new complaints
│   ├── before/            ← "before work" photos
│   └── after/              ← "after work" photos
└── README.md
```

## 1. Requirements

- PHP 8+ with the `pdo_mysql` extension enabled
- MySQL or MariaDB
- Any web server that can run PHP (Apache/Nginx via XAMPP/WAMP/MAMP, or
  PHP's built-in server for local testing)

## 2. Set up the database

1. Create the database and tables by importing the schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   This creates a `cms_db` database, all tables, and seed data (4 sample
   employees, 5 sample complaints, and login accounts — see below).

2. Open `api/config.php` and set your MySQL credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'cms_db');
   define('DB_USER', 'root');
   define('DB_PASS', '');   // your MySQL password
   ```

## 3. Run it

**Option A — PHP's built-in server (quickest, for local testing):**
```bash
cd complaint-management-system
php -S localhost:8000
```
Then open `http://localhost:8000/index.html` in your browser.

**Option B — XAMPP/WAMP/MAMP or any Apache/Nginx setup:**
Copy the whole `complaint-management-system` folder into your web root
(e.g. `htdocs/`), make sure the `uploads/` folder is writable by the web
server (`chmod -R 775 uploads`), then visit
`http://localhost/complaint-management-system/index.html`.

## 4. Demo logins

| Role     | Username     | Password   |
|----------|--------------|------------|
| Admin    | `admin`      | `admin123` |
| Employee | `9876543210` (Rohit Kadam) | `emp123` |
| Employee | `9823456712` (Sunita More) | `emp123` |
| Employee | `9765123480` (Imran Shaikh) | `emp123` |
| Employee | `9911223344` (Aarti Deshmukh) | `emp123` |

Employee usernames are their mobile numbers. All employee accounts share the
password `emp123` for this demo — change these in a real deployment.

## 5. How the pieces fit together

- **Public tab**: anyone can register a complaint (with attachments) and
  track a complaint by ID — no login required.
- **Admin tab**: requires the admin login above. Full dashboard, employee
  master (add/edit/delete), complaint list with search/filter, assign
  complaints to employees, update status/remarks/photos, and simple reports.
- **Employee tab**: requires an employee login. Employees only ever see
  complaints assigned to them (enforced server-side in `complaints.php`,
  not just hidden in the UI) and can update status, add remarks, and upload
  before/after work photos.

Sessions are handled with PHP's native `$_SESSION` (a cookie is set on
login), so the browser needs cookies enabled. All API responses are JSON;
every endpoint validates required fields and role permissions server-side.

## 6. Security notes for production use

This is a working demo, not a hardened production system. Before deploying
for real use:
- Change all default passwords and remove/rotate the demo accounts.
- Serve over HTTPS so session cookies aren't sent in the clear.
- Add rate limiting to `auth.php` and a real (server-verified) captcha to
  the public registration form — the current captcha is client-side only.
- Restrict `Access-Control-Allow-Origin` in `api/helpers.php` to your actual
  domain instead of `*`.
- Consider adding CSRF tokens if you expose the API beyond this single-page
  front-end.
- Review `uploads/` folder permissions and consider virus-scanning
  uploaded files.

## 7. Extending it

- **Categories**: currently a fixed list in the front-end (`CATEGORIES` in
  `index.html`) and mirrored in a `categories` table in the database if you
  want to make the admin "Categories" page fully manage-able — just add a
  `categories.php` endpoint following the same pattern as `employees.php`.
- **Notifications** (SMS/Email/WhatsApp on assignment): hook into
  `complaints.php`'s `assign` action where the employee is set.
- **Excel/PDF export**: the "Export" buttons currently just show a toast;
  wire them to a PHP endpoint using a library like PhpSpreadsheet or
  TCPDF/DomPDF if you need real file exports.
