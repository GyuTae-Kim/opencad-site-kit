// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createLanguageMenu } from '../i18n/language-menu';
import { languages } from '../i18n/core.mjs';

describe('language menu', () => {
  it('opens outside the toolbar, moves with arrow keys, closes with Escape and chooses a language', async () => {
    const choose = vi.fn(async () => {});
    const menu = createLanguageMenu(languages, 'ko', choose);
    document.body.append(menu.element);
    const trigger = menu.element.querySelector<HTMLButtonElement>('.language-trigger')!;
    const list = document.querySelector<HTMLElement>('.language-list')!;
    expect(list.parentElement).toBe(document.body);
    expect(list.hidden).toBe(true);
    expect(list.querySelector('[aria-checked="true"]')!.textContent).toBe('한국어');
    trigger.click();
    expect(list.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const items = [...list.querySelectorAll<HTMLButtonElement>('[role=menuitemradio]')];
    expect(items.map((item) => item.lang)).toEqual(['ko', 'en', 'ja', 'zh-CN', 'de']);
    expect(document.activeElement).toBe(items[0]);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[4]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    items[2]!.click();
    expect(choose).toHaveBeenCalledWith('ja');
    await Promise.resolve();
    menu.setLanguage('ja');
    expect(list.querySelector('[aria-checked="true"]')!.textContent).toBe('日本語');
    menu.dispose();
    expect(document.querySelector('.language-list')).toBeNull();
  });
});
