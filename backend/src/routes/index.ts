import { Router } from 'express';
import { requireAuth, requirePermission, requireAdmin } from '../middleware/auth';
import { requireTenant } from '../middleware/tenantAuth';
import { register, login, me } from '../controllers/authController';
import { listUsers, listModules, createUser, updateUser, deleteUser } from '../controllers/userController';
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

// 模組權限捷徑：requireAuth + requirePermission(module)
const can = (module: string) => [requireAuth, requirePermission(module)];

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);

// 使用者管理（僅管理員）
router.get('/users', requireAuth, requireAdmin, listUsers);
router.get('/users/modules', requireAuth, requireAdmin, listModules);
router.post('/users', requireAuth, requireAdmin, createUser);
router.put('/users/:id', requireAuth, requireAdmin, updateUser);
router.delete('/users/:id', requireAuth, requireAdmin, deleteUser);

// Dashboard（任何登入者）
router.get('/dashboard', requireAuth, getDashboard);

// Properties（房務）
router.get('/properties', ...can('properties'), getProperties);
router.post('/properties', ...can('properties'), createProperty);
router.put('/properties/:id', ...can('properties'), updateProperty);
router.delete('/properties/:id', ...can('properties'), deleteProperty);

// Units（房務）
router.get('/properties/:propertyId/units', ...can('properties'), getUnits);
router.post('/properties/:propertyId/units', ...can('properties'), createUnit);
router.put('/units/:id', ...can('properties'), updateUnit);
router.delete('/units/:id', ...can('properties'), deleteUnit);

// Tenants（租客）
router.get('/tenants', ...can('tenants'), getTenants);
router.post('/tenants', ...can('tenants'), createTenant);
router.put('/tenants/:id', ...can('tenants'), updateTenant);
router.delete('/tenants/:id', ...can('tenants'), deleteTenant);
router.post('/tenants/:id/line-code', ...can('tenants'), generateTenantBindingCode);

// Contracts（合約）
router.get('/contracts', ...can('contracts'), getContracts);
router.post('/contracts', ...can('contracts'), createContract);
router.put('/contracts/:id', ...can('contracts'), updateContract);
router.post('/contracts/:id/sign-invite', ...can('contracts'), generateSignInvite);
router.post('/contracts/:id/compliance-check', ...can('contracts'), checkCompliance);

// Handover（點交，屬合約）
router.get('/contracts/:contractId/handovers', ...can('contracts'), getHandovers);
router.post('/contracts/:contractId/handovers', ...can('contracts'), createHandover);
router.put('/handovers/:id', ...can('contracts'), updateHandover);
router.post('/handovers/:id/send', ...can('contracts'), sendHandoverForConfirmation);
// Public handover confirmation (no auth)
router.get('/handovers/confirm/:token', getHandoverByToken);
router.post('/handovers/confirm/:token', confirmHandoverByToken);
// Public signing endpoints (no auth)
router.get('/contracts/sign/:token', getContractByToken);
router.post('/contracts/sign/:token', signContractByToken);

// Deposit Refund（屬合約）
router.get('/contracts/:contractId/deposit-refund', ...can('contracts'), getDepositRefund);
router.post('/contracts/:contractId/deposit-refund', ...can('contracts'), upsertDepositRefund);
router.put('/contracts/:contractId/deposit-refund/confirm', ...can('contracts'), confirmRefund);
router.post('/contracts/:contractId/deposit-refund/notify', ...can('contracts'), notifyTenantRefund);

// Reminder Settings（設定）
router.get('/settings/reminder', ...can('settings'), getReminderSettings);
router.put('/settings/reminder', ...can('settings'), updateReminderSettings);
router.post('/settings/reminder/trigger', ...can('settings'), triggerReminders);

// Rent Records（帳務）
router.get('/rent-records', ...can('finance'), getRentRecords);
router.put('/rent-records/:id/confirm', ...can('finance'), confirmPayment);
router.post('/rent-records/mark-overdue', ...can('finance'), markOverdue);
router.post('/rent-records/:id/remind', ...can('finance'), sendReminder);

// Maintenance（報修）
router.get('/maintenance', ...can('maintenance'), getMaintenanceRequests);
router.post('/maintenance', ...can('maintenance'), createMaintenanceRequest);
router.put('/maintenance/:id', ...can('maintenance'), updateMaintenanceRequest);
router.post('/maintenance/:id/analyze', ...can('maintenance'), analyzeMaintenanceRequest);

// Expenses（帳務）
router.get('/expenses', ...can('finance'), getExpenses);
router.post('/expenses', ...can('finance'), createExpense);
router.put('/expenses/:id/confirm', ...can('finance'), confirmExpense);
router.delete('/expenses/:id', ...can('finance'), deleteExpense);
router.get('/expenses/trend', ...can('finance'), getExpenseTrend);

// Calendar（任何登入者）
router.get('/calendar', requireAuth, getCalendarEvents);

// Finance（帳務）
router.get('/collection-workbench', ...can('finance'), getCollectionWorkbench);
router.get('/finance-overview', ...can('finance'), getFinanceOverview);
router.get('/roi', ...can('roi'), getROIAnalysis);
router.get('/tax-export', ...can('finance'), exportTaxReport);
router.get('/tax-export/precheck', ...can('finance'), taxPrecheck);

// Utility bills（帳務）
router.get('/utility-bills', ...can('finance'), getUtilityBills);
router.post('/utility-bills/preview', ...can('finance'), previewUtilitySplit);
router.post('/utility-bills', ...can('finance'), createUtilityBill);
router.post('/utility-bills/:id/bill', ...can('finance'), billUtilityToTenants);

// Rent comps（租金行情）
router.get('/rent-comps', ...can('market'), getRentComps);
router.get('/units/:unitId/pricing', ...can('market'), getUnitPricing);

// Tenant credit（租客）
router.get('/tenant-credit', ...can('tenants'), getTenantsCreditOverview);
router.get('/tenants/:id/credit', ...can('tenants'), getTenantCredit);

// AI（任何登入者）
router.post('/ai/assistant', requireAuth, assistantChat);
router.get('/ai/insights', requireAuth, getFinancialInsights);
router.post('/ai/draft-clauses', requireAuth, draftClauses);

// Listings（空房刊登）
router.get('/listings/vacant', ...can('listings'), getVacantUnits);
router.post('/listings/units/:unitId', ...can('listings'), addListing);
router.put('/listings/:id', ...can('listings'), updateListing);
router.delete('/listings/:id', ...can('listings'), deleteListing);

// Payments / 金流自動對帳（帳務）
router.get('/payments', ...can('finance'), getPayments);
router.get('/payments/unmatched', ...can('finance'), getUnmatchedPayments);
router.get('/payments/:id/suggestions', ...can('finance'), getMatchSuggestions);
router.post('/payments/:id/match', ...can('finance'), matchPayment);
router.post('/payments/simulate', ...can('finance'), simulatePayment);
router.get('/contracts/:contractId/virtual-account', ...can('finance'), getContractVirtualAccount);
// Webhook（對外，無 JWT）
router.post('/payments/webhook/:provider', paymentWebhook);

// LINE（設定）
router.post('/line/webhook', webhook);
router.get('/line/binding', ...can('settings'), getLandlordBinding);
router.post('/line/binding/generate', ...can('settings'), generateLandlordBindingCode);
router.delete('/line/binding', ...can('settings'), unbindLandlord);
router.get('/line/tenants', ...can('settings'), getTenantBindings);

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
