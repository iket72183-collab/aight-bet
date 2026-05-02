import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import LandingPage from './components/LandingPage';
import MarketDetailsPage from './pages/MarketDetailsPage';
import LegalPage from './pages/LegalPage';
import ActiveMarketsPage from './pages/ActiveMarketsPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Layout>
      <PageTransition>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/markets" element={<ActiveMarketsPage />} />
          <Route path="/market/:id" element={<MarketDetailsPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PageTransition>
    </Layout>
  );
}

export default App;
