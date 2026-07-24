import { expect, test } from '@playwright/test'

const routes = [
  { path: '/overview', heading: 'Dragon Lens Mechanics' },
  { path: '/workspace', heading: '检查本地修改' },
  { path: '/stages', heading: '管理 T1、T2 和正式主线' },
  { path: '/release', heading: '准备 Ironforge 交付' },
  { path: '/history', heading: '从设计修改到供应商交付' },
]

for (const route of routes) {
  test(`${route.path} renders without horizontal overflow`, async ({ page }, testInfo) => {
    const repositoryResponse = page.waitForResponse(
      (response) => response.url().endsWith('/api/repository'),
    )
    await page.goto(route.path)
    await expect((await repositoryResponse).status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      containers: [
        '.main-content',
        '.page',
        '.branch-list-section',
        '.branch-list',
        '.history-section',
        '.history-table',
      ]
        .map((selector) => document.querySelector<HTMLElement>(selector))
        .filter((element): element is HTMLElement => Boolean(element))
        .map((element) => ({
          className: element.className,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
        })),
      offenders: [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 8)
        .map((element) => ({
          className: element.className,
          right: Math.round(element.getBoundingClientRect().right),
          width: Math.round(element.getBoundingClientRect().width),
        })),
    }))
    expect(overflow, JSON.stringify(overflow)).toMatchObject({
      documentWidth: overflow.viewportWidth,
    })

    if (route.path === '/overview') {
      await page.screenshot({
        path: testInfo.outputPath('overview.png'),
        fullPage: true,
      })
    }
  })
}

test('overview displays the live local repository snapshot', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  const repositoryResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/repository'),
  )

  await page.goto('/overview')
  const payload = await (await repositoryResponse).json()

  expect(payload).toMatchObject({
    source: 'live',
    repository: {
      branch: 'dev/T2',
      deliveryPackages: expect.any(Array),
    },
  })
  expect(payload.repository.deliveryPackages).toHaveLength(13)
  await expect(page.getByText('本地仓库实时数据')).toBeVisible()
  await expect(page.getByText('13 个交付包')).toBeVisible()
})

test('desktop sidebar hides the mobile close control', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.goto('/overview')

  await expect(page.getByRole('button', { name: '关闭导航' })).toBeHidden()
})

test('mobile navigation opens and changes page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await page.goto('/overview')

  await page.getByRole('button', { name: '打开导航' }).click()
  await expect(page.getByLabel('项目导航')).toBeInViewport()
  await page.getByRole('link', { name: '发布审核' }).click()

  await expect(page).toHaveURL(/\/release$/)
  await expect(page.getByRole('heading', { level: 1, name: '准备 Ironforge 交付' })).toBeVisible()
})
