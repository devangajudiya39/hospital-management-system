# Hospital Management System (HMS)

A comprehensive, full-stack Hospital Management System designed to streamline hospital operations, enhance clinical workflows, and improve administrative efficiency. This platform features tailored dashboards for different roles and integrates various hospital modules including Pharmacy, Reception, Laboratory, and Billing.

## 🌟 Key Features & Modules

- **Admin Module**: Oversee operations, manage staff and patient records, and view holistic hospital statistics.
- **Doctor Dashboard**: Manage daily appointments, access patient medical histories, and utilize a realtime stock-aware prescribing module.
- **Patient Portal**: Schedule and view appointments, download lab reports, and review billing statements online.
- **Receptionist Dashboard**: Handle patient registration, schedule appointments, and manage room/bed allocations efficiently.
- **Laboratory Module**: Manage patient tests and securely upload lab reports (PDFs) to Cloudinary, ensuring automatic access for doctors and patients.
- **Pharmacy System**: Track live inventory of medicines, fulfill doctor prescriptions directly from the system, and dispense medicines.
- **Billing System**: Flexible invoicing with support for partial and complete payments, and automated bill generation (PDF).

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 with Vite for ultra-fast performance.
- **Styling**: Tailwind CSS 4 for a modern, responsive, and highly customizable UI.
- **Routing**: React Router DOM for seamless navigation.
- **Document Generation**: jsPDF and xlsx for robust reporting and data exports.

### Backend
- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ORM)
- **Security & Authentication**: bcrypt & JSON Web Tokens (JWT)
- **File Storage**: Cloudinary integration for scalable medi/PDF uploads.
- **Email Service**: Nodemailer for automated system notifications.
- **File Uploads**: Multer middleware.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URL)
- Cloudinary Account (for report uploads)

### 1. Database Configuration
The application uses MongoDB as the primary database. Have your connection URI handy. By default, the connection URI might be configured inside `backend/server.js` or via your `.env` file.

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (`.env`) in the `backend` directory (example):
   ```env
   PORT=8080
   # Add your Cloudinary, JWT Secret, and Email variables as required
   # If MONGODB_URI is required globally
   ```
4. Seed the database with initial mock data (optional but recommended):
   ```bash
   node seed_demo.js   # or node seed.js / node seed_medicines.js
   ```
5. Start the backend server:
   ```bash
   node server.js
   ```
   *The server typically runs on `http://localhost:8080`.*

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The client application typically runs on `http://localhost:5173`.*

## 🏗️ Architecture & Workflow Integration

The HMS features event-driven architecture directly connecting the ecosystem:
- **Prescription to Pharmacy:** When a doctor prescribes medication, the pharmacy dashboard is instantly updated with deduction logs.
- **Lab to Doctor/Patient:** Uploading a lab output immediately syncs to the assigned doctor's clinical review and the patient's individual portal.
- **Centralized Authentication:** Security protocols evaluate the `role` upon login and forcefully route the user to their corresponding protected dashboard.

---
*Developed as part of the Software Engineering coursework.*
