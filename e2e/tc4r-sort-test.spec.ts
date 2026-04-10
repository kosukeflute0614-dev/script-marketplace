import { test, expect } from '@playwright/test';

test('TC-4r: 並び替え「新着」で件数が0件にならない', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://localhost:3000/search');
  await page.waitForTimeout(2000);

  // 初期件数確認
  const initialText = await page.textContent('body');
  console.log('=== 初期ページ内容(件数付近) ===');
  const matchInitial = initialText?.match(/\d+\s*件/g);
  console.log('件数テキスト(初期):', matchInitial);

  // 並び替えセレクタを探す
  const sortSelectors = await page.$$eval('select, [role="listbox"], [data-testid*="sort"], [class*="sort"], [class*="Sort"]', els =>
    els.map(el => ({ tag: el.tagName, id: el.id, className: el.className.substring(0, 80), text: el.textContent?.substring(0, 100) }))
  );
  console.log('=== ソート関連要素 ===', JSON.stringify(sortSelectors, null, 2));

  // select 要素を試す
  const selects = await page.$$('select');
  let sortChanged = false;
  for (const sel of selects) {
    const options = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    console.log('select options:', JSON.stringify(options));
    const newestOpt = options.find(o => o.text?.includes('新着') || o.text?.includes('newest') || o.text?.includes('新しい'));
    if (newestOpt) {
      await sel.selectOption(newestOpt.value ?? '');
      console.log('新着オプション選択:', newestOpt);
      sortChanged = true;
      break;
    }
  }

  if (!sortChanged) {
    // ボタン/カスタムUIを試す
    const sortBtns = await page.$$('[class*="sort"], [class*="Sort"], [data-testid*="sort"]');
    console.log('ソートボタン数:', sortBtns.length);
    for (const btn of sortBtns) {
      const txt = await btn.textContent();
      console.log('ソートボタンテキスト:', txt?.substring(0, 60));
    }

    // 「並び替え」や「新着」テキストを持つ要素をクリック
    const newestBtn = page.getByRole('option', { name: /新着/ }).or(page.getByText('新着', { exact: false })).first();
    const newestVisible = await newestBtn.isVisible().catch(() => false);
    if (!newestVisible) {
      // ドロップダウンを開く
      const sortTrigger = page.getByText(/並び替え|Sort|おすすめ/).first();
      if (await sortTrigger.isVisible().catch(() => false)) {
        await sortTrigger.click();
        await page.waitForTimeout(500);
      }
    }
    const newestEl = page.getByText('新着').first();
    if (await newestEl.isVisible().catch(() => false)) {
      await newestEl.click();
      sortChanged = true;
    }
  }

  await page.waitForTimeout(2000);

  const afterText = await page.textContent('body');
  const matchAfter = afterText?.match(/\d+\s*件/g);
  console.log('=== 件数テキスト(並び替え後) ===', matchAfter);
  console.log('=== コンソールエラー ===', consoleErrors);

  // スクリーンショット
  await page.screenshot({ path: '/tmp/tc4r-after-sort.png', fullPage: false });
  console.log('sortChanged:', sortChanged);
});
