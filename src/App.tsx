import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { BriefingPage } from './pages/BriefingPage';
import { InterviewPage } from './pages/InterviewPage';
import { MeetPage } from './pages/MeetPage';
import { MicCheckPage } from './pages/MicCheckPage';
import { ReportPage } from './pages/ReportPage';
import { SetupPage } from './pages/SetupPage';
import { SessionProvider } from './state/session';

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<SetupPage />} />
          <Route path="/briefing" element={<BriefingPage />} />
          <Route path="/mic-check" element={<MicCheckPage />} />
          <Route path="/meet" element={<MeetPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
