import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Practice from '@/pages/Practice';
import Species from '@/pages/Species';
import Exam from '@/pages/Exam';
import Results from '@/pages/Results';
import Statistics from '@/pages/Statistics';
import Settings from '@/pages/Settings';
import Achievements from '@/pages/Achievements';
import { api } from '@/lib/api';

export default function App() {
  // Haetaan taustalla tuoreempi sisältö palvelimelta; offline-tilassa tämä ei tee mitään.
  useEffect(() => {
    void api.refreshBundle();
  }, []);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/species" element={<Species />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/results" element={<Results />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
