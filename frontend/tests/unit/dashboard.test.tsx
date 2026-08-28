import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '@/pages/dashboard-page'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  it('lists every advertised capability', async () => {
    renderDashboard()
    expect(screen.getByText('Optical scene analysis')).toBeInTheDocument()
    expect(screen.getByText('Text-guided grounding')).toBeInTheDocument()
    expect(screen.getByText('SAR backscatter analysis')).toBeInTheDocument()
    expect(screen.getByText('Optical + SAR fusion')).toBeInTheDocument()
    expect(screen.getByText('Bi-temporal change detection')).toBeInTheDocument()
    // Let the async system-status / recent-analyses loads settle before unmount.
    await screen.findByText('Demo analyses')
  })

  it('shows honest offline system status from the demo catalog', async () => {
    renderDashboard()
    expect(await screen.findByText('Demo analyses')).toBeInTheDocument()
    // Six recorded fixtures -> the "Demo analyses" tile reads 6.
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('links recent analyses to their result pages', async () => {
    renderDashboard()
    const link = await screen.findByRole('link', { name: /Bi-temporal change analysis/i })
    expect(link).toHaveAttribute('href', '/analysis/SAT-2026-000106')
  })
})
