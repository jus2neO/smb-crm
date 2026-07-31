import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

function getStatusBadge(status) {
  const map = {
    pending: 'bg-gray-100 text-gray-700 border border-gray-200',
    processing: 'bg-amber-100 text-amber-800 border border-amber-200',
    paid: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    failed: 'bg-red-100 text-red-700 border border-red-200',
    cancelled: 'bg-red-100 text-red-700 border border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function GlobalPricingSetting() {
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('payment_settings').select('consultation_fee, description').eq('id', true).single()
      .then(({ data }) => {
        setFee(data?.consultation_fee ?? '');
        setDescription(data?.description ?? '');
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!fee || Number(fee) <= 0) { alert('Enter a valid amount.'); return; }
    if (!description.trim()) { alert('Enter a description.'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('payment_settings')
      .update({ consultation_fee: Number(fee), description: description.trim() })
      .eq('id', true);
    setSaving(false);
    if (error) {
      alert('Could not save: ' + error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Global Consultation Fee</p>
      <p className="text-sm text-gray-500 mb-4">
        Applied to every client — automatically requested the moment they click "Book Formal Consultation" on their dashboard.
      </p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={fee}
            disabled={loading}
            onChange={(e) => setFee(e.target.value)}
            className="w-40 pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold outline-none focus:border-[#0b1136]"
          />
        </div>
        <input
          type="text"
          placeholder="Description (e.g. Consultation Fee)"
          value={description}
          disabled={loading}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm outline-none focus:border-[#0b1136]"
        />
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm text-white transition ${saved ? 'bg-green-500' : 'hover:bg-blue-900'}`}
          style={!saved ? { backgroundColor: 'var(--smb-blue)' } : {}}
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function PaymentsView() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('payments')
      .select('*, assessments(tracking_id, first_name, last_name, email)')
      .order('created_at', { ascending: false });

    if (error) setError('Could not load payments. ' + error.message);
    else setPayments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel('payments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchPayments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPayments]);

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-black" style={{ color: 'var(--smb-blue)' }}>Payments</h2>
        <p className="text-gray-500 text-sm mt-1">All client transactions via PayMongo</p>
      </div>

      <GlobalPricingSetting />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Collected</p>
          <h3 className="text-3xl font-black text-emerald-600">{peso(totalPaid)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending / Processing</p>
          <h3 className="text-3xl font-black text-amber-500">{peso(totalPending)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Transactions</p>
          <h3 className="text-3xl font-black" style={{ color: 'var(--smb-blue)' }}>{payments.length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold" style={{ color: 'var(--smb-blue)' }}>Transaction History</h3>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400"><i className="fas fa-spinner fa-spin text-2xl"></i></div>
        ) : error ? (
          <div className="p-6"><div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div></div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <i className="fas fa-file-invoice-dollar text-5xl mb-4 opacity-20 block"></i>
            <p className="font-medium">No payments yet.</p>
            <p className="text-sm mt-1">Set an amount on a client's profile to request a payment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="p-4 font-bold">Tracker ID</th>
                  <th className="p-4 font-bold">Client</th>
                  <th className="p-4 font-bold">Description</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/50 transition">
                    <td className="p-4">
                      <span className="font-bold bg-gray-100 px-2 py-1 rounded-md text-xs" style={{ color: 'var(--smb-blue)' }}>
                        {p.assessments?.tracking_id}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{p.assessments?.first_name} {p.assessments?.last_name}</div>
                      <div className="text-xs text-gray-500">{p.assessments?.email}</div>
                    </td>
                    <td className="p-4 text-gray-700">{p.description}</td>
                    <td className="p-4 font-bold text-gray-800">{peso(p.amount)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full capitalize ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-xs">
                      {p.paid_at ? `Paid ${new Date(p.paid_at).toLocaleDateString()}` : new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
