"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authController_1 = require("../controllers/authController");
const dashboardController_1 = require("../controllers/dashboardController");
const propertyController_1 = require("../controllers/propertyController");
const unitController_1 = require("../controllers/unitController");
const tenantController_1 = require("../controllers/tenantController");
const contractController_1 = require("../controllers/contractController");
const depositRefundController_1 = require("../controllers/depositRefundController");
const listingController_1 = require("../controllers/listingController");
const reminderController_1 = require("../controllers/reminderController");
const rentController_1 = require("../controllers/rentController");
const maintenanceController_1 = require("../controllers/maintenanceController");
const expenseController_1 = require("../controllers/expenseController");
const lineController_1 = require("../controllers/lineController");
const calendarController_1 = require("../controllers/calendarController");
const collectionWorkbenchController_1 = require("../controllers/collectionWorkbenchController");
const roiController_1 = require("../controllers/roiController");
const router = (0, express_1.Router)();
// Auth
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.get('/auth/me', auth_1.requireAuth, authController_1.me);
// Dashboard
router.get('/dashboard', auth_1.requireAuth, dashboardController_1.getDashboard);
// Properties
router.get('/properties', auth_1.requireAuth, propertyController_1.getProperties);
router.post('/properties', auth_1.requireAuth, propertyController_1.createProperty);
router.put('/properties/:id', auth_1.requireAuth, propertyController_1.updateProperty);
router.delete('/properties/:id', auth_1.requireAuth, propertyController_1.deleteProperty);
// Units
router.get('/properties/:propertyId/units', auth_1.requireAuth, unitController_1.getUnits);
router.post('/properties/:propertyId/units', auth_1.requireAuth, unitController_1.createUnit);
router.put('/units/:id', auth_1.requireAuth, unitController_1.updateUnit);
router.delete('/units/:id', auth_1.requireAuth, unitController_1.deleteUnit);
// Tenants
router.get('/tenants', auth_1.requireAuth, tenantController_1.getTenants);
router.post('/tenants', auth_1.requireAuth, tenantController_1.createTenant);
router.put('/tenants/:id', auth_1.requireAuth, tenantController_1.updateTenant);
router.delete('/tenants/:id', auth_1.requireAuth, tenantController_1.deleteTenant);
router.post('/tenants/:id/line-code', auth_1.requireAuth, tenantController_1.generateTenantBindingCode);
// Contracts
router.get('/contracts', auth_1.requireAuth, contractController_1.getContracts);
router.post('/contracts', auth_1.requireAuth, contractController_1.createContract);
router.put('/contracts/:id', auth_1.requireAuth, contractController_1.updateContract);
router.post('/contracts/:id/sign-invite', auth_1.requireAuth, contractController_1.generateSignInvite);
// Public signing endpoints (no auth)
router.get('/contracts/sign/:token', contractController_1.getContractByToken);
router.post('/contracts/sign/:token', contractController_1.signContractByToken);
// Deposit Refund
router.get('/contracts/:contractId/deposit-refund', auth_1.requireAuth, depositRefundController_1.getDepositRefund);
router.post('/contracts/:contractId/deposit-refund', auth_1.requireAuth, depositRefundController_1.upsertDepositRefund);
router.put('/contracts/:contractId/deposit-refund/confirm', auth_1.requireAuth, depositRefundController_1.confirmRefund);
router.post('/contracts/:contractId/deposit-refund/notify', auth_1.requireAuth, depositRefundController_1.notifyTenantRefund);
// Reminder Settings
router.get('/settings/reminder', auth_1.requireAuth, reminderController_1.getReminderSettings);
router.put('/settings/reminder', auth_1.requireAuth, reminderController_1.updateReminderSettings);
router.post('/settings/reminder/trigger', auth_1.requireAuth, reminderController_1.triggerReminders);
// Rent Records
router.get('/rent-records', auth_1.requireAuth, rentController_1.getRentRecords);
router.put('/rent-records/:id/confirm', auth_1.requireAuth, rentController_1.confirmPayment);
router.post('/rent-records/mark-overdue', auth_1.requireAuth, rentController_1.markOverdue);
router.post('/rent-records/:id/remind', auth_1.requireAuth, rentController_1.sendReminder);
// Maintenance
router.get('/maintenance', auth_1.requireAuth, maintenanceController_1.getMaintenanceRequests);
router.post('/maintenance', auth_1.requireAuth, maintenanceController_1.createMaintenanceRequest);
router.put('/maintenance/:id', auth_1.requireAuth, maintenanceController_1.updateMaintenanceRequest);
// Expenses
router.get('/expenses', auth_1.requireAuth, expenseController_1.getExpenses);
router.post('/expenses', auth_1.requireAuth, expenseController_1.createExpense);
router.put('/expenses/:id/confirm', auth_1.requireAuth, expenseController_1.confirmExpense);
router.delete('/expenses/:id', auth_1.requireAuth, expenseController_1.deleteExpense);
router.get('/expenses/trend', auth_1.requireAuth, expenseController_1.getExpenseTrend);
// Calendar
router.get('/calendar', auth_1.requireAuth, calendarController_1.getCalendarEvents);
// Finance
router.get('/collection-workbench', auth_1.requireAuth, collectionWorkbenchController_1.getCollectionWorkbench);
router.get('/finance-overview', auth_1.requireAuth, collectionWorkbenchController_1.getFinanceOverview);
router.get('/roi', auth_1.requireAuth, roiController_1.getROIAnalysis);
// Listings (vacant units)
router.get('/listings/vacant', auth_1.requireAuth, listingController_1.getVacantUnits);
router.post('/listings/units/:unitId', auth_1.requireAuth, listingController_1.addListing);
router.put('/listings/:id', auth_1.requireAuth, listingController_1.updateListing);
router.delete('/listings/:id', auth_1.requireAuth, listingController_1.deleteListing);
// LINE
router.post('/line/webhook', lineController_1.webhook);
router.get('/line/binding', auth_1.requireAuth, lineController_1.getLandlordBinding);
router.post('/line/binding/generate', auth_1.requireAuth, lineController_1.generateLandlordBindingCode);
router.delete('/line/binding', auth_1.requireAuth, lineController_1.unbindLandlord);
router.get('/line/tenants', auth_1.requireAuth, lineController_1.getTenantBindings);
exports.default = router;
