import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardPage } from '@/pages/dashboard-page'
import { NewAnalysisPage } from '@/pages/new-analysis-page'
import { ResultPage } from '@/pages/result-page'
import { ReportPage } from '@/pages/report-page'
import { EvaluationPage } from '@/pages/evaluation-page'
import { HistoryPage } from '@/pages/history-page'
import { DatasetsPage } from '@/pages/datasets-page'
import { ModelsPage } from '@/pages/models-page'
import { ReportsPage } from '@/pages/reports-page'
import { SettingsPage } from '@/pages/settings-page'
import { CaseStudyPage } from '@/pages/case-study-page'
import { NotFoundPage } from '@/pages/not-found-page'

export const router = createBrowserRouter(
  [
    // Standalone printable report — rendered outside the app shell.
    { path: '/analysis/:id/report', element: <ReportPage /> },
    // Standalone full-width technical case study & project portfolio.
    { path: '/case-study', element: <CaseStudyPage /> },
    { path: '/portfolio', element: <CaseStudyPage /> },
    {
      element: <AppShell />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'analyze', element: <NewAnalysisPage /> },
        { path: 'history', element: <HistoryPage /> },
        { path: 'datasets', element: <DatasetsPage /> },
        { path: 'models', element: <ModelsPage /> },
        { path: 'evaluation', element: <EvaluationPage /> },
        { path: 'reports', element: <ReportsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'case-study-embedded', element: <CaseStudyPage /> },
        { path: 'analysis/:id', element: <ResultPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    future: { v7_relativeSplatPath: true },
  },
)
