ROMANO — Digital Restaurant Menu

«ROMANO v4.6.9 — Multilingual, responsive and server-backed digital restaurant menu with an integrated administration workspace.»

ROMANO is a modern digital restaurant menu platform designed to provide a fast customer-facing menu together with a secure administration panel for managing restaurant content.

The project combines a multilingual customer menu, server-backed administration, PostgreSQL persistence, tenant-aware access control, automatic translation infrastructure, offline fallback, and production-oriented security features.

---

✨ Highlights

- 🌍 Multilingual menu
  
  - فارسی (FA)
  - English (EN)
  - Türkçe (TR)
  - العربية (AR)

- 📱 Responsive customer menu

- 🧑‍💼 Integrated Admin Panel

- 🔐 Server-side authentication

- 🛡️ Tenant-aware RBAC

- 🗄️ PostgreSQL database

- ⚡ Fastify backend

- 🔑 Argon2id password hashing

- 🍪 HttpOnly session cookies

- 🛡️ CSRF protection

- 🚦 Rate limiting

- 🔒 Content Security Policy

- 🖼️ Secure image uploads

- 🤖 Automatic multilingual translation

- 📡 API-first customer menu

- 📦 Offline/local fallback

- 🧪 Automated backend tests

- 🔍 Static and JavaScript syntax QA

- 📲 PWA / service worker support

---

🏗️ Architecture

ROMANO follows a lightweight full-stack architecture:

ROMANO
│
├── Customer Menu
│   ├── HTML
│   ├── CSS
│   ├── JavaScript
│   ├── i18n
│   ├── Public API
│   └── Offline fallback
│
├── Admin Workspace
│   ├── Authentication
│   ├── RBAC
│   ├── Restaurant management
│   ├── Category management
│   ├── Product management
│   ├── Media management
│   └── Multilingual content
│
├── Backend
│   ├── Fastify
│   ├── PostgreSQL
│   ├── Sessions
│   ├── CSRF protection
│   ├── Rate limiting
│   ├── Tenant isolation
│   └── REST API
│
└── QA
    ├── Static audit
    ├── JavaScript syntax checks
    └── Backend unit tests

---

🌍 Internationalization

ROMANO is designed around a four-language content model:

Language| Code| Direction
Persian| "fa"| RTL
Arabic| "ar"| RTL
English| "en"| LTR
Turkish| "tr"| LTR

The application supports switching between languages while preserving the appropriate document direction and localized interface content.

Both the customer menu and Admin Panel are designed to participate in the same multilingual system.

---

👨‍🍳 Customer Menu

The customer-facing application provides:

- Restaurant branding
- Hero section
- Menu categories
- Product cards
- Product imagery
- Product descriptions
- Pricing
- Multilingual content
- Responsive layouts
- RTL/LTR support
- Offline/local fallback
- API-first data loading

The public menu is designed to remain lightweight and accessible across mobile and desktop devices.

---

🧑‍💼 Admin Panel

The integrated administration workspace provides a server-backed environment for managing restaurant content.

Core areas include:

- Authentication
- Restaurant access
- Role-based permissions
- Categories
- Products
- Menu content
- Media
- Multilingual content
- Restaurant snapshots
- Audit-related functionality

RBAC

The current role hierarchy is:

viewer
   ↓
editor
   ↓
manager
   ↓
owner

Higher-level permissions are required for sensitive operations such as deletion and settings management.

---

🔐 Security

Security is treated as a core part of the application architecture.

Authentication

- Argon2id password hashing
- Random session tokens
- SHA-256 storage of session tokens
- HttpOnly cookies
- Session limits per user
- Secure production cookies

CSRF Protection

The backend uses a double-submit CSRF mechanism combined with a server-side hash and token rotation during authentication.

Rate Limiting

Login attempts are rate-limited to reduce brute-force attempts.

Authorization

Restaurant access is tenant-aware.

A restaurant ID supplied through a URL is only accepted when it belongs to a restaurant accessible to the authenticated user.

Content Security Policy

A restrictive CSP is enabled to reduce client-side injection risks.

File Upload Security

Supported image formats are validated using file signatures rather than trusting the declared MIME type.

Supported formats:

- JPEG
- PNG
- WebP

SVG uploads are rejected.

Maximum upload size:

2 MB

---

🤖 Automatic Translation

ROMANO includes infrastructure for automatic translation of restaurant content.

When configured, administrator-entered content can be translated into:

fa → en → tr → ar

Machine-generated translations are marked as automatic and can be manually overridden.

The system also avoids unnecessarily retranslating unchanged content.

Configuration

Automatic translation requires a server-side API key.

The key must never be exposed to the browser.

---

🗄️ Backend

The backend is built with:

- Node.js
- Fastify
- PostgreSQL
- Zod
- Argon2
- Fastify Helmet
- Fastify Rate Limit
- Fastify Cookie

Node.js requirement:

Node.js >= 20

---

📁 Project Structure

.
├── admin/
│   ├── admin-i18n.js
│   ├── admin.css
│   ├── admin.js
│   ├── api.js
│   └── ...
│
├── assets/
│   ├── images/
│   └── icons/
│
├── backend/
│   ├── lib/
│   ├── migrations/
│   ├── test/
│   ├── .env.example
│   ├── migrate.mjs
│   ├── seed.mjs
│   ├── server.mjs
│   └── package.json
│
├── css/
│   ├── style.css
│   └── romano.css
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── AUDIT_REPORT.md
│   ├── CHANGELOG.md
│   ├── DESIGN_REVIEW.md
│   ├── I18N_CONTENT_MODEL.md
│   ├── LAUNCH_CHECKLIST.md
│   ├── PRODUCTION_STATUS.md
│   ├── QA_MATRIX.md
│   └── VERSION_COMPARISON.md
│
├── js/
│   ├── app.js
│   ├── data.js
│   ├── i18n.js
│   └── public-api.js
│
├── qa/
│   └── static-audit.mjs
│
├── index.html
├── manifest.webmanifest
├── sw.js
├── docker-compose.yml
└── package.json

---

🚀 Getting Started

1. Clone the repository

git clone <your-repository-url>
cd Online-Menu

2. Install backend dependencies

npm run backend:install

3. Configure environment variables

Create:

backend/.env

from:

backend/.env.example

Configure at minimum:

DATABASE_URL=...
BOOTSTRAP_ADMIN_EMAIL=...
BOOTSTRAP_ADMIN_PASSWORD=...

The bootstrap administrator password must contain at least 12 characters.

---

4. Run database migrations

npm run backend:migrate

---

5. Seed demo data

npm run backend:seed

The seed process creates the initial owner account and demo multilingual menu data.

Existing edited content and passwords are not intentionally reset by repeated seeding.

---

6. Start the application

npm run backend:start

The application will be available at:

http://localhost:3000/

Admin Panel:

http://localhost:3000/admin/

---

🧪 Quality Assurance

ROMANO includes several QA layers.

JavaScript syntax validation

npm run qa:syntax

Static audit

npm run qa:static

Backend tests

npm test

Full QA

npm run qa

The full QA command runs:

Syntax checks
      ↓
Static audit
      ↓
Backend tests

---

🐳 Docker

A Docker Compose configuration is included for environments where containerized development is preferred.

docker compose up

---

📚 Documentation

Additional technical documentation is available under "docs/".

Important references include:

- "ARCHITECTURE.md" — system architecture
- "API_CONTRACT.md" — API contract
- "I18N_CONTENT_MODEL.md" — multilingual content model
- "QA_MATRIX.md" — QA coverage
- "AUDIT_REPORT.md" — technical audit
- "PRODUCTION_STATUS.md" — current production status
- "LAUNCH_CHECKLIST.md" — launch checklist
- "CHANGELOG.md" — project changes

---

📌 Version

Current version: "4.7.0"

ROMANO v4.7.0 extends the previous production foundation with the server-backed application architecture, PostgreSQL persistence, multilingual administration infrastructure, automatic translation support, security controls, API integration and expanded QA coverage.

---

⚠️ Production Status

ROMANO is structured as a production-oriented application, but production readiness should be evaluated against the deployment environment rather than assumed from the version number alone.

In particular, the current project documentation distinguishes automated/unit validation from full infrastructure verification.

The backend test suite currently focuses on application helpers and translation functionality. A live PostgreSQL integration environment and complete browser-based E2E verification should be validated separately before a production launch.

---

🛣️ Roadmap

Potential future development areas include:

- Complete browser E2E test coverage
- Expanded automated integration testing
- Production observability
- Advanced restaurant settings
- Multi-restaurant SaaS management
- More granular permissions
- Advanced analytics
- Ordering workflows
- QR-based restaurant access
- Deployment automation
- Additional localization capabilities

---

🤝 Contributing

Contributions, improvements and technical feedback are welcome.

Before making changes:

1. Understand the existing architecture.
2. Preserve existing customer-menu behavior.
3. Preserve Admin Panel functionality.
4. Test both LTR and RTL layouts.
5. Verify all supported languages.
6. Run the available QA commands.
7. Avoid exposing secrets or credentials.

---

📄 License

Add the project's applicable license here before publishing the repository for external use.

---

👤 Project

ROMANO Digital Restaurant Menu

Built as a scalable foundation for modern multilingual restaurant menu management.
