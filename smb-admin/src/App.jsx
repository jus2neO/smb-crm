import { useState, useMemo, useEffect, useCallback } from 'react';
import './index.css';
import { supabase } from './lib/supabaseClient';

import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import ApplicantTable from './components/ApplicantTable';
import ClientModal from './components/ClientModal';
import ScheduleView from './components/ScheduleView';
import AnalyticsView from './components/AnalyticsView';
import PaymentsView from './components/PaymentsView';

function summarizeWork(workHistory) {
  if (!workHistory || workHistory.length === 0) return 'No work experience listed';
  const latest = workHistory[0];
  return latest.position ? `${latest.position}${latest.company ? ` at ${latest.company}` : ''}` : 'Work experience on file';
}

function mapAssessmentRow(row) {
  return {
    id: row.tracking_id,
    dbId: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    positionApplied: row.position_applied,
    email: row.email,
    alternateEmail: row.alternate_email,
    phone: row.phone,
    landline: row.landline,
    contactMethod: row.contact_method,
    contactValue: row.contact_value,
    birthDate: row.birth_date,
    gender: row.gender,
    province: row.province,
    city: row.city_municipality,
    completeAddress: row.complete_address,
    postalCode: row.postal_code,
    countryOfResidence: row.country_of_residence,
    civil: row.civil_status,
    citizenship: row.citizenship,
    nationality: row.nationality,
    dependentsCount: row.dependents_count,
    comment: row.comment,
    bringDocsInPerson: row.bring_docs_in_person,
    additionalDocs: row.additional_docs,
    work: summarizeWork(row.work_history),
    resumePath: row.resume_path,
    answers: row.answers,
    photoPath: row.photo_path,
    country: row.destination_country,
    flag: row.destination_flag,
    score: row.score,
    status: row.status,
    referral: row.referral,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    appointmentType: row.appointment_type,
    education: (row.education || []).map((e) => ({
      level: e.level, school: e.school, course: e.course, dateFrom: e.date_from, dateTo: e.date_to,
    })),
    workHistory: (row.work_history || []).map((w) => ({
      company: w.company, position: w.position, description: w.description, country: w.country, dateFrom: w.date_from, dateTo: w.date_to,
    })),
  };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(null);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    setClientsError('');
    const { data, error } = await supabase
      .from('assessments')
      .select('*, education(*), work_history(*)')
      .order('created_at', { ascending: false });

    if (error) {
      setClientsError('Could not load applicants. ' + error.message);
    } else {
      setClients(data.map(mapAssessmentRow));
    }
    setClientsLoading(false);
  }, []);

  // Restore session on refresh
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchClients();
  }, [isLoggedIn, fetchClients]);

  // Live updates: refetch whenever any assessment row changes (new
  // submission, status change, booking, etc.) so the dashboard reflects it
  // without the admin needing to refresh.
  useEffect(() => {
    if (!isLoggedIn) return;
    const channel = supabase
      .channel('assessments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => {
        fetchClients();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn, fetchClients]);

  // --- Auth ---
  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentView('dashboard');
    setSelectedClientId(null);
    setSearchQuery('');
    setClients([]);
  };

  // --- Navigation ---
  const handleNavigate = (viewId) => {
    setCurrentView(viewId);
    setSelectedClientId(null);
  };

  // --- Dashboard filter ---
  const availableCountries = useMemo(() => {
    return [...new Set(clients.map((c) => c.country).filter(Boolean))].sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return clients.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch = !q || fullName.includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      const matchesCountry = !countryFilter || c.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [clients, searchQuery, countryFilter]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const handleSaveStatus = async (clientId, newStatus) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
    );

    const { error } = await supabase
      .from('assessments')
      .update({ status: newStatus })
      .eq('id', client.dbId);

    if (error) {
      alert('Failed to save status: ' + error.message);
      fetchClients(); // revert to server state
    }
  };

  // --- Login gate ---
  if (!authChecked) return null;
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // --- View titles ---
  const VIEW_TITLES = {
    dashboard: 'Applicant Overview',
    schedule: 'Schedule',
    analytics: 'Analytics',
    payments: 'Payments',
  };

  const renderMainContent = () => {
    if (clientsLoading) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <i className="fas fa-spinner fa-spin text-2xl"></i>
        </div>
      );
    }
    if (clientsError) {
      return (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {clientsError}
          </div>
        </div>
      );
    }
    switch (currentView) {
      case 'schedule':
        return <ScheduleView clients={clients} />;
      case 'analytics':
        return <AnalyticsView clients={clients} />;
      case 'payments':
        return <PaymentsView />;
      default:
        return (
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <StatsCards clients={clients} />
            <ApplicantTable
              clients={filteredClients}
              onViewProfile={setSelectedClientId}
              countries={availableCountries}
              countryFilter={countryFilter}
              onCountryFilterChange={setCountryFilter}
            />
          </div>
        );
    }
  };

  return (
    <div className="text-gray-800 h-screen flex overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          title={VIEW_TITLES[currentView]}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          showSearch={currentView === 'dashboard'}
        />
        {renderMainContent()}
      </main>

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          onClose={() => setSelectedClientId(null)}
          onSave={handleSaveStatus}
        />
      )}
    </div>
  );
}
