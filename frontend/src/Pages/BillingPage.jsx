import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getPlans,
    getSubscription,
    submitPayment,
    getBillingHistory,
    getInvoices,
    downloadInvoicePdf,
} from '../Services/billingApi';
import { socket } from '../Services/socket';
import {
    CreditCard,
    Clock,
    CheckCircle2,
    XCircle,
    Copy,
    Download,
    History,
    ShieldCheck,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Badge } from '../design-system/primitives';

const PLAN_ORDER = ['free', 'pro', 'enterprise'];

const BillingPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [plansData, setPlansData] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [trialRemainingDays, setTrialRemainingDays] = useState(0);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [history, setHistory] = useState([]);
    const [invoices, setInvoicesList] = useState([]);

    const [billingCycle, setBillingCycle] = useState('monthly');
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [method, setMethod] = useState('bkash');
    const [transactionId, setTransactionId] = useState('');
    const [senderNumber, setSenderNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user && user.role !== 'owner') {
            toast.error('Only workspace owners can access billing.');
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            const [plans, sub, hist, inv] = await Promise.all([
                getPlans(),
                getSubscription(),
                getBillingHistory(),
                getInvoices(),
            ]);
            setPlansData(plans);
            setSubscription(sub.subscription);
            setTrialRemainingDays(sub.trialRemainingDays);
            setIsReadOnly(sub.isReadOnly);
            setHistory(hist || []);
            setInvoicesList(inv || []);
        } catch (error) {
            console.error('Failed to load billing data:', error);
            toast.error('Could not load billing information.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        const onVerified = () => {
            toast.success('Payment verified! Your subscription is now active.');
            loadAll();
        };
        const onRejected = (data) => {
            toast.error(`Payment rejected: ${data?.rejectionReason || 'See billing history for details.'}`);
            loadAll();
        };
        const onSubUpdated = () => loadAll();

        socket.on('payment.verified', onVerified);
        socket.on('payment.rejected', onRejected);
        socket.on('subscription.updated', onSubUpdated);

        return () => {
            socket.off('payment.verified', onVerified);
            socket.off('payment.rejected', onRejected);
            socket.off('subscription.updated', onSubUpdated);
        };
    }, [loadAll]);

    const openPayDialog = (plan) => {
        setSelectedPlan(plan);
        setTransactionId('');
        setSenderNumber('');
        setMethod('bkash');
        setPayDialogOpen(true);
    };

    const merchantNumber = plansData?.merchantNumbers?.[method];

    const copyMerchantNumber = () => {
        navigator.clipboard.writeText(merchantNumber || '');
        toast.success('Payment number copied successfully.');
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        if (!transactionId.trim() || !senderNumber.trim()) {
            toast.error('Transaction ID and sender number are required.');
            return;
        }
        try {
            setSubmitting(true);
            await submitPayment({
                plan: selectedPlan,
                billingCycle,
                method,
                transactionId: transactionId.trim(),
                senderNumber: senderNumber.trim(),
            });
            toast.success('Payment submitted! Awaiting Super Admin verification.');
            setPayDialogOpen(false);
            loadAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadInvoice = async (invoice) => {
        try {
            const blob = await downloadInvoicePdf(invoice.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.invoiceNumber}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download invoice');
        }
    };

    if (loading || !plansData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
        );
    }

    const currentPlan = subscription?.plan || 'free';

    return (
        <div className="min-h-screen text-ink py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
                <div className="pb-6 border-b border-line mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-brand" />
                        Billing & Subscription
                    </h1>
                    <p className="text-ink-soft mt-1 font-medium">
                        Manage your workspace plan, payments, and invoices.
                    </p>
                </div>

                {isReadOnly && (
                    <div className="mb-8 bg-danger/10 border border-danger/30 rounded-2xl p-4 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-danger flex-shrink-0" />
                        <p className="text-sm font-semibold text-danger">
                            Your trial or subscription has expired. Some workspace actions are read-only until you upgrade.
                        </p>
                    </div>
                )}

                {/* Current plan card */}
                <div className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <span className="text-[10px] font-black text-ink-soft uppercase tracking-widest block mb-1">Current Plan</span>
                            <h2 className="text-2xl font-bold text-ink capitalize">{currentPlan}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge status={subscription?.status === 'active' ? 'success' : subscription?.status === 'trialing' ? 'info' : 'danger'}>
                                    {subscription?.status || 'none'}
                                </Badge>
                                {subscription?.status === 'trialing' && (
                                    <span className="text-xs font-semibold text-ink-soft flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {trialRemainingDays} day{trialRemainingDays !== 1 ? 's' : ''} left in trial
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Billing cycle toggle */}
                        <div className="flex items-center gap-2 bg-surface-2 border border-line rounded-xl p-1">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${billingCycle === 'monthly' ? 'bg-brand text-white' : 'text-ink-soft'}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${billingCycle === 'yearly' ? 'bg-brand text-white' : 'text-ink-soft'}`}
                            >
                                Yearly (save {plansData.savings?.pro}%)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {['pro', 'enterprise'].map((plan) => {
                        const pricing = plansData.pricing?.[plan]?.[billingCycle];
                        const isCurrent = currentPlan === plan && subscription?.status === 'active';
                        return (
                            <div key={plan} className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-ink capitalize">{plan}</h3>
                                    {isCurrent && <Badge status="success">Active</Badge>}
                                </div>
                                <div>
                                    <span className="text-3xl font-extrabold text-ink">{pricing ? (pricing / 100).toFixed(0) : '-'} BDT</span>
                                    <span className="text-ink-soft text-sm">/month</span>
                                </div>
                                <ul className="text-sm text-ink-soft space-y-1.5 flex-1">
                                    {Object.entries(plansData.limits?.[plan] || {}).map(([key, value]) => (
                                        <li key={key} className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}: {value === -1 ? 'Unlimited' : value}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    variant={isCurrent ? 'outline' : 'primary'}
                                    disabled={isCurrent}
                                    onClick={() => openPayDialog(plan)}
                                >
                                    {isCurrent ? 'Current Plan' : 'Upgrade'}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Invoices */}
                <div className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl mb-8">
                    <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-brand" />
                        Invoices
                    </h3>
                    {invoices.length === 0 ? (
                        <p className="text-sm text-ink-soft">No invoices yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {invoices.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between border-b border-line pb-2">
                                    <div>
                                        <span className="text-sm font-semibold text-ink">{inv.invoiceNumber}</span>
                                        <span className="text-xs text-ink-soft ml-2 capitalize">{inv.plan} · {inv.billingCycle}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-ink">{(inv.amountCents / 100).toFixed(2)} BDT</span>
                                        <button onClick={() => handleDownloadInvoice(inv)} className="text-brand hover:text-brand-strong cursor-pointer">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Billing history */}
                <div className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-brand" />
                        Billing History
                    </h3>
                    {history.length === 0 ? (
                        <p className="text-sm text-ink-soft">No billing activity yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {history.map((h) => (
                                <div key={h.id} className="flex items-center justify-between border-b border-line pb-2 text-sm">
                                    <span className="text-ink-soft">{h.description}</span>
                                    <span className="text-xs text-ink-faint">{new Date(h.createdAt).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment dialog */}
            <Modal isOpen={payDialogOpen} onClose={() => setPayDialogOpen(false)} title={`Upgrade to ${selectedPlan ? selectedPlan.toUpperCase() : ''} (${billingCycle.toUpperCase()})`} size="md">
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                    {selectedPlan && (
                        <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex justify-between items-center shadow-sm">
                            <div>
                                <span className="text-[10px] text-brand font-extrabold uppercase tracking-wider block">Selected Plan</span>
                                <span className="text-sm font-bold text-ink capitalize">{selectedPlan} · {billingCycle}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-ink-soft block">Amount to Pay</span>
                                <span className="text-base font-extrabold text-brand">
                                    {plansData.pricing?.[selectedPlan]?.[billingCycle] 
                                        ? `${(plansData.pricing[selectedPlan][billingCycle] / 100).toFixed(0)} BDT` 
                                        : '—'
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {['bkash', 'nagad'].map((m) => (
                            <button
                                type="button"
                                key={m}
                                onClick={() => setMethod(m)}
                                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-bold capitalize transition cursor-pointer ${method === m ? 'border-brand bg-brand/10 text-brand' : 'border-line text-ink-soft'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    <div className="bg-surface-2 border border-line rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs text-ink-soft block">Send payment to (Personal / Send Money)</span>
                            <span className="text-lg font-bold text-ink">{merchantNumber}</span>
                        </div>
                        <button type="button" onClick={copyMerchantNumber} className="p-2 rounded-lg hover:bg-surface-2 border border-line cursor-pointer">
                            <Copy className="w-4 h-4 text-ink" />
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-ink-soft uppercase tracking-wide block">Transaction ID</label>
                        <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="e.g. 8N7A2K9X1P"
                            className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-brand text-ink"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-ink-soft uppercase tracking-wide block">Your {method === 'bkash' ? 'bKash' : 'Nagad'} Number</label>
                        <input
                            type="text"
                            value={senderNumber}
                            onChange={(e) => setSenderNumber(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-brand text-ink"
                        />
                    </div>

                    <p className="text-xs text-ink-faint">
                        Your subscription will be activated after Super Admin verifies this payment. This is not instant.
                    </p>

                    <Button type="submit" isLoading={submitting} className="w-full">
                        Submit Payment
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default BillingPage;
