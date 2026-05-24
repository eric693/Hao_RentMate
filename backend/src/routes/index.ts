import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { register, login, me } from '../controllers/authController';
import { getDashboard } from '../controllers/dashboardController';
import { getProperties, createProperty, updateProperty, deleteProperty } from '../controllers/propertyController';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../controllers/unitController';
import { getTenants, createTenant, updateTenant, deleteTenant, generateTenantBindingCode } from '../controllers/tenantController';
import { getContracts, createContract, updateContract, generateSignInvite, getContractByToken, signContractByToken } from '../controllers/contractController';
import { getDepositRefund, upsertDepositRefund, confirmRefund, notifyTenantRefund } from '../controllers/depositRefundController';
import { getVacantUnits, addListing, updateListing, deleteListing } from '../controllers/listingController';
import { getReminderSettings, updateReminderSettings, triggerReminders } from '../controllers/reminderController';
import { getRentRecords, confirmPayment, markOverdue, sendReminder } from '../controllers/rentController';
import { getMaintenanceRequests, createMaintenanceRequest, updateMaintenanceRequest } from '../controllers/maintenanceController';
import { getExpenses, createExpense, deleteExpense, confirmExpense, getExpenseTrend } from '../controllers/expenseController';
import { webhook, getLandlordBinding, generateLandlordBindingCode, unbindLandlord, getTenantBindings } from '../controllers/lineController';
import { getCalendarEvents } from '../controllers/calendarController';
import { getCollectionWorkbench, getFinanceOverview } from '../controllers/collectionWorkbenchController';
import { getROIAnalysis } from '../controllers/roiController';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);

// Dashboard
router.get('/dashboard', requireAuth, getDashboard);

// Properties
router.get('/properties', requireAuth, getProperties);
router.post('/properties', requireAuth, createProperty);
router.put('/properties/:id', requireAuth, updateProperty);
router.delete('/properties/:id', requireAuth, deleteProperty);

// Units
router.get('/properties/:propertyId/units', requireAuth, getUnits);
router.post('/properties/:propertyId/units', requireAuth, createUnit);
router.put('/units/:id', requireAuth, updateUnit);
router.delete('/units/:id', requireAuth, deleteUnit);

// Tenants
router.get('/tenants', requireAuth, getTenants);
router.post('/tenants', requireAuth, createTenant);
router.put('/tenants/:id', requireAuth, updateTenant);
router.delete('/tenants/:id', requireAuth, deleteTenant);
router.post('/tenants/:id/line-code', requireAuth, generateTenantBindingCode);

// Contracts
router.get('/contracts', requireAuth, getContracts);
router.post('/contracts', requireAuth, createContract);
router.put('/contracts/:id', requireAuth, updateContract);
router.post('/contracts/:id/sign-invite', requireAuth, generateSignInvite);
// Public signing endpoints (no auth)
router.get('/contracts/sign/:token', getContractByToken);
router.post('/contracts/sign/:token', signContractByToken);

// Deposit Refund
router.get('/contracts/:contractId/deposit-refund', requireAuth, getDepositRefund);
router.post('/contracts/:contractId/deposit-refund', requireAuth, upsertDepositRefund);
router.put('/contracts/:contractId/deposit-refund/confirm', requireAuth, confirmRefund);
router.post('/contracts/:contractId/deposit-refund/notify', requireAuth, notifyTenantRefund);

// Reminder Settings
router.get('/settings/reminder', requireAuth, getReminderSettings);
router.put('/settings/reminder', requireAuth, updateReminderSettings);
router.post('/settings/reminder/trigger', requireAuth, triggerReminders);

// Rent Records
router.get('/rent-records', requireAuth, getRentRecords);
router.put('/rent-records/:id/confirm', requireAuth, confirmPayment);
router.post('/rent-records/mark-overdue', requireAuth, markOverdue);
router.post('/rent-records/:id/remind', requireAuth, sendReminder);

// Maintenance
router.get('/maintenance', requireAuth, getMaintenanceRequests);
router.post('/maintenance', requireAuth, createMaintenanceRequest);
router.put('/maintenance/:id', requireAuth, updateMaintenanceRequest);

// Expenses
router.get('/expenses', requireAuth, getExpenses);
router.post('/expenses', requireAuth, createExpense);
router.put('/expenses/:id/confirm', requireAuth, confirmExpense);
router.delete('/expenses/:id', requireAuth, deleteExpense);
router.get('/expenses/trend', requireAuth, getExpenseTrend);

// Calendar
router.get('/calendar', requireAuth, getCalendarEvents);

// Finance
router.get('/collection-workbench', requireAuth, getCollectionWorkbench);
router.get('/finance-overview', requireAuth, getFinanceOverview);
router.get('/roi', requireAuth, getROIAnalysis);

// Listings (vacant units)
router.get('/listings/vacant', requireAuth, getVacantUnits);
router.post('/listings/units/:unitId', requireAuth, addListing);
router.put('/listings/:id', requireAuth, updateListing);
router.delete('/listings/:id', requireAuth, deleteListing);

// LINE
router.post('/line/webhook', webhook);
router.get('/line/binding', requireAuth, getLandlordBinding);
router.post('/line/binding/generate', requireAuth, generateLandlordBindingCode);
router.delete('/line/binding', requireAuth, unbindLandlord);
router.get('/line/tenants', requireAuth, getTenantBindings);

export default router;
