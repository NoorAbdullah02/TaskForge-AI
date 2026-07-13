import { Router } from 'express';
import { checkValiditi } from '../middleware/checkValidUser';
import { validate } from '../middleware/validation.middleware';
import { BillingController } from '../controllers/billing.controller';
import { SubmitPaymentSchema } from '../validations/payment';

const router = Router();

router.use(checkValiditi);

router.get('/plans', BillingController.getPlans);
router.get('/subscription', BillingController.getSubscription);
router.post('/payments', validate(SubmitPaymentSchema), BillingController.submitPayment);
router.get('/payments', BillingController.getPayments);
router.get('/history', BillingController.getBillingHistory);
router.get('/invoices', BillingController.getInvoices);
router.get('/invoices/:id/pdf', BillingController.downloadInvoicePdf);
router.post('/subscription/cancel', BillingController.cancelSubscription);

export default router;
