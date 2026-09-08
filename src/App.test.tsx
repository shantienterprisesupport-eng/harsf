import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('L GenZ Work app', () => {
  it('renders all core modules', () => {
    render(<App />);
    expect(screen.getByText('GharSeva')).toBeInTheDocument();
    expect(screen.getByText('Legal & Form Help')).toBeInTheDocument();
    expect(screen.getByText('All India Private Jobs')).toBeInTheDocument();
    expect(screen.getByText('Loan & CIBIL')).toBeInTheDocument();
    expect(screen.getAllByText('Real-or-Fake').length).toBeGreaterThan(0);
  });

  it('opens Real-or-Fake and runs the local pre-check', () => {
    render(<App />);
    fireEvent.click(screen.getAllByText('Real-or-Fake')[0]);
    const field = screen.getByPlaceholderText('Example: paste suspicious message or URL here…');
    fireEvent.change(field, { target: { value: 'Urgent: pay now to claim lottery winner prize' } });
    fireEvent.click(screen.getByText('CHECK NOW'));
    expect(screen.getByText('High caution')).toBeInTheDocument();
  });
});
