import { test, expect } from '@playwright/test'

/**
 * Testes E2E de Login
 * Verifica o fluxo de autenticação da aplicação
 */
test.describe('Login', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')

    // Verifica que a página de login carrega
    await expect(page).toHaveTitle(/SmartZap/)
  })

  test('should have password input', async ({ page }) => {
    await page.goto('/login')

    // Verifica que existe campo de senha
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })
})
