/* global Buffer */
import { expect, test } from '@playwright/test'

const user = { id: 1, email: 'portfolio@example.com', display_name: 'Portfolio User' }
const conversation = {
  id: 'conversation-1',
  title: 'New conversation',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

async function mockWorkspace(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { user } })
    if (path === '/api/conversations' && request.method() === 'GET') return route.fulfill({ json: [] })
    if (path === '/api/conversations' && request.method() === 'POST') return route.fulfill({ status: 201, json: conversation })
    if (path === '/api/documents') return route.fulfill({ json: [] })
    if (path === `/api/conversations/${conversation.id}/documents`) return route.fulfill({ json: [] })
    if (path === `/api/conversations/${conversation.id}/images`) {
      return route.fulfill({ status: 201, json: { id: 'image-1', filename: 'chart.png', mime_type: 'image/png', byte_size: 68, width: 1, height: 1, created_at: new Date().toISOString() } })
    }
    if (path === `/api/conversations/${conversation.id}/messages/stream`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson',
        body: [
          JSON.stringify({ type: 'start' }),
          JSON.stringify({ type: 'meta', model: 'e2e-vision' }),
          JSON.stringify({ type: 'delta', text: 'The chart trends upward.' }),
          JSON.stringify({ type: 'done', message_id: 'assistant-1' }),
        ].join('\n') + '\n',
      })
    }
    return route.fulfill({ status: 404, json: { detail: `Unhandled ${request.method()} ${path}` } })
  })
}

test('loads the private Sourcebeam workspace', async ({ page }) => {
  await mockWorkspace(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Sourcebeam', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Understand PDFs and images.' })).toBeVisible()
  await expect(page).toHaveTitle(/Sourcebeam/)
})

test('attaches an image and renders a streamed multimodal answer', async ({ page }) => {
  await mockWorkspace(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Attach image').click()
  await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
    name: 'chart.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  })
  await expect(page.getByText('chart.png')).toBeVisible()
  await page.getByLabel('Chat prompt').fill('What does this chart show?')
  await page.getByLabel('Send message').click()
  await expect(page.getByText('The chart trends upward.')).toBeVisible()
  await expect(page.getByRole('main').getByText('e2e-vision')).toBeVisible()
})
