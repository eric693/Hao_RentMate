"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenantAuth_1 = require("../middleware/tenantAuth");
const authController_1 = require("../controllers/authController");
const userController_1 = require("../controllers/userController");
const dashboardController_1 = require("../controllers/dashboardController");
const exportController_1 = require("../controllers/exportController");
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
const taxExportController_1 = require("../controllers/taxExportController");
const paymentController_1 = require("../controllers/paymentController");
const contractController_2 = require("../controllers/contractController");
const maintenanceController_2 = require("../controllers/maintenanceController");
const taxExportController_2 = require("../controllers/taxExportController");
const aiController_1 = require("../controllers/aiController");
const handoverController_1 = require("../controllers/handoverController");
const utilityBillController_1 = require("../controllers/utilityBillController");
const creditController_1 = require("../controllers/creditController");
const rentCompsController_1 = require("../controllers/rentCompsController");
const tenantAuthController_1 = require("../controllers/tenantAuthController");
const tenantPortalController_1 = require("../controllers/tenantPortalController");
const router = (0, express_1.Router)();
// 模組權限捷徑：requireAuth + requirePermission(module)
const can = (module) => [auth_1.requireAuth, (0, auth_1.requirePermission)(module)];
// Auth（公開註冊已關閉；員工帳號一律由後台「使用者管理」建立）
router.post('/auth/login', authController_1.login);
router.get('/auth/me', auth_1.requireAuth, authController_1.me);
// 使用者管理（僅管理員）
router.get('/users', auth_1.requireAuth, auth_1.requireAdmin, userController_1.listUsers);
router.get('/users/modules', auth_1.requireAuth, auth_1.requireAdmin, userController_1.listModules);
router.post('/users', auth_1.requireAuth, auth_1.requireAdmin, userController_1.createUser);
router.put('/users/:id', auth_1.requireAuth, auth_1.requireAdmin, userController_1.updateUser);
router.delete('/users/:id', auth_1.requireAuth, auth_1.requireAdmin, userController_1.deleteUser);
// Dashboard（任何登入者）
router.get('/dashboard', auth_1.requireAuth, dashboardController_1.getDashboard);
// 資料匯出（Excel / PDF）— 權限於 controller 內依資料類型檢查
router.get('/export/:type', auth_1.requireAuth, exportController_1.exportData);
// Properties（房務）
router.get('/properties', ...can('properties'), propertyController_1.getProperties);
router.post('/properties', ...can('properties'), propertyController_1.createProperty);
router.put('/properties/:id', ...can('properties'), propertyController_1.updateProperty);
router.delete('/properties/:id', ...can('properties'), propertyController_1.deleteProperty);
// Units（房務）
router.get('/properties/:propertyId/units', ...can('properties'), unitController_1.getUnits);
router.post('/properties/:propertyId/units', ...can('properties'), unitController_1.createUnit);
router.put('/units/:id', ...can('properties'), unitController_1.updateUnit);
router.delete('/units/:id', ...can('properties'), unitController_1.deleteUnit);
// Tenants（租客）
router.get('/tenants', ...can('tenants'), tenantController_1.getTenants);
router.post('/tenants', ...can('tenants'), tenantController_1.createTenant);
router.put('/tenants/:id', ...can('tenants'), tenantController_1.updateTenant);
router.delete('/tenants/:id', ...can('tenants'), tenantController_1.deleteTenant);
router.post('/tenants/:id/line-code', ...can('tenants'), tenantController_1.generateTenantBindingCode);
// Contracts（合約）
router.get('/contracts', ...can('contracts'), contractController_1.getContracts);
router.post('/contracts', ...can('contracts'), contractController_1.createContract);
router.put('/contracts/:id', ...can('contracts'), contractController_1.updateContract);
router.post('/contracts/:id/sign-invite', ...can('contracts'), contractController_1.generateSignInvite);
router.post('/contracts/:id/compliance-check', ...can('contracts'), contractController_2.checkCompliance);
router.get('/contracts/:id/id-document', ...can('contracts'), contractController_1.getSignerIdDocument);
// Handover（點交，屬合約）
router.get('/contracts/:contractId/handovers', ...can('contracts'), handoverController_1.getHandovers);
router.post('/contracts/:contractId/handovers', ...can('contracts'), handoverController_1.createHandover);
router.put('/handovers/:id', ...can('contracts'), handoverController_1.updateHandover);
router.post('/handovers/:id/send', ...can('contracts'), handoverController_1.sendHandoverForConfirmation);
// Public handover confirmation (no auth)
router.get('/handovers/confirm/:token', handoverController_1.getHandoverByToken);
router.post('/handovers/confirm/:token', handoverController_1.confirmHandoverByToken);
// Public signing endpoints (no auth)
router.get('/contracts/sign/:token', contractController_1.getContractByToken);
router.post('/contracts/sign/:token', contractController_1.signContractByToken);
// Deposit Refund（屬合約）
router.get('/contracts/:contractId/deposit-refund', ...can('contracts'), depositRefundController_1.getDepositRefund);
router.post('/contracts/:contractId/deposit-refund', ...can('contracts'), depositRefundController_1.upsertDepositRefund);
router.put('/contracts/:contractId/deposit-refund/confirm', ...can('contracts'), depositRefundController_1.confirmRefund);
router.post('/contracts/:contractId/deposit-refund/notify', ...can('contracts'), depositRefundController_1.notifyTenantRefund);
// Reminder Settings（設定）
router.get('/settings/reminder', ...can('settings'), reminderController_1.getReminderSettings);
router.put('/settings/reminder', ...can('settings'), reminderController_1.updateReminderSettings);
router.post('/settings/reminder/trigger', ...can('settings'), reminderController_1.triggerReminders);
// Rent Records（帳務）
router.get('/rent-records', ...can('finance'), rentController_1.getRentRecords);
router.put('/rent-records/:id/confirm', ...can('finance'), rentController_1.confirmPayment);
router.post('/rent-records/mark-overdue', ...can('finance'), rentController_1.markOverdue);
router.post('/rent-records/:id/remind', ...can('finance'), rentController_1.sendReminder);
// Maintenance（報修）
router.get('/maintenance', ...can('maintenance'), maintenanceController_1.getMaintenanceRequests);
router.post('/maintenance', ...can('maintenance'), maintenanceController_1.createMaintenanceRequest);
router.put('/maintenance/:id', ...can('maintenance'), maintenanceController_1.updateMaintenanceRequest);
router.post('/maintenance/:id/analyze', ...can('maintenance'), maintenanceController_2.analyzeMaintenanceRequest);
// Expenses（帳務）
router.get('/expenses', ...can('finance'), expenseController_1.getExpenses);
router.post('/expenses', ...can('finance'), expenseController_1.createExpense);
router.put('/expenses/:id/confirm', ...can('finance'), expenseController_1.confirmExpense);
router.put('/expenses/:id', ...can('finance'), expenseController_1.updateExpense);
router.delete('/expenses/:id', ...can('finance'), expenseController_1.deleteExpense);
router.get('/expenses/trend', ...can('finance'), expenseController_1.getExpenseTrend);
// Calendar（任何登入者）
router.get('/calendar', auth_1.requireAuth, calendarController_1.getCalendarEvents);
// Finance（帳務）
router.get('/collection-workbench', ...can('finance'), collectionWorkbenchController_1.getCollectionWorkbench);
router.get('/finance-overview', ...can('finance'), collectionWorkbenchController_1.getFinanceOverview);
router.get('/roi', ...can('roi'), roiController_1.getROIAnalysis);
router.get('/tax-export', ...can('finance'), taxExportController_1.exportTaxReport);
router.get('/tax-export/precheck', ...can('finance'), taxExportController_2.taxPrecheck);
// Utility bills（帳務）
router.get('/utility-bills', ...can('finance'), utilityBillController_1.getUtilityBills);
router.post('/utility-bills/preview', ...can('finance'), utilityBillController_1.previewUtilitySplit);
router.post('/utility-bills', ...can('finance'), utilityBillController_1.createUtilityBill);
router.put('/utility-bills/:id', ...can('finance'), utilityBillController_1.updateUtilityBill);
router.post('/utility-bills/:id/bill', ...can('finance'), utilityBillController_1.billUtilityToTenants);
// Rent comps（租金行情）
router.get('/rent-comps', ...can('market'), rentCompsController_1.getRentComps);
router.get('/units/:unitId/pricing', ...can('market'), rentCompsController_1.getUnitPricing);
// Tenant credit（租客）
router.get('/tenant-credit', ...can('tenants'), creditController_1.getTenantsCreditOverview);
router.get('/tenants/:id/credit', ...can('tenants'), creditController_1.getTenantCredit);
// AI（任何登入者）
router.post('/ai/assistant', auth_1.requireAuth, aiController_1.assistantChat);
router.get('/ai/insights', auth_1.requireAuth, aiController_1.getFinancialInsights);
router.post('/ai/draft-clauses', auth_1.requireAuth, aiController_1.draftClauses);
// Listings（空房刊登）
router.get('/listings/vacant', ...can('listings'), listingController_1.getVacantUnits);
router.post('/listings/units/:unitId', ...can('listings'), listingController_1.addListing);
router.put('/listings/:id', ...can('listings'), listingController_1.updateListing);
router.delete('/listings/:id', ...can('listings'), listingController_1.deleteListing);
// Payments / 金流自動對帳（帳務）
router.get('/payments', ...can('finance'), paymentController_1.getPayments);
router.get('/payments/unmatched', ...can('finance'), paymentController_1.getUnmatchedPayments);
router.get('/payments/:id/suggestions', ...can('finance'), paymentController_1.getMatchSuggestions);
router.post('/payments/:id/match', ...can('finance'), paymentController_1.matchPayment);
router.post('/payments/simulate', ...can('finance'), paymentController_1.simulatePayment);
router.get('/contracts/:contractId/virtual-account', ...can('finance'), paymentController_1.getContractVirtualAccount);
// Webhook（對外，無 JWT）
router.post('/payments/webhook/:provider', paymentController_1.paymentWebhook);
// LINE（設定）
router.post('/line/webhook', lineController_1.webhook);
router.get('/line/binding', ...can('settings'), lineController_1.getLandlordBinding);
router.post('/line/binding/generate', ...can('settings'), lineController_1.generateLandlordBindingCode);
router.delete('/line/binding', ...can('settings'), lineController_1.unbindLandlord);
router.get('/line/tenants', ...can('settings'), lineController_1.getTenantBindings);
// ── 租客端 Portal（獨立 JWT，kind=tenant）──────────────────────────
router.get('/tenant/auth/config', tenantAuthController_1.tenantAuthConfig);
router.post('/tenant/auth/login', tenantAuthController_1.tenantLogin);
router.get('/tenant/me', tenantAuth_1.requireTenant, tenantPortalController_1.tenantMe);
router.get('/tenant/contracts', tenantAuth_1.requireTenant, tenantPortalController_1.tenantContracts);
router.get('/tenant/rent-records', tenantAuth_1.requireTenant, tenantPortalController_1.tenantRentRecords);
router.get('/tenant/payment-info', tenantAuth_1.requireTenant, tenantPortalController_1.tenantPaymentInfo);
router.get('/tenant/maintenance', tenantAuth_1.requireTenant, tenantPortalController_1.tenantMaintenanceList);
router.post('/tenant/maintenance', tenantAuth_1.requireTenant, tenantPortalController_1.tenantCreateMaintenance);
router.get('/tenant/handovers', tenantAuth_1.requireTenant, handoverController_1.tenantHandovers);
router.post('/tenant/handovers/:id/confirm', tenantAuth_1.requireTenant, handoverController_1.tenantConfirmHandover);
router.get('/tenant/credit', tenantAuth_1.requireTenant, creditController_1.getMyCredit);
exports.default = router;
