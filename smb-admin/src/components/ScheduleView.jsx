import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function getStatusBadge(status) {
  const map = {
    'Consultation Scheduled': 'bg-blue-100 text-blue-800 border border-blue-200',
    'Visa Lodged': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'Approved': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'New Applicant': 'bg-orange-100 text-orange-800 border border-orange-200',
    'Documents Pending': 'bg-gray-100 text-gray-700 border border-gray-200',
    'Rejected/Archived': 'bg-red-100 text-red-700 border border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

function DailyLimitSetting() {
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('appointment_settings').select('daily_limit').eq('id', true).single()
      .then(({ data }) => {
        setLimit(data?.daily_limit ?? 5);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('appointment_settings').update({ daily_limit: Number(limit) }).eq('id', true);
    setSaving(false);
    if (error) {
      alert('Could not save: ' + error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center justify-between flex-wrap gap-4">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Daily Appointment Limit</p>
        <p className="text-sm text-gray-500">Max consultations clients can book per day. Full days are greyed out on the client portal.</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="1"
          value={limit}
          disabled={loading}
          onChange={(e) => setLimit(e.target.value)}
          className="w-20 p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold text-center outline-none focus:border-[#0b1136]"
        />
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition ${saved ? 'bg-green-500' : 'hover:bg-blue-900'}`}
          style={!saved ? { backgroundColor: 'var(--smb-blue)' } : {}}
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function ScheduleView({ clients }) {
  const scheduled = clients.filter(c => c.appointmentDate);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-black" style={{ color: 'var(--smb-blue)' }}>Appointment Schedule</h2>
        <p className="text-gray-500 text-sm mt-1">All upcoming client consultations</p>
      </div>

      <DailyLimitSetting />

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Scheduled</p>
            <h3 className="text-3xl font-black text-blue-600">{scheduled.length}</h3>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
            <i className="fas fa-calendar-check"></i>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Online</p>
            <h3 className="text-3xl font-black text-purple-500">
              {scheduled.filter(c => c.appointmentType === 'Online').length}
            </h3>
          </div>
          <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center text-2xl">
            <i className="fas fa-video"></i>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">In-Person</p>
            <h3 className="text-3xl font-black text-emerald-500">
              {scheduled.filter(c => c.appointmentType === 'In-Person').length}
            </h3>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-2xl">
            <i className="fas fa-handshake"></i>
          </div>
        </div>
      </div>

      {/* Appointment List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-lg font-bold" style={{ color: 'var(--smb-blue)' }}>Upcoming Appointments</h3>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{scheduled.length} total</span>
        </div>

        {scheduled.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <i className="fas fa-calendar-times text-5xl mb-4 opacity-20 block"></i>
            <p className="font-medium text-gray-500">No appointments scheduled yet.</p>
            <p className="text-sm mt-1">Appointments are booked by clients through the portal.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {scheduled.map((client) => {
              const isOnline = client.appointmentType === 'Online';
              return (
                <div key={client.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition group">
                  {/* Left: Date block */}
                  <div className="flex items-center gap-6">
                    <div
                      className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: 'var(--smb-blue)' }}
                    >
                      <span className="text-xs font-bold uppercase opacity-70">
                        {new Date(client.appointmentDate).toLocaleString('en', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-black leading-none">
                        {new Date(client.appointmentDate).getDate()}
                      </span>
                    </div>

                    {/* Client info */}
                    <div>
                      <p className="font-bold text-gray-800 text-base">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{client.email}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${getStatusBadge(client.status)}`}>
                          {client.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {client.flag} {client.country}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Time + Type */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mb-2 ${
                        isOnline
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <i className={`fas ${isOnline ? 'fa-video' : 'fa-handshake'}`}></i>
                      {isOnline ? 'Online Appointment' : client.appointmentType}
                    </div>
                    <p className="text-sm font-semibold text-gray-700">{client.appointmentTime}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(client.appointmentDate).toLocaleDateString('en', {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <p className="text-center text-xs text-gray-400 mt-6">
        <i className="fas fa-info-circle mr-1"></i>
        Appointments are scheduled by clients through the SMB portal. Contact them directly to reschedule.
      </p>
    </div>
  );
}
