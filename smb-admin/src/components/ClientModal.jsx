import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const ADDITIONAL_DOC_LABELS = {
  passport_copy: 'Passport Copy',
  tor_copy: 'TOR Copy',
  diploma_copy: 'Diploma Copy',
  moi: 'Medium of Instruction (MOI)',
};

const STATUS_OPTIONS = [
  { value: 'New Applicant', label: 'New Applicant (Pending Review)' },
  { value: 'Consultation Scheduled', label: 'Consultation Scheduled' },
  { value: 'Documents Pending', label: 'Documents Pending' },
  { value: 'Visa Lodged', label: 'Visa Lodged' },
  { value: 'Approved', label: 'Visa Approved!' },
  { value: 'Rejected/Archived', label: 'Archived' },
];

export default function ClientModal({ client, onClose, onSave }) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [openingFile, setOpeningFile] = useState('');
  const [previewFile, setPreviewFile] = useState(null); // { url, kind: 'pdf' | 'image', label }
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    if (client) setSelectedStatus(client.status);
  }, [client]);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    const fetchPayments = async () => {
      setPaymentsLoading(true);
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('assessment_id', client.dbId)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setPayments(data || []);
        setPaymentsLoading(false);
      }
    };
    fetchPayments();

    const channel = supabase
      .channel(`payments-${client.dbId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `assessment_id=eq.${client.dbId}` }, fetchPayments)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [client]);

  if (!client) return null;

  const initials = client.firstName.charAt(0) + client.lastName.charAt(0);
  const hasAppointment = Boolean(client.appointmentDate);

  const handleSave = () => {
    onSave(client.id, selectedStatus);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleViewFile = async (path, label) => {
    setOpeningFile(label);
    const { data, error } = await supabase.storage.from('applicant-files').createSignedUrl(path, 300);
    setOpeningFile('');
    if (error || !data?.signedUrl) {
      alert(`Could not open the ${label}: ` + (error?.message || 'file not found'));
      return;
    }

    const ext = path.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      setPreviewFile({ url: data.signedUrl, kind: 'pdf', label });
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      setPreviewFile({ url: data.signedUrl, kind: 'image', label });
    } else {
      // Word docs etc. can't be previewed inline by the browser — open/download directly.
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="p-6 text-white flex justify-between items-center flex-shrink-0" style={{ backgroundColor: 'var(--smb-blue)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold">{client.firstName} {client.lastName}</h2>
              <p className="text-blue-200 text-sm font-medium tracking-wide">{client.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-red-500 rounded-full transition flex items-center justify-center"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          <div className="grid md:grid-cols-2 gap-6">

            {/* Left: Info */}
            <div className="space-y-6">
              {/* Contact */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-envelope text-gray-400 w-4"></i>
                    <span className="font-medium text-gray-800">{client.email}</span>
                    {client.alternateEmail && <span className="text-gray-400">/ {client.alternateEmail}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <i className="fas fa-phone text-gray-400 w-4"></i>
                    <span className="font-medium text-gray-800">{client.phone}</span>
                    {client.landline && <span className="text-gray-400">/ {client.landline}</span>}
                  </div>
                  {client.contactMethod && client.contactValue && (
                    <div className="flex items-center gap-3">
                      <i className="fas fa-comment-dots text-gray-400 w-4"></i>
                      <span className="font-medium text-gray-800">{client.contactMethod}: {client.contactValue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <i className="fas fa-map-marker-alt text-gray-400 w-4"></i>
                    <span className="font-medium text-gray-800">
                      {client.completeAddress ? `${client.completeAddress}, ` : ''}{client.city}{client.province ? `, ${client.province}` : ''}{client.postalCode ? ` ${client.postalCode}` : ''}{client.countryOfResidence ? `, ${client.countryOfResidence}` : ''}
                    </span>
                  </div>
                  {client.birthDate && (
                    <div className="flex items-center gap-3">
                      <i className="fas fa-birthday-cake text-gray-400 w-4"></i>
                      <span className="font-medium text-gray-800">{client.birthDate} · {client.gender}</span>
                    </div>
                  )}
                  {client.positionApplied && (
                    <div className="flex items-center gap-3">
                      <i className="fas fa-briefcase text-gray-400 w-4"></i>
                      <span className="font-medium text-gray-800">Applying for: {client.positionApplied}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              {(client.resumePath || client.photoPath) && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Documents</h3>
                  <div className="flex flex-wrap gap-3">
                    {client.resumePath && (
                      <button
                        onClick={() => handleViewFile(client.resumePath, 'resume')}
                        disabled={openingFile === 'resume'}
                        className="flex items-center gap-2 text-sm font-bold border border-gray-200 px-4 py-2 rounded-xl hover:border-[#0b1136] transition disabled:opacity-50"
                        style={{ color: 'var(--smb-blue)' }}
                      >
                        <i className={`fas ${openingFile === 'resume' ? 'fa-spinner fa-spin' : 'fa-file-alt'}`}></i>
                        View Resume
                      </button>
                    )}
                    {client.photoPath && (
                      <button
                        onClick={() => handleViewFile(client.photoPath, 'photo')}
                        disabled={openingFile === 'photo'}
                        className="flex items-center gap-2 text-sm font-bold border border-gray-200 px-4 py-2 rounded-xl hover:border-[#0b1136] transition disabled:opacity-50"
                        style={{ color: 'var(--smb-blue)' }}
                      >
                        <i className={`fas ${openingFile === 'photo' ? 'fa-spinner fa-spin' : 'fa-image'}`}></i>
                        View Photo
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Requirements */}
              {(client.bringDocsInPerson || (client.additionalDocs && client.additionalDocs.length > 0)) && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Additional Requirements</h3>
                  {client.bringDocsInPerson ? (
                    <p className="text-sm text-orange-600 font-medium flex items-center gap-2">
                      <i className="fas fa-handshake"></i> Client will bring physical copies to their appointment.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {(client.additionalDocs || []).map((d) => (
                        <button
                          key={d.path}
                          onClick={() => handleViewFile(d.path, ADDITIONAL_DOC_LABELS[d.type] || d.type)}
                          disabled={openingFile === (ADDITIONAL_DOC_LABELS[d.type] || d.type)}
                          className="flex items-center gap-2 text-sm font-bold border border-gray-200 px-4 py-2 rounded-xl hover:border-[#0b1136] transition disabled:opacity-50"
                          style={{ color: 'var(--smb-blue)' }}
                        >
                          <i className={`fas ${openingFile === (ADDITIONAL_DOC_LABELS[d.type] || d.type) ? 'fa-spinner fa-spin' : 'fa-file-alt'}`}></i>
                          {ADDITIONAL_DOC_LABELS[d.type] || d.type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Assessment */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Assessment Results</h3>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Target Country</p>
                    <p className="font-bold text-lg" style={{ color: 'var(--smb-blue)' }}>
                      {client.country} {client.flag}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium">Eligibility Score</p>
                    <p className="font-black text-2xl" style={{ color: 'var(--smb-gold)' }}>{client.score}/100</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-600">Background Data:</p>
                  <p className="text-sm"><span className="text-gray-500">Work Exp:</span> <span className="font-medium">{client.work}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Civil Status:</span> <span className="font-medium">{client.civil}</span></p>
                  {client.citizenship && <p className="text-sm"><span className="text-gray-500">Citizenship:</span> <span className="font-medium">{client.citizenship}</span></p>}
                  {client.nationality && <p className="text-sm"><span className="text-gray-500">Nationality:</span> <span className="font-medium">{client.nationality}</span></p>}
                  {client.dependentsCount != null && <p className="text-sm"><span className="text-gray-500">Dependents:</span> <span className="font-medium">{client.dependentsCount}</span></p>}
                  {client.referral && <p className="text-sm"><span className="text-gray-500">Found us via:</span> <span className="font-medium">{client.referral}</span></p>}
                  {client.comment && <p className="text-sm pt-2 border-t border-gray-100 mt-2"><span className="text-gray-500 block mb-1">Additional Info:</span> <span className="font-medium">{client.comment}</span></p>}
                </div>
              </div>

              {/* Assessment Answers */}
              {client.answers && client.answers.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-list-check"></i> Assessment Answers
                  </h3>
                  <div className="space-y-3">
                    {client.answers.map((a) => (
                      <div key={a.id} className="text-sm border-l-2 border-gray-100 pl-3">
                        <p className="text-gray-500">{a.question}</p>
                        <p className="font-bold text-gray-800">{a.answer} <span className="font-normal text-gray-400">({a.points} pts)</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {client.education && client.education.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-graduation-cap"></i> Education
                  </h3>
                  <div className="space-y-3">
                    {client.education.map((edu, i) => (
                      <div key={i} className="text-sm border-l-2 border-gray-100 pl-3">
                        <p className="font-bold text-gray-800">{edu.school}</p>
                        <p className="text-gray-500">{edu.level}{edu.course ? ` — ${edu.course}` : ''}</p>
                        <p className="text-xs text-gray-400">{edu.dateFrom} to {edu.dateTo || 'Present'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work History */}
              {client.workHistory && client.workHistory.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-suitcase"></i> Work History
                  </h3>
                  <div className="space-y-3">
                    {client.workHistory.map((w, i) => (
                      <div key={i} className="text-sm border-l-2 border-gray-100 pl-3">
                        <p className="font-bold text-gray-800">{w.position} <span className="font-normal text-gray-500">— {w.company}</span></p>
                        {w.description && <p className="text-gray-500">{w.description}</p>}
                        <p className="text-xs text-gray-400">{w.country} · {w.dateFrom} to {w.dateTo || 'Present'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Admin Actions */}
            <div className="space-y-6">
              {/* Status Manager */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-[#0b1136]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Manage Status</h3>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Application Stage:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 font-semibold text-sm outline-none focus:border-[#0b1136] mb-3"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleSave}
                  className={`w-full text-white py-2.5 rounded-xl font-bold text-sm transition ${
                    saveSuccess ? 'bg-green-500' : 'hover:bg-blue-900'
                  }`}
                  style={!saveSuccess ? { backgroundColor: 'var(--smb-blue)' } : {}}
                >
                  {saveSuccess ? '✓ Saved Successfully!' : 'Update Status'}
                </button>
              </div>

              {/* Appointments */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-[#b45309]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Appointments</h3>
                {hasAppointment ? (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 font-bold flex items-center gap-2">
                      <i className={`fas ${client.appointmentType === 'Online' ? 'fa-video' : 'fa-handshake'}`}></i>
                      {client.appointmentType === 'Online' ? 'Online Appointment' : client.appointmentType}: {client.appointmentDate} at {client.appointmentTime}
                    </p>
                    <p className="text-xs text-blue-500 mt-1 ml-6">Booked by client</p>
                  </div>
                ) : (
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
                      <i className="fas fa-exclamation-circle"></i> No consultation scheduled yet.
                    </p>
                    <p className="text-xs text-orange-500 mt-1 ml-6">Client will book through the portal</p>
                  </div>
                )}
              </div>

              {/* Payments */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payments</h3>

                {paymentsLoading ? (
                  <p className="text-sm text-gray-400"><i className="fas fa-spinner fa-spin mr-2"></i>Loading...</p>
                ) : payments.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        <div>
                          <p className="text-sm font-bold text-gray-800">₱{Number(p.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          <p className="text-xs text-gray-500">{p.description}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full capitalize ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-700'
                          : p.status === 'processing' ? 'bg-amber-100 text-amber-700'
                          : p.status === 'failed' || p.status === 'cancelled' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-200 text-gray-600'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No consultation payment yet — this is created automatically when the client tries to book.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewFile && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex justify-between items-center border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-800 capitalize">{previewFile.label} Preview</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#0b1136] transition"
                  style={{ color: 'var(--smb-blue)' }}
                >
                  <i className="fas fa-external-link-alt mr-1"></i> Open in New Tab
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center">
              {previewFile.kind === 'pdf' ? (
                <iframe src={previewFile.url} title={`${previewFile.label} preview`} className="w-full h-full" />
              ) : (
                <img src={previewFile.url} alt={`${previewFile.label} preview`} className="max-w-full max-h-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
