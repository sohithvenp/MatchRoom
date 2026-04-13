import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import LifestyleQuestionnaire from './pages/LifestyleQuestionnaire';
import MatchResults from './pages/MatchResults';
import Messages from './pages/Messages';
import AddProperty from './pages/AddProperty';

import PropertyListPage from './pages/PropertyListPage';
import PropertyDetailsPage from './pages/PropertyDetails';
import ShortlistPage from './pages/ShortlistPage';
import PropertyComparisonPage from './pages/PropertyComparison';
import MigrationPage from './pages/Migration';
import Profile from './pages/Profile';
import Baseline from './pages/Baseline';
import Matches from './pages/Matches';
import ResearcherDashboard from './pages/ResearcherDashboard';
import { ExperimentProvider } from './utils/ExperimentContext';

function App() {
  return (
    <ExperimentProvider>
      <Router>
        <div className="min-h-screen bg-background relative selection:bg-primary/30">
          <Navbar />
          <main className="z-10 pb-20">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/questionnaire" element={<LifestyleQuestionnaire />} />
              <Route path="/results" element={<MatchResults />} />
              <Route path="/dashboard" element={<PropertyListPage />} />
              <Route path="/baseline" element={<Baseline />} />
              <Route path="/optimized" element={<Matches />} />
              <Route path="/analytics" element={<ResearcherDashboard />} />
              <Route path="/property/:id" element={<PropertyDetailsPage />} />
              <Route path="/shortlist" element={<ShortlistPage />} />
              <Route path="/compare" element={<PropertyComparisonPage />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/add-property" element={<AddProperty />} />
              <Route path="/migrate" element={<MigrationPage />} />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ExperimentProvider>
  );
}

export default App;
