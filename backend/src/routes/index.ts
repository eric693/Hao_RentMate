import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenantAuth';
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
import { exportTaxReport } from '../controllers/taxExportController';
import {
  getPayments, getUnmatchedPayments, matchPayment, getContractVirtualAccount,
  paymentWebhook, simulatePayment, getMatchSuggestions,
} from '../controllers/paymentController';
import { checkCompliance } from '../controllers/contractController';
import { analyzeMaintenanceRequest } from '../controllers/maintenanceController';
import { taxPrecheck } from '../controllers/taxExportController';
import { assistantChat, getFinancialInsights, draftClauses } from '../controllers/aiController';
import {
  getHandovers, createHandover, updateHandover, sendHandoverForConfirmation,
  getHandoverByToken, confirmHandoverByToken, tenantHandovers, tenantConfirmHandover,
} from '../controllers/handoverController';
import {
  previewUtilitySplit, createUtilityBill, getUtilityBills, billUtilityToTenants,
} from '../controllers/utilityBillController';
import { getTenantCredit, getTenantsCreditOverview, getMyCredit } from '../controllers/creditController';
import { getRentComps, getUnitPricing } from '../controllers/rentCompsController';
import { tenantLogin, tenantAuthConfig } from '../controllers/tenantAuthController';
import {
  tenantMe, tenantContracts, tenantRentRecords, tenantPaymentInfo,
  tenantMaintenanceList, tenantCreateMaintenance,
} from '../controllers/tenantPortalController';

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
router.post('/contracts/:id/compliance-check', requireAuth, checkCompliance);

// Handover（點交相冊）
router.get('/contracts/:contractId/handovers', requireAuth, getHandovers);
router.post('/contracts/:contractId/handovers', requireAuth, createHandover);
router.put('/handovers/:id', requireAuth, updateHandover);
router.post('/handovers/:id/send', requireAuth, sendHandoverForConfirmation);
// Public handover confirmation (no auth)
router.get('/handovers/confirm/:token', getHandoverByToken);
router.post('/handovers/confirm/:token', confirmHandoverByToken);
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
router.post('/maintenance/:id/analyze', requireAuth, analyzeMaintenanceRequest);

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
router.get('/tax-export', requireAuth, exportTaxReport);
router.get('/tax-export/precheck', requireAuth, taxPrecheck);

// Utility bills（水電費分攤）
router.get('/utility-bills', requireAuth, getUtilityBills);
router.post('/utility-bills/preview', requireAuth, previewUtilitySplit);
router.post('/utility-bills', requireAuth, createUtilityBill);
router.post('/utility-bills/:id/bill', requireAuth, billUtilityToTenants);

// Rent comps（在地租金行情）
router.get('/rent-comps', requireAuth, getRentComps);
router.get('/units/:unitId/pricing', requireAuth, getUnitPricing);

// Tenant credit（租客信用分）
router.get('/tenant-credit', requireAuth, getTenantsCreditOverview);
router.get('/tenants/:id/credit', requireAuth, getTenantCredit);

// AI（房東助理 / 財務洞察 / 合約條款草擬）
router.post('/ai/assistant', requireAuth, assistantChat);
router.get('/ai/insights', requireAuth, getFinancialInsights);
router.post('/ai/draft-clauses', requireAuth, draftClauses);

// Listings (vacant units)
router.get('/listings/vacant', requireAuth, getVacantUnits);
router.post('/listings/units/:unitId', requireAuth, addListing);
router.put('/listings/:id', requireAuth, updateListing);
router.delete('/listings/:id', requireAuth, deleteListing);

// Payments / 金流自動對帳
router.get('/payments', requireAuth, getPayments);
router.get('/payments/unmatched', requireAuth, getUnmatchedPayments);
router.get('/payments/:id/suggestions', requireAuth, getMatchSuggestions);
router.post('/payments/:id/match', requireAuth, matchPayment);
router.post('/payments/simulate', requireAuth, simulatePayment);
router.get('/contracts/:contractId/virtual-account', requireAuth, getContractVirtualAccount);
// Webhook（對外，無 JWT）
router.post('/payments/webhook/:provider', paymentWebhook);

// LINE
router.post('/line/webhook', webhook);
router.get('/line/binding', requireAuth, getLandlordBinding);
router.post('/line/binding/generate', requireAuth, generateLandlordBindingCode);
router.delete('/line/binding', requireAuth, unbindLandlord);
router.get('/line/tenants', requireAuth, getTenantBindings);

// ── 租客端 Portal（獨立 JWT，kind=tenant）──────────────────────────
router.get('/tenant/auth/config', tenantAuthConfig);
router.post('/tenant/auth/login', tenantLogin);
router.get('/tenant/me', requireTenant, tenantMe);
router.get('/tenant/contracts', requireTenant, tenantContracts);
router.get('/tenant/rent-records', requireTenant, tenantRentRecords);
router.get('/tenant/payment-info', requireTenant, tenantPaymentInfo);
router.get('/tenant/maintenance', requireTenant, tenantMaintenanceList);
router.post('/tenant/maintenance', requireTenant, tenantCreateMaintenance);
router.get('/tenant/handovers', requireTenant, tenantHandovers);
router.post('/tenant/handovers/:id/confirm', requireTenant, tenantConfirmHandover);
router.get('/tenant/credit', requireTenant, getMyCredit);

export default router;
