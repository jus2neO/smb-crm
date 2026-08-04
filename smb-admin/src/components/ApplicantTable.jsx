function getBadgeClass(status) {
  if (status === 'New Applicant') return 'bg-orange-100 text-orange-800 border border-orange-200';
  if (status === 'Consultation Scheduled') return 'bg-blue-100 text-blue-800 border border-blue-200';
  if (status === 'Visa Lodged' || status === 'Approved') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (status === 'Rejected/Archived') return 'bg-gray-100 text-gray-500 border border-gray-200';
  return 'bg-gray-100 text-gray-800 border border-gray-200';
}

function getScoreColor(score) {
  return score < 60 ? 'text-orange-500 font-bold' : 'text-green-600 font-bold';
}

export default function ApplicantTable({ clients, onViewProfile, countries = [], countryFilter = '', onCountryFilterChange }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Table Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-lg font-bold" style={{ color: 'var(--smb-blue)' }}>
          Recent Assessments
        </h2>
        <div className="flex items-center gap-2">
          <i className="fas fa-filter text-sm" style={{ color: 'var(--smb-blue)' }}></i>
          <select
            value={countryFilter}
            onChange={(e) => onCountryFilterChange?.(e.target.value)}
            className="text-sm font-bold border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-[#0b1136]"
            style={{ color: 'var(--smb-blue)' }}
          >
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-4 font-bold">Tracker ID</th>
              <th className="p-4 font-bold">Applicant Name</th>
              <th className="p-4 font-bold">Destination</th>
              <th className="p-4 font-bold">Score</th>
              <th className="p-4 font-bold">Application Status</th>
              <th className="p-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {clients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-blue-50/50 transition cursor-pointer group"
              >
                <td className="p-4">
                  <span className="font-bold bg-gray-100 px-2 py-1 rounded-md text-xs" style={{ color: 'var(--smb-blue)' }}>
                    {client.id}
                  </span>
                </td>
                <td className="p-4">
                  <div className="font-bold text-gray-800">{client.firstName} {client.lastName}</div>
                  <div className="text-xs text-gray-500">{client.email}</div>
                </td>
                <td className="p-4 font-medium text-gray-700">
                  {client.flag} {client.country}
                </td>
                <td className={`p-4 ${getScoreColor(client.score)}`}>
                  {client.score} pts
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ${getBadgeClass(client.status)}`}>
                    {client.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onViewProfile(client.id)}
                    className="font-bold bg-white border border-gray-200 shadow-sm px-4 py-1.5 rounded-lg group-hover:border-[#0b1136] transition text-sm hover:text-[#b45309]"
                    style={{ color: 'var(--smb-blue)' }}
                  >
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {clients.length === 0 && (
        <div className="p-10 text-center text-gray-400">
          <i className="fas fa-search text-4xl mb-3 opacity-20 block"></i>
          <p className="font-medium">No applicants found matching your search.</p>
        </div>
      )}
    </div>
  );
}
