# Pharmacy Management System

A multi-pharmacy management platform that connects **pharmacies, pharmacy staff, and customers** through a centralized web-based system and Progressive Web App (PWA).

The system allows pharmacy administrators and staff to manage medicines, inventory, prescriptions, reservations, medicine requests, sales, and customers, while customers can search for medicines, check availability, upload prescriptions, request medicines, and reserve medicines for **pickup**.

The Customer PWA also includes a simple **AI Assistant** that helps users with frequently asked questions, medicine-related information, application navigation, reservations, prescriptions, medicine requests, and general platform inquiries.

> **Note:** Delivery functionality is intentionally excluded from the current MVP.

---

## Table of Contents

* [Overview](#overview)
* [System Architecture](#system-architecture)
* [Applications](#applications)
* [Core Features](#core-features)
* [User Roles](#user-roles)
* [AI Assistant](#ai-assistant)
* [Technology Stack](#technology-stack)
* [Project Structure](#project-structure)
* [Database](#database)
* [How the System Works](#how-the-system-works)
* [Installation](#installation)
* [Environment Variables](#environment-variables)
* [Development](#development)
* [API Structure](#api-structure)
* [Security](#security)
* [MVP Scope](#mvp-scope)
* [Future Enhancements](#future-enhancements)
* [Project Status](#project-status)

---

## Overview

The Pharmacy Management System is designed to provide a centralized platform for managing multiple pharmacies while giving customers a convenient way to locate medicines and interact with participating pharmacies.

The platform consists of four major components:

1. **Super Admin Web**
2. **Pharmacy Admin Web**
3. **Customer PWA**
4. **Shared Backend API**

All applications communicate with the same backend API and centralized PostgreSQL database.

### Main Objectives

* Centralize pharmacy management.
* Allow pharmacies to manage medicines and inventory.
* Allow customers to search for available medicines.
* Allow customers to upload prescriptions.
* Allow customers to request medicines.
* Allow customers to reserve medicines for pickup.
* Provide notifications for relevant customer activities.
* Provide an AI Assistant for basic customer assistance.
* Maintain role-based access between system users.
* Maintain audit logs for important system activities.

---

# System Architecture

```text
                         PHARMACY MANAGEMENT SYSTEM
                                      |
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼
      SUPER ADMIN WEB          PHARMACY ADMIN WEB       CUSTOMER PWA
             │                        │                        │
             └────────────────────────┼────────────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  BACKEND API  │
                              │               │
                              │ Node / Express│
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
              PostgreSQL          AI Service       File Storage
```

### Architecture Principle

The three frontend applications do not directly contain the core business logic.

Instead:

```text
Frontend
   ↓
Backend API
   ↓
Database / Services
```

This allows authentication, authorization, validation, business rules, and database operations to be centrally managed.

---

# Applications

## 1. Super Admin Web

The Super Admin system manages the entire pharmacy platform.

### Responsibilities

* Manage pharmacies
* Manage pharmacy administrators
* Manage pharmacy staff
* Manage customers
* View system-wide information
* View reports
* View audit logs
* Manage system settings

### Access

```text
SUPER_ADMIN
```

---

## 2. Pharmacy Admin Web

The Pharmacy Admin system is used by individual pharmacies.

### Responsibilities

* Dashboard
* Medicine management
* Inventory management
* Prescription management
* Reservation management
* Medicine request management
* Customer management
* Sales management
* Reports
* Pharmacy settings

### Access

```text
PHARMACY_ADMIN
PHARMACY_STAFF
```

Pharmacy users are restricted to the pharmacy associated with their account.

---

## 3. Customer PWA

The Customer PWA provides the customer-facing experience.

Customers can access the application through a browser and install it as a Progressive Web App on supported devices.

### Customer Features

* Register and log in
* Search medicines
* View medicine information
* Check pharmacy availability
* Upload prescriptions
* View prescriptions
* Request medicines
* Reserve medicines for pickup
* View reservation status
* Receive notifications
* Manage profile
* Use the AI Assistant

---

## 4. Backend API

The backend is the shared server-side application used by all three frontends.

### Responsibilities

* Authentication
* Authorization
* Role-based access control
* Pharmacy access control
* Data validation
* Business logic
* Database operations
* Prescription processing
* Reservation processing
* Medicine request processing
* Sales processing
* Notifications
* Audit logging
* AI Assistant integration

---

# Core Features

## Authentication

The system supports authentication for:

* Super Administrators
* Pharmacy Administrators
* Pharmacy Staff
* Customers

Each authenticated user receives access according to their assigned role.

---

## Pharmacy Management

Super Administrators can manage participating pharmacies.

Each pharmacy can have its own:

* Administrators
* Staff
* Medicines
* Inventory
* Prescriptions
* Reservations
* Medicine requests
* Sales

---

## Medicine Management

Pharmacy administrators and authorized staff can manage medicine information and inventory.

Customers can search and view available medicine information through the PWA.

---

## Inventory Management

Inventory is pharmacy-specific.

The system supports inventory statuses including:

```text
AVAILABLE
LOW_STOCK
OUT_OF_STOCK
EXPIRED
INACTIVE
```

Inventory can be tracked by pharmacy and batch number.

---

## Prescription Management

Customers can upload prescriptions through the PWA.

Pharmacy personnel can review and process submitted prescriptions.

---

## Medicine Requests

Customers can submit requests for medicines through the PWA.

Pharmacy personnel can review and process these requests.

---

## Reservations

Customers can reserve available medicines for **pharmacy pickup**.

The system does not currently provide delivery functionality.

### Reservation Flow

```text
Customer
   ↓
Search Medicine
   ↓
Check Availability
   ↓
Select Pharmacy
   ↓
Create Reservation
   ↓
Pharmacy Processes Reservation
   ↓
Customer Receives Status
   ↓
Customer Picks Up Medicine
```

---

## Sales

Pharmacy personnel can record and manage sales.

Supported payment methods include:

```text
CASH
CARD
E_WALLET
OTHER
```

Supported payment statuses include:

```text
PENDING
PAID
REFUNDED
CANCELLED
```

---

## Notifications

The system provides notifications for relevant events such as:

* Reservation updates
* Medicine request updates
* Prescription updates
* Other platform-related notifications

---

# User Roles

## Super Admin

```text
SUPER_ADMIN
```

Can:

* Manage pharmacies
* Manage pharmacy administrators
* Manage pharmacy staff
* Manage customers
* View system-wide reports
* View audit logs
* Manage system settings

---

## Pharmacy Admin

```text
PHARMACY_ADMIN
```

Can manage the operations of their assigned pharmacy.

```text
Dashboard
Medicines
Inventory
Prescriptions
Reservations
Medicine Requests
Customers
Sales
Reports
Settings
```

---

## Pharmacy Staff

```text
PHARMACY_STAFF
```

Can perform authorized pharmacy operational tasks such as:

* Viewing medicines
* Updating inventory
* Processing prescriptions
* Processing reservations
* Processing medicine requests
* Processing sales

---

## Customer

```text
CUSTOMER
```

Can:

* Search medicines
* View medicine information
* Check availability
* Upload prescriptions
* Request medicines
* Reserve medicines for pickup
* View reservations
* Receive notifications
* Use the AI Assistant
* Manage their profile

---

# AI Assistant

The AI Assistant is available **only on the Customer PWA**.

It is intentionally designed as a simple customer-support assistant rather than a diagnostic or medical decision-making system.

### AI Assistant Responsibilities

The assistant can help with:

* Frequently Asked Questions
* Application navigation
* Medicine information
* Reservation assistance
* Prescription assistance
* Medicine request assistance
* Platform inquiries

### Supported Message Types

```text
GENERAL
FAQ
NAVIGATION
MEDICINE_INFORMATION
RESERVATION_HELP
PRESCRIPTION_HELP
REQUEST_HELP
PLATFORM_INQUIRY
```

### AI Knowledge Categories

```text
FAQ
NAVIGATION
RESERVATION
PRESCRIPTION
MEDICINE_REQUEST
PLATFORM
```

### AI Architecture

```text
Customer PWA
      │
      ▼
Backend API
      │
      ▼
AI Service
      │
      ├── AI Model / API
      │
      └── AI Knowledge Base
```

AI conversations and messages are stored in the database for supported application functionality.

> The AI Assistant is not intended to replace a pharmacist or healthcare professional.

---

# Technology Stack

## Frontend

### Super Admin Web

* React
* Vite
* Tailwind CSS

### Pharmacy Admin Web

* React
* Vite
* Tailwind CSS

### Customer PWA

* React
* Vite
* Tailwind CSS
* Progressive Web App APIs
* Service Worker

---

## Backend

* Node.js
* Express.js
* REST API
* Authentication middleware
* Role-based authorization
* Validation middleware
* Service-based architecture

---

## Database

* PostgreSQL
* Supabase

The database uses PostgreSQL-compatible SQL and identity-generated IDs.

---

## AI

The Customer PWA includes an AI Assistant connected through the backend AI service.

The backend is responsible for communicating with the selected AI provider rather than exposing AI API credentials directly to the frontend.

---

# Project Structure

```text
pharmacy-system/
│
├── superadmin-web/          # Super Admin React application
│
├── admin-web/               # Pharmacy Admin/Staff React application
│
├── customer-pwa/            # Customer Progressive Web App
│
├── backend/                 # Shared Node/Express backend
│
├── database/                # PostgreSQL schema, migrations and seeds
│
├── docs/                    # Project documentation and diagrams
│
├── .gitignore
├── README.md
└── package.json
```

---

# Detailed Structure

```text
pharmacy-system/
│
├── superadmin-web/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── routes/
│       ├── utils/
│       ├── App.jsx
│       └── main.jsx
│
├── admin-web/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── routes/
│       ├── utils/
│       ├── App.jsx
│       └── main.jsx
│
├── customer-pwa/
│   ├── public/
│   │   ├── icons/
│   │   └── manifest.json
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── routes/
│       ├── utils/
│       ├── App.jsx
│       ├── main.jsx
│       └── sw.js
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       │   ├── superadmin/
│       │   ├── admin/
│       │   └── customer/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       ├── validators/
│       ├── utils/
│       ├── app.js
│       └── server.js
│
├── database/
│   ├── schema.sql
│   ├── migrations/
│   ├── seeds/
│   └── diagrams/
│
└── docs/
    ├── requirements/
    ├── diagrams/
    └── api/
```

---

# Database

The system uses a centralized PostgreSQL database.

The primary database entities include:

```text
pharmacies
users
medicine_categories
medicines
inventory
prescriptions
prescription_items
medicine_requests
medicine_request_items
reservations
reservation_items
sales
sale_items
notifications
ai_conversations
ai_messages
ai_knowledge
audit_logs
```

## Main Relationships

```text
PHARMACIES
    │
    ├── USERS
    │
    ├── INVENTORY
    │       │
    │       └── MEDICINES
    │
    ├── PRESCRIPTIONS
    │
    ├── MEDICINE REQUESTS
    │
    ├── RESERVATIONS
    │
    └── SALES
```

Customers interact with:

```text
MEDICINES
    ↓
INVENTORY
    ↓
RESERVATIONS
    ↓
PICKUP
```

Customers can also interact with:

```text
PRESCRIPTIONS
    ↓
PRESCRIPTION ITEMS
```

and:

```text
MEDICINE REQUESTS
    ↓
MEDICINE REQUEST ITEMS
```

The AI Assistant uses:

```text
AI_CONVERSATIONS
        │
        └── AI_MESSAGES

AI_KNOWLEDGE
```

---

# Pharmacy Data Isolation

Each pharmacy operates within its own data scope.

Pharmacy users are associated with a specific `pharmacy_id`.

This allows the backend to enforce rules such as:

```text
Pharmacy A Admin
      ↓
Can access Pharmacy A data

Pharmacy B Admin
      ↓
Can access Pharmacy B data
```

A Pharmacy Admin must not be able to access another pharmacy's operational data.

Super Admin users operate at the platform level.

Customers can interact with participating pharmacies through the customer-facing application according to the system's business rules.

---

# How the System Works

## Customer Medicine Search

```text
Customer
   ↓
Customer PWA
   ↓
Backend API
   ↓
Medicine + Inventory
   ↓
Available Pharmacies
   ↓
Customer
```

---

## Reservation

```text
Customer
   ↓
Select Medicine
   ↓
Select Pharmacy
   ↓
Choose Pickup Date
   ↓
Submit Reservation
   ↓
Backend
   ↓
Pharmacy
   ↓
Reservation Processing
   ↓
Customer Notification
```

---

## Prescription

```text
Customer
   ↓
Upload Prescription
   ↓
Backend / Storage
   ↓
Pharmacy Review
   ↓
Prescription Processing
   ↓
Customer Notification
```

---

## Medicine Request

```text
Customer
   ↓
Submit Medicine Request
   ↓
Backend
   ↓
Pharmacy Staff
   ↓
Process Request
   ↓
Customer Notification
```

---

# Installation

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* Git
* PostgreSQL or Supabase project
* VS Code recommended

Check Node.js:

```bash
node -v
```

Check npm:

```bash
npm -v
```

---

# Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd pharmacy-system
```

---

# Install Dependencies

Install dependencies for each application.

## Super Admin

```bash
cd superadmin-web
npm install
```

## Pharmacy Admin

```bash
cd ../admin-web
npm install
```

## Customer PWA

```bash
cd ../customer-pwa
npm install
```

## Backend

```bash
cd ../backend
npm install
```

---

# Environment Variables

Environment variables should **never be committed to GitHub**.

Use `.env` files locally.

Example frontend configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
```

Example backend configuration:

```env
PORT=5000

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

AI_API_KEY=your_ai_api_key
```

> Never expose a Supabase service-role key or AI secret key in a frontend `.env` file.

Add environment files to `.gitignore`.

---

# Running the Project

Each application can be run independently during development.

## Super Admin Web

```bash
cd superadmin-web
npm run dev
```

---

## Pharmacy Admin Web

```bash
cd admin-web
npm run dev
```

---

## Customer PWA

```bash
cd customer-pwa
npm run dev
```

---

## Backend

```bash
cd backend
npm run dev
```

The exact commands may vary depending on the final `package.json` scripts.

---

# API Structure

The backend API is organized according to user roles.

```text
/api
│
├── /auth
│
├── /superadmin
│   ├── /pharmacies
│   ├── /users
│   ├── /reports
│   └── /audit-logs
│
├── /admin
│   ├── /medicines
│   ├── /inventory
│   ├── /prescriptions
│   ├── /reservations
│   ├── /requests
│   ├── /customers
│   ├── /sales
│   └── /reports
│
└── /customer
    ├── /medicines
    ├── /prescriptions
    ├── /reservations
    ├── /requests
    └── /notifications
```

---

# Security

The system should enforce security at multiple levels.

### Authentication

Users must authenticate before accessing protected resources.

### Authorization

Role-based access control determines which resources a user can access.

```text
SUPER_ADMIN
PHARMACY_ADMIN
PHARMACY_STAFF
CUSTOMER
```

### Pharmacy Isolation

Pharmacy users are restricted to their assigned pharmacy.

### Validation

Backend validation is required before database operations.

### Environment Security

Sensitive credentials must remain in environment variables.

### Audit Logging

Important system actions can be recorded in:

```text
audit_logs
```

---

# MVP Scope

The current MVP focuses on the following functionality.

## Included

### Platform

* Multi-pharmacy support
* Super Admin management
* Pharmacy Admin management
* Pharmacy Staff management
* Customer accounts

### Pharmacy Operations

* Medicine management
* Inventory management
* Prescription processing
* Medicine requests
* Reservations
* Pickup management
* Sales
* Notifications
* Reports

### Customer PWA

* Customer authentication
* Medicine search
* Medicine information
* Pharmacy availability
* Prescription upload
* Medicine requests
* Reservations
* Reservation status
* Notifications
* Profile management

### AI

* FAQ assistance
* Application navigation
* Medicine information assistance
* Reservation assistance
* Prescription assistance
* Medicine request assistance
* Platform inquiries

---

# Excluded From Current MVP

The following functionality is intentionally outside the current MVP:

* Medicine delivery
* Delivery tracking
* Delivery riders
* Delivery route management
* Full medical diagnosis
* AI-based medical diagnosis
* AI prescribing medication
* Automated pharmacist replacement
* Advanced medical decision-making

---

# Development Roadmap

The recommended development sequence is:

```text
1. Database
      ↓
2. Backend Configuration
      ↓
3. Authentication
      ↓
4. Role-Based Access Control
      ↓
5. Super Admin
      ↓
6. Pharmacy Admin
      ↓
7. Pharmacy Staff
      ↓
8. Customer PWA
      ↓
9. Medicines & Inventory
      ↓
10. Prescriptions
      ↓
11. Medicine Requests
      ↓
12. Reservations
      ↓
13. Sales
      ↓
14. Notifications
      ↓
15. AI Assistant
      ↓
16. PWA Features
      ↓
17. Testing
      ↓
18. Deployment
```

---

# Future Enhancements

Possible future versions may include:

* Pharmacy-to-pharmacy inventory transfers
* Advanced analytics
* Advanced reporting
* POS integration
* Payment gateway integration
* Automated stock forecasting
* Medicine price comparison
* Pharmacy ratings and reviews
* Push notifications
* Advanced AI knowledge retrieval
* AI-powered inventory insights
* Delivery services
* Delivery tracking
* Mobile-native applications

These features are not required for the current MVP.

---

# Git Workflow

Recommended branch structure:

```text
main
│
├── develop
│
├── feature/authentication
├── feature/superadmin
├── feature/pharmacy-admin
├── feature/customer-pwa
├── feature/inventory
├── feature/reservations
├── feature/prescriptions
├── feature/medicine-requests
└── feature/ai-assistant
```

Example:

```bash
git checkout -b feature/authentication
```

Commit changes:

```bash
git add .
git commit -m "feat: implement authentication"
```

Push the branch:

```bash
git push origin feature/authentication
```

---

# GitHub Security

Do not commit:

```text
.env
.env.local
.env.production
```

Do not commit:

```text
SUPABASE_SERVICE_ROLE_KEY
AI_API_KEY
DATABASE_PASSWORD
JWT_SECRET
```

Example `.gitignore`:

```gitignore
# Dependencies
node_modules/

# Environment variables
.env
.env.*
!.env.example

# Build
dist/
build/

# Logs
*.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/
```

---

# Project Documentation

Additional documentation is stored in the `docs/` directory.

```text
docs/
├── requirements/
├── diagrams/
└── api/
```

Recommended documentation includes:

* User Requirements
* Functional Requirements
* Non-Functional Requirements
* System Architecture
* Data Flow Diagrams
* Use Case Diagrams
* Database ERD
* API Documentation

---

# Contributing

1. Create a feature branch.
2. Implement the feature.
3. Test the feature locally.
4. Commit using a descriptive commit message.
5. Push the branch.
6. Create a pull request.
7. Review and merge into the development branch.

Example:

```bash
git checkout develop
git pull

git checkout -b feature/inventory-management

git add .
git commit -m "feat: add pharmacy inventory management"

git push origin feature/inventory-management
```

---

# License

This project is currently developed as an academic/software project.

License information can be updated when the project's final distribution and ownership terms are established.

---

# Project Status

**Current Stage:** MVP Development

### Current Architecture

```text
┌──────────────────────────────────────────────┐
│              PHARMACY SYSTEM                 │
├──────────────────────────────────────────────┤
│                                              │
│  Super Admin Web                             │
│  Pharmacy Admin Web                          │
│  Customer PWA                                │
│                                              │
│              ↓                               │
│        Shared Backend API                    │
│              ↓                               │
│        PostgreSQL / Supabase                 │
│                                              │
│        Customer AI Assistant                 │
│                                              │
└──────────────────────────────────────────────┘
```

The project is being developed incrementally, with the **database and backend architecture serving as the foundation** for the three client applications.
