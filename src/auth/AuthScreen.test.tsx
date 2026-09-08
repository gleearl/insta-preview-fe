import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthScreen } from './AuthScreen'
import { AuthProvider } from './AuthProvider'

/* This screen is now the only door into the app. These tests exist to make a
   password field reappearing a failure rather than a surprise. */
describe('AuthScreen', () => {
  it('offers no password, no email and no form', () => {
    const { container } = render(<AuthProvider><AuthScreen /></AuthProvider>)

    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('input[type="password"]')).toBeNull()
    expect(container.querySelector('input[type="email"]')).toBeNull()
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/create an account/i)).not.toBeInTheDocument()
  })

  it('names the app and says what signing in shares', () => {
    render(<AuthProvider><AuthScreen /></AuthProvider>)

    expect(screen.getByText('Insta Preview')).toBeInTheDocument()
    expect(screen.getByText(/name, email and picture/i)).toBeInTheDocument()
  })
})
