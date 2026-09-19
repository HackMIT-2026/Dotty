import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { SessionProvider, useSession } from './lib/session';
import Login from './pages/Login';
import PatientLayout from './pages/PatientLayout';
import Patients from './pages/Patients';
import Alerts from './pages/patient/Alerts';
import CarePlan from './pages/patient/CarePlan';
import Notes from './pages/patient/Notes';
import Overview from './pages/patient/Overview';
import TreatmentPlan from './pages/patient/TreatmentPlan';

function Routed() {
  const { session } = useSession();
  if (!session) return <Login />;
  return (
    <Routes>
      <Route path="/patients" element={<Patients />} />
      <Route path="/patients/:id" element={<PatientLayout />}>
        <Route index element={<Overview />} />
        <Route path="care-plan" element={<CarePlan />} />
        <Route path="treatment-plan" element={<TreatmentPlan />} />
        <Route path="notes" element={<Notes />} />
        <Route path="alerts" element={<Alerts />} />
      </Route>
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Router>
        <Routed />
      </Router>
    </SessionProvider>
  );
}
