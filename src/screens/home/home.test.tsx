import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeData } from '../../lib/test-fixtures.ts';
import { household, makeItem, onboarded } from '../../test/home-data.ts';
import { renderApp } from '../../test/render.tsx';

const byId = (store: ReturnType<typeof renderApp>['store'], id: string) => store.getState().data.items.find((i) => i.id === id);
const rowButton = (testId: string) => screen.getByTestId(testId).querySelector('.row__main') as HTMLElement;
const liveItems = (store: ReturnType<typeof renderApp>['store']) => store.getState().data.items.filter((i) => i.deletedAt === null);

describe('household setup (AC-HOME-1, 2)', () => {
  it('asks for a household name and a member, pre-filled "Me", and creates Chores and Shopping lists', async () => {
    const { user, store } = renderApp({ route: '/home', data: onboarded(makeData()) });
    expect(screen.getByTestId('household-setup')).toBeTruthy();
    expect((screen.getByTestId('member-name-input-0') as HTMLInputElement).value).toBe('Me');

    const start = screen.getByTestId('household-start-button') as HTMLButtonElement;
    await user.clear(screen.getByTestId('household-name-input'));
    expect(start.disabled).toBe(true);
    await user.type(screen.getByTestId('household-name-input'), 'The Smiths');
    expect(start.disabled).toBe(false);

    await user.click(screen.getByTestId('add-person-button'));
    await user.type(screen.getByTestId('member-name-input-1'), 'Anna');
    await user.click(start);

    const { data } = store.getState();
    expect(data.household?.name).toBe('The Smiths');
    expect(data.members.map((m) => m.name)).toEqual(['Me', 'Anna']);
    expect(new Set(data.members.map((m) => m.colour)).size).toBe(2);
    expect(data.lists.map((l) => [l.name, l.type])).toEqual([['Chores', 'chore'], ['Shopping', 'shopping']]);
    expect(data.settings.currentMemberId).toBe(data.members[0]?.id);
    expect(screen.getByTestId('home-lists')).toBeTruthy();
  });

  it('allows up to 8 people', async () => {
    const { user } = renderApp({ route: '/home', data: onboarded(makeData()) });
    for (let i = 0; i < 7; i++) await user.click(screen.getByTestId('add-person-button'));
    expect(screen.queryByTestId('add-person-button')).toBeNull();
    expect(screen.getByTestId('member-name-input-7')).toBeTruthy();
  });

  it('flags a duplicate name and creates nothing', async () => {
    const { user, store } = renderApp({ route: '/home', data: onboarded(makeData()) });
    await user.click(screen.getByTestId('add-person-button'));
    await user.type(screen.getByTestId('member-name-input-1'), 'me');
    await user.click(screen.getByTestId('household-start-button'));
    expect(screen.getByTestId('member-name-input-1-error').textContent).toContain('Someone already has that name');
    expect(store.getState().data.household).toBeNull();
  });
});

describe('Home overview and lists (AC-HOME-2)', () => {
  it('shows both lists with counts, due-soon and overdue surfacing consistent with Today', () => {
    renderApp({
      route: '/home',
      data: household([makeItem('a', 'l1', { dueDate: '2026-11-19' }), makeItem('b', 'l1', { dueDate: '2026-11-22' }), makeItem('c', 'l1'), makeItem('s1', 'l2'), makeItem('s2', 'l2')]),
    });
    expect(screen.getByTestId('list-count-l1').textContent).toBe('3 open');
    expect(screen.getByTestId('list-overdue-l1').textContent).toContain('1 overdue');
    expect(screen.getByTestId('list-due-soon-l1').textContent).toContain('1 due soon');
    expect(screen.getByTestId('list-count-l2').textContent).toBe('2 items');
  });

  it('creates, renames and deletes lists, with Undo on delete', async () => {
    const { user, store } = renderApp({ route: '/home', data: household([makeItem('s1', 'l2', { title: 'Milk' })]) });
    await user.click(screen.getByTestId('list-add-button'));
    await user.type(screen.getByTestId('list-name-input'), 'Garden');
    await user.click(screen.getByTestId('list-type-chore'));
    await user.click(screen.getByTestId('list-save-button'));
    const garden = store.getState().data.lists.find((l) => l.name === 'Garden');
    expect(garden).toMatchObject({ type: 'chore', sortOrder: 2 });

    // Rename through the list menu.
    await user.click(rowButton(`list-row-${garden!.id}`));
    await user.click(screen.getByTestId('list-menu-button'));
    await user.click(screen.getByTestId('list-menu-rename'));
    const input = screen.getByTestId('list-name-input');
    await user.clear(input);
    await user.type(input, 'Yard');
    await user.click(screen.getByTestId('list-save-button'));
    expect(screen.getByTestId('screen-title').textContent).toBe('Yard');

    // Delete the shopping list: its items go with it, Undo brings both back.
    await user.click(screen.getByTestId('back-button'));
    await user.click(rowButton('list-row-l2'));
    await user.click(screen.getByTestId('list-menu-button'));
    await user.click(screen.getByTestId('list-menu-delete'));
    expect(store.getState().data.lists.find((l) => l.id === 'l2')?.deletedAt).not.toBeNull();
    expect(screen.queryByTestId('list-row-l2')).toBeNull();
    await user.click(screen.getByTestId('toast-action'));
    expect(store.getState().data.lists.find((l) => l.id === 'l2')?.deletedAt).toBeNull();
    expect(byId(store, 's1')?.deletedAt).toBeNull();
    expect(screen.getByTestId('list-row-l2')).toBeTruthy();
  });

  it('enforces the 20 list limit', () => {
    const data = household();
    data.lists = Array.from({ length: 20 }, (_, i) => ({ ...data.lists[0]!, id: `x${i}`, name: `L${i}`, sortOrder: i }));
    renderApp({ route: '/home', data });
    const add = screen.getByTestId('list-add-button') as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(add.textContent).toContain('List limit reached (20)');
  });
});

describe('quick add (AC-HOME-3)', () => {
  it('adds on Return, clears, keeps focus, and ignores empty or whitespace-only text', async () => {
    const { user, store } = renderApp({ route: '/home/list/l2', data: household() });
    const input = screen.getByTestId('quick-add-input') as HTMLInputElement;
    await user.click(input);
    await user.keyboard('Milk{Enter}Bread{Enter}{Enter}   {Enter}Eggs{Enter}Pasta{Enter}Rice{Enter}');
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(liveItems(store).map((i) => i.title)).toEqual(['Milk', 'Bread', 'Eggs', 'Pasta', 'Rice']);
    // New rows appear on top.
    const rows = within(screen.getByTestId('list-open')).getAllByRole('listitem');
    expect(rows[0]?.textContent).toContain('Rice');
    expect(liveItems(store).every((i) => i.listId === 'l2' && !i.done)).toBe(true);
  });

  it('shows the empty states', () => {
    renderApp({ route: '/home/list/l1', data: household() });
    expect(screen.getByTestId('list-empty').textContent).toContain('Nothing to do');
    expect((screen.getByTestId('quick-add-input') as HTMLInputElement).placeholder).toBe('Add a chore...');
  });
});

describe('check and uncheck (AC-HOME-4, 5, 12)', () => {
  it('moves done items to a collapsed Done group stamped with member and date, and unchecking restores', async () => {
    const { user, store } = renderApp({ route: '/home/list/l2', data: household([makeItem('a', 'l2', { title: 'Milk' }), makeItem('b', 'l2', { title: 'Bread' })]) });
    await user.click(screen.getByTestId('item-check-a'));
    expect(byId(store, 'a')).toMatchObject({ done: true, doneAt: '2026-11-21', doneBy: { memberId: 'm1', name: 'Me' } });
    expect(within(screen.getByTestId('list-open')).queryByText('Milk')).toBeNull();
    expect(screen.getByTestId('list-done').textContent).toContain('Done (1)');
    expect(screen.queryByTestId('item-a')).toBeNull();

    await user.click(screen.getByTestId('list-done-toggle'));
    expect(screen.getByTestId('item-a').textContent).toContain('Me · ');
    await user.click(screen.getByTestId('item-check-a'));
    expect(byId(store, 'a')?.done).toBe(false);
    expect(byId(store, 'a')).not.toHaveProperty('doneBy');
    expect(within(screen.getByTestId('list-open')).getByText('Milk')).toBeTruthy();
  });

  it('Undo on the done toast reopens the item', async () => {
    const { user, store } = renderApp({ route: '/home/list/l2', data: household([makeItem('a', 'l2')]) });
    await user.click(screen.getByTestId('item-check-a'));
    await user.click(screen.getByTestId('toast-action'));
    expect(byId(store, 'a')?.done).toBe(false);
  });

  it('Clear done deletes every done item with a 5 second Undo', async () => {
    const done = { done: true, doneAt: '2026-11-20', doneBy: { memberId: 'm1', name: 'Me' } };
    const { user, store } = renderApp({ route: '/home/list/l2', data: household([makeItem('a', 'l2', done), makeItem('b', 'l2', done), makeItem('c', 'l2')]) });
    await user.click(screen.getByTestId('clear-done-button'));
    expect(screen.getByTestId('toast-message').textContent).toBe('2 items cleared');
    expect(liveItems(store).map((i) => i.id)).toEqual(['c']);
    await user.click(screen.getByTestId('toast-action'));
    expect(liveItems(store).map((i) => i.id).sort()).toEqual(['a', 'b', 'c']);
    expect(byId(store, 'a')?.done).toBe(true);
  });

  it('deleting an item has an Undo', async () => {
    const { user, store } = renderApp({ route: '/home/list/l2', data: household([makeItem('a', 'l2', { title: 'Milk' })]) });
    await user.click(rowButton('item-a'));
    await user.click(screen.getByTestId('item-delete-button'));
    expect(liveItems(store)).toHaveLength(0);
    expect(screen.getByTestId('toast-message').textContent).toBe('Milk deleted');
    await user.click(screen.getByTestId('toast-action'));
    expect(liveItems(store)).toHaveLength(1);
  });

  it('persists across a restart', async () => {
    const { user, backend } = renderApp({ route: '/home/list/l2', data: household() });
    await user.type(screen.getByTestId('quick-add-input'), 'Milk{Enter}');
    const stored = JSON.parse([...backend.map.values()].find((v) => v.includes('Milk')) ?? '{}');
    expect(stored.data.items[0].title).toBe('Milk');
  });
});

describe('chores: assignee, due date, Mine (AC-HOME-6, 7, 9)', () => {
  it('adds a chore, assigns it to Anna with a due date, and Mine follows the current member', async () => {
    const { user, store } = renderApp({ route: '/home/list/l1', data: household() });
    await user.type(screen.getByTestId('quick-add-input'), 'Take out bins{Enter}');
    const id = liveItems(store)[0]!.id;
    expect(byId(store, id)).not.toHaveProperty('assigneeId');
    expect(screen.getByTestId(`item-assignee-${id}`).dataset.assignee).toBe('anyone');

    await user.click(rowButton(`item-${id}`));
    await user.click(screen.getByTestId('item-assign-m2'));
    await user.click(screen.getByTestId('item-due-tomorrow'));
    await user.click(screen.getByTestId('item-save-button'));
    expect(byId(store, id)).toMatchObject({ assigneeId: 'm2', dueDate: '2026-11-22' });
    expect(screen.getByTestId(`item-assignee-${id}`).dataset.assignee).toBe('m2');
    expect(screen.getByTestId(`item-${id}`).textContent).toContain('Tomorrow');

    // I am Me: the chore is Anna's, so Mine hides it.
    await user.click(screen.getByTestId('filter-mine'));
    expect(screen.queryByTestId(`item-${id}`)).toBeNull();
    expect(screen.getByTestId('list-mine-empty').textContent).toContain('Nothing for you');
    await user.click(screen.getByTestId('list-show-all'));
    expect(screen.getByTestId(`item-${id}`)).toBeTruthy();
    expect((screen.getByTestId('filter-all') as HTMLElement).getAttribute('aria-checked')).toBe('true');
  });

  it('switching the current member changes Mine immediately and Today follows', async () => {
    const data = household([makeItem('a', 'l1', { title: 'Vacuum', assigneeId: 'm2', dueDate: '2026-11-21' }), makeItem('b', 'l1', { title: 'Bins' })]);
    const { user, store } = renderApp({ route: '/today', data });
    expect(screen.queryByTestId('today-chore-a')).toBeNull();

    await user.click(screen.getByTestId('member-chip'));
    expect(screen.getByTestId('members-sheet-title').textContent).toBe('Who is using?');
    expect(screen.getByTestId('member-option-m1').getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByTestId('member-option-m2'));
    expect(store.getState().data.settings.currentMemberId).toBe('m2');
    expect(screen.queryByTestId('members-sheet')).toBeNull();
    expect(screen.getByTestId('member-chip-name').textContent).toBe('Anna');
    expect(screen.getByTestId('today-chore-a')).toBeTruthy();

    await user.click(screen.getByTestId('tab-home'));
    await user.click(rowButton('list-row-l1'));
    await user.click(screen.getByTestId('filter-mine'));
    expect(screen.getByTestId('item-a')).toBeTruthy();
    expect(screen.getByTestId('item-b')).toBeTruthy(); // Anyone counts as mine
  });

  it('shows "2 days overdue" in red on the list and on Today (AC-HOME-9)', () => {
    const data = household([makeItem('a', 'l1', { title: 'Bins', dueDate: '2026-11-19' })]);
    const view = renderApp({ route: '/home/list/l1', data });
    expect(screen.getByTestId('item-a').textContent).toContain('2 days overdue');
    expect(screen.getByTestId('item-a').querySelector('.pill--overdue')).toBeTruthy();
    view.unmount();
    renderApp({ route: '/today', data });
    expect(screen.getByTestId('today-chore-a').textContent).toContain('2 days overdue');
  });

  it('the Today chore row opens the item sheet and the checkbox completes it', async () => {
    const { user, store } = renderApp({ route: '/today', data: household([makeItem('a', 'l1', { title: 'Bins', dueDate: '2026-11-21' })]) });
    await user.click(rowButton('today-chore-a'));
    expect((screen.getByTestId('item-title-input') as HTMLInputElement).value).toBe('Bins');
    await user.click(screen.getByTestId('item-sheet-close'));
    await user.click(screen.getByTestId('today-chore-check-a'));
    expect(byId(store, 'a')?.done).toBe(true);
    expect(screen.queryByTestId('today-chore-a')).toBeNull();
  });

  it('edits title, picks a date and removes the due date again', async () => {
    const { user, store } = renderApp({ route: '/home/list/l1', data: household([makeItem('a', 'l1', { title: 'Bins' })]) });
    await user.click(rowButton('item-a'));
    const title = screen.getByTestId('item-title-input');
    await user.clear(title);
    await user.type(title, 'Recycling');
    await user.click(screen.getByTestId('item-due-pick'));
    fireEvent.change(screen.getByTestId('item-due-input'), { target: { value: '2026-12-05' } });
    await user.click(screen.getByTestId('item-save-button'));
    expect(byId(store, 'a')).toMatchObject({ title: 'Recycling', dueDate: '2026-12-05' });

    await user.click(rowButton('item-a'));
    await user.click(screen.getByTestId('item-due-none'));
    await user.click(screen.getByTestId('item-save-button'));
    expect(byId(store, 'a')).not.toHaveProperty('dueDate');
  });

  it('does not save an empty title and asks before discarding edits', async () => {
    const { user, store } = renderApp({ route: '/home/list/l1', data: household([makeItem('a', 'l1', { title: 'Bins' })]) });
    await user.click(rowButton('item-a'));
    await user.clear(screen.getByTestId('item-title-input'));
    expect((screen.getByTestId('item-save-button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('item-save-hint').textContent).toBe('Add a title to save');
    await user.click(screen.getByTestId('item-sheet-close'));
    expect(screen.getByTestId('discard-dialog')).toBeTruthy();
    await user.click(screen.getByTestId('discard-dialog-confirm'));
    expect(byId(store, 'a')?.title).toBe('Bins');
  });

  it('shopping items get a quantity and no assignee or due date', async () => {
    const { user, store } = renderApp({ route: '/home/list/l2', data: household([makeItem('a', 'l2', { title: 'Milk' })]) });
    await user.click(rowButton('item-a'));
    expect(screen.queryByTestId('item-assign')).toBeNull();
    expect(screen.queryByTestId('item-due')).toBeNull();
    await user.type(screen.getByTestId('item-qty-input'), '2 x');
    await user.click(screen.getByTestId('item-save-button'));
    expect(byId(store, 'a')?.qty).toBe('2 x');
    expect(screen.getByTestId('item-qty-a').textContent).toBe('2 x');
  });
});

describe('recurring chores (AC-HOME-13)', () => {
  it('completing a weekly chore creates the next one a week later, even if late, and Undo reverses both', async () => {
    const { user, store } = renderApp({ route: '/home/list/l1', data: household([makeItem('a', 'l1', { title: 'Bins', dueDate: '2026-11-14', repeat: 'weekly' })]) });
    await user.click(screen.getByTestId('item-check-a'));
    const items = store.getState().data.items;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ done: true, doneBy: { name: 'Me' } });
    expect(items[1]).toMatchObject({ done: false, dueDate: '2026-11-21', repeat: 'weekly', title: 'Bins' });
    expect(screen.getByTestId('toast-message').textContent).toContain('Done. Next one:');

    await user.click(screen.getByTestId('toast-action'));
    const after = store.getState().data.items;
    expect(after[0]?.done).toBe(false);
    expect(after[1]?.deletedAt).not.toBeNull();
  });

  it('can be set from the item sheet', async () => {
    const { user, store } = renderApp({ route: '/home/list/l1', data: household([makeItem('a', 'l1', { dueDate: '2026-11-21' })]) });
    await user.click(rowButton('item-a'));
    await user.click(screen.getByTestId('item-repeat-weekly'));
    await user.click(screen.getByTestId('item-save-button'));
    expect(byId(store, 'a')?.repeat).toBe('weekly');
    expect(screen.getByTestId('item-a').textContent).toContain('Weekly');
  });
});

describe('members (AC-HOME-1, 8)', () => {
  it('adds, renames and removes members; removal unassigns open tasks and keeps done history', async () => {
    const data = household([
      makeItem('open', 'l1', { assigneeId: 'm2' }),
      makeItem('done', 'l1', { assigneeId: 'm2', done: true, doneBy: { memberId: 'm2', name: 'Anna' }, doneAt: '2026-11-20' }),
    ]);
    const { user, store } = renderApp({ route: '/home', data });
    await user.click(screen.getByTestId('member-chip'));
    await user.click(screen.getByTestId('manage-members-button'));
    expect(screen.getByTestId('member-count').textContent).toBe('2 of 8');

    await user.type(screen.getByTestId('member-add-input'), 'Cleo');
    await user.click(screen.getByTestId('member-add-button'));
    expect(store.getState().data.members.map((m) => m.name)).toEqual(['Me', 'Anna', 'Cleo']);
    expect(store.getState().data.members[2]?.colour).not.toBe(store.getState().data.members[0]?.colour);

    await user.click(screen.getByTestId('member-edit-m2'));
    const input = screen.getByTestId('member-rename-input-m2');
    await user.clear(input);
    await user.type(input, 'Me');
    await user.click(screen.getByTestId('member-rename-save-m2'));
    expect(screen.getByTestId('member-rename-input-m2-error').textContent).toContain('Someone already has that name');
    await user.clear(input);
    await user.type(input, 'Annie');
    await user.click(screen.getByTestId('member-rename-save-m2'));
    expect(store.getState().data.members.find((m) => m.id === 'm2')?.name).toBe('Annie');
    expect(byId(store, 'done')?.doneBy?.name).toBe('Anna'); // name at the time

    await user.click(screen.getByTestId('member-remove-m2'));
    expect(screen.getByTestId('remove-member-dialog').textContent).toContain('Remove Annie?');
    await user.click(screen.getByTestId('remove-member-dialog-cancel'));
    expect(store.getState().data.members.find((m) => m.id === 'm2')?.deletedAt).toBeNull();
    await user.click(screen.getByTestId('member-remove-m2'));
    await user.click(screen.getByTestId('remove-member-dialog-confirm'));
    const next = store.getState().data;
    expect(next.members.find((m) => m.id === 'm2')?.deletedAt).not.toBeNull();
    expect(byId(store, 'open')).not.toHaveProperty('assigneeId');
    expect(byId(store, 'done')?.doneBy).toEqual({ memberId: 'm2', name: 'Anna' });
    expect(next.items).toHaveLength(2);
  });

  it('removing the current member makes the first remaining member current, and the last one cannot be removed', async () => {
    const { user, store } = renderApp({ route: '/home', data: household() });
    await user.click(screen.getByTestId('member-chip'));
    await user.click(screen.getByTestId('manage-members-button'));
    await user.click(screen.getByTestId('member-remove-m1'));
    await user.click(screen.getByTestId('remove-member-dialog-confirm'));
    expect(store.getState().data.settings.currentMemberId).toBe('m2');
    expect(screen.queryByTestId('member-remove-m2')).toBeNull();
    expect(screen.getByTestId('members-min-hint').textContent).toBe('You need at least one person');
  });

  it('stops at 8 people', async () => {
    const data = household();
    data.members = Array.from({ length: 8 }, (_, i) => ({ ...data.members[0]!, id: `p${i}`, name: `P${i}` }));
    data.settings.currentMemberId = 'p0';
    const { user } = renderApp({ route: '/home', data });
    await user.click(screen.getByTestId('member-chip'));
    await user.click(screen.getByTestId('manage-members-button'));
    expect((screen.getByTestId('member-add-button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('member-add-input-hint').textContent).toBe('Up to 8 people');
  });

  it('is reachable from Settings > Household members and returns to Settings', async () => {
    const { user } = renderApp({ route: '/bills', data: household() });
    await user.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-members-row-value').textContent).toBe('2');
    await user.click(screen.getByTestId('settings-members-row'));
    expect(screen.getByTestId('members-manage')).toBeTruthy();
    await user.click(screen.getByTestId('members-sheet-close'));
    expect(screen.getByTestId('settings-root')).toBeTruthy();
  });

  it('Settings > Household members without a household points to Home setup', async () => {
    const { user } = renderApp({ route: '/bills', data: onboarded(makeData()) });
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-members-row'));
    await user.click(screen.getByTestId('members-setup-button'));
    expect(screen.getByTestId('household-setup')).toBeTruthy();
  });

  it('hides the Today member chip until a household exists', () => {
    renderApp({ route: '/today', data: onboarded(makeData()) });
    expect(screen.queryByTestId('member-chip')).toBeNull();
  });
});

describe('share and import a list between phones (AC-HOME-10, 11)', () => {
  const sender = () =>
    household([
      makeItem('milk', 'l2', { title: 'Milk', qty: '2 x' }),
      makeItem('bread', 'l2', { title: 'Bread' }),
      makeItem('eggs', 'l2', { title: 'Eggs', done: true, doneAt: '2026-11-20', doneBy: { memberId: 'm2', name: 'Anna' } }),
    ]);

  async function shareCode(): Promise<string> {
    const view = renderApp({ route: '/home/list/l2', data: sender() });
    await view.user.click(screen.getByTestId('list-menu-button'));
    await view.user.click(screen.getByTestId('list-menu-share'));
    const code = (screen.getByTestId('share-code-output') as HTMLTextAreaElement).value;
    view.unmount();
    return code;
  }

  // The recipient has their own household (different ids) and no Shopping list yet.
  const recipient = () => {
    const data = household();
    data.household = { ...data.household!, id: 'h-b' };
    data.members = [{ ...data.members[0]!, id: 'mb', name: 'Ben' }];
    data.settings.currentMemberId = 'mb';
    data.lists = [];
    return data;
  };

  it('exports a copyable NW1 code and a file, then the other phone previews and merges it; importing again is a no-op', async () => {
    const code = await shareCode();
    expect(code.startsWith('NW1.')).toBe(true);

    const { user, store } = renderApp({ route: '/today', data: recipient() });
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-import-list-row'));
    fireEvent.change(screen.getByTestId('import-list-paste-input'), { target: { value: code } });
    await waitFor(() => expect(screen.getByTestId('import-list-counts')).toBeTruthy());
    expect(screen.getByTestId('import-list-name').textContent).toBe('Shopping');
    expect(screen.getByTestId('import-list-counts').textContent).toBe('3 new, 0 updated, 0 deleted');
    expect(store.getState().data.lists).toHaveLength(0); // preview changes nothing

    await user.click(screen.getByTestId('import-list-confirm'));
    expect(screen.getByTestId('screen-list')).toBeTruthy();
    expect(screen.getByTestId('toast-message').textContent).toBe('Merged: 3 new, 0 updated, 0 deleted');
    const merged = store.getState().data;
    expect(merged.lists.map((l) => l.id)).toEqual(['l2']);
    expect(merged.items.map((i) => i.title).sort()).toEqual(['Bread', 'Eggs', 'Milk']);
    expect(merged.items.find((i) => i.id === 'eggs')?.doneBy).toEqual({ memberId: 'm2', name: 'Anna' });

    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-import-list-row'));
    fireEvent.change(screen.getByTestId('import-list-paste-input'), { target: { value: code } });
    await waitFor(() => expect(screen.getByTestId('import-list-uptodate')).toBeTruthy());
    expect(screen.getByTestId('import-list-uptodate').textContent).toBe('Nothing new. Already up to date.');
    expect((screen.getByTestId('import-list-confirm') as HTMLButtonElement).disabled).toBe(true);
    expect(store.getState().data).toBe(merged);
  });

  it('imports a .json file chosen from the file picker', async () => {
    const view = renderApp({ route: '/home/list/l2', data: sender() });
    const stored = JSON.parse([...view.backend.map.values()][0] ?? '{}');
    expect(stored.data.items).toHaveLength(3);
    view.unmount();

    const { user, store } = renderApp({ route: '/today', data: recipient() });
    const snapshot = {
      app: 'nestwise', schemaVersion: 1, exportedAt: '2026-11-21T09:00:00.000Z', scope: 'list',
      data: { lists: [sender().lists[1]], items: sender().items, members: [] },
    };
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-import-list-row'));
    await user.upload(screen.getByTestId('import-list-file-input'), new File([JSON.stringify(snapshot)], 'nestwise-list-shopping.json', { type: 'application/json' }));
    await waitFor(() => expect(screen.getByTestId('import-list-counts')).toBeTruthy());
    expect(screen.getByTestId('import-list-filename').textContent).toBe('nestwise-list-shopping.json');
    await user.click(screen.getByTestId('import-list-confirm'));
    expect(store.getState().data.items).toHaveLength(3);
  });

  it('shows a clear error for corrupt, foreign and newer-version input and changes nothing', async () => {
    const { user, store } = renderApp({ route: '/today', data: recipient() });
    const before = store.getState().data;
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-import-list-row'));
    const paste = screen.getByTestId('import-list-paste-input');
    const error = async (value: string) => {
      fireEvent.change(paste, { target: { value } });
      await waitFor(() => expect(screen.getByTestId('import-list-error')).toBeTruthy());
      return screen.getByTestId('import-list-error').textContent ?? '';
    };
    expect(await error('{"app":"nestwise"')).toContain('This file is damaged. Nothing was changed.');
    expect(await error('{"app":"other"}')).toContain("That doesn't look like a Nestwise file. Nothing was changed.");
    const newer = { app: 'nestwise', schemaVersion: 99, exportedAt: '2026-11-21T09:00:00.000Z', scope: 'list', data: {} };
    expect(await error(JSON.stringify(newer))).toContain('newer version of Nestwise');
    expect(screen.queryByTestId('import-list-confirm')).toBeNull();
    expect(store.getState().data).toBe(before);
  });

  it('asks to set up Home first when there is no household', async () => {
    const { user } = renderApp({ route: '/today', data: onboarded(makeData()) });
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-import-list-row'));
    expect(screen.getByTestId('import-list-no-household')).toBeTruthy();
    await user.click(screen.getByTestId('import-list-setup-button'));
    expect(screen.getByTestId('household-setup')).toBeTruthy();
  });

  it('Copy code puts the code on the clipboard and shows a toast', async () => {
    const { user } = renderApp({ route: '/home/list/l2', data: sender() });
    await user.click(screen.getByTestId('list-menu-button'));
    await user.click(screen.getByTestId('list-menu-share'));
    await user.click(screen.getByTestId('share-copy-code-button'));
    expect(await navigator.clipboard.readText()).toBe((screen.getByTestId('share-code-output') as HTMLTextAreaElement).value);
    expect(screen.getByTestId('toast-message').textContent).toBe('Code copied');
  });

  it('Send as file downloads a dated .json when the share sheet is unavailable', async () => {
    const clicked: string[] = [];
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => {};
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    };
    try {
      const { user } = renderApp({ route: '/home/list/l2', data: sender() });
      await user.click(screen.getByTestId('list-menu-button'));
      await user.click(screen.getByTestId('list-menu-share'));
      await user.click(screen.getByTestId('share-file-button'));
      await waitFor(() => expect(clicked).toEqual(['nestwise-list-shopping-2026-11-21.json']));
      expect(screen.getByTestId('toast-message').textContent).toBe('File saved');
    } finally {
      HTMLAnchorElement.prototype.click = original;
    }
  });
});

describe('link, QR and landing page (AC-HOME-14)', () => {
  const manyItems = (n: number) => Array.from({ length: n }, (_, i) => makeItem(`${crypto.randomUUID()}`, 'l2', { title: `Item number ${i} with a longer name`, createdAt: new Date(Date.parse('2026-11-21T09:00:00Z') + i * 7919).toISOString() }));

  it('offers a link and a QR code that carry the compact code', async () => {
    const { user } = renderApp({ route: '/home/list/l2', data: household(manyItems(10)) });
    await user.click(screen.getByTestId('list-menu-button'));
    await user.click(screen.getByTestId('list-menu-share'));
    await waitFor(() => expect(screen.getByTestId('share-qr-button')).toBeTruthy());
    await user.click(screen.getByTestId('share-qr-button'));
    await waitFor(() => expect(screen.getByTestId('share-qr-svg')).toBeTruthy());
    expect(screen.getByTestId('share-qr-svg').getAttribute('aria-label')).toBe('QR code for Shopping');

    await user.click(screen.getByTestId('share-link-button'));
    const link = await navigator.clipboard.readText();
    expect(link).toMatch(/#\/shared\/NW2\./);
    expect(screen.getByTestId('toast-message').textContent).toBe('Link copied');
  });

  it('says when a list is too big for a QR code and points to the file', async () => {
    const { user } = renderApp({ route: '/home/list/l2', data: household(manyItems(300)) });
    await user.click(screen.getByTestId('list-menu-button'));
    await user.click(screen.getByTestId('list-menu-share'));
    await waitFor(() => expect(screen.getByTestId('share-qr-button')).toBeTruthy());
    await user.click(screen.getByTestId('share-qr-button'));
    await waitFor(() => expect(screen.getByTestId('share-qr-toobig')).toBeTruthy());
    expect(screen.getByTestId('share-qr-toobig').textContent).toBe('This list is too big for a QR code. Send it as a file instead.');
    expect(screen.queryByTestId('share-qr-svg')).toBeNull();
    expect(screen.getByTestId('share-file-button')).toBeTruthy();
  });

  it('a link opens a landing page, even on a fresh install, with Copy code and the steps; nothing is imported', async () => {
    const view = renderApp({ route: '/home/list/l2', data: household([makeItem('a', 'l2'), makeItem('b', 'l2')]) });
    await view.user.click(screen.getByTestId('list-menu-button'));
    await view.user.click(screen.getByTestId('list-menu-share'));
    await waitFor(() => expect(screen.getByTestId('share-link-button')).toBeTruthy());
    await view.user.click(screen.getByTestId('share-link-button'));
    const code = (await navigator.clipboard.readText()).split('#/shared/')[1]!;
    view.unmount();

    const { user, store } = renderApp({ route: `/shared/${code}` });
    expect(screen.getByTestId('shared-landing')).toBeTruthy();
    expect(screen.queryByTestId('onboarding')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('shared-landing-summary').textContent).toBe('Shopping, 2 items'));
    expect(screen.getByTestId('shared-landing-steps').textContent).toContain('Import a shared list');
    await user.click(screen.getByTestId('shared-landing-copy'));
    expect(await navigator.clipboard.readText()).toBe(code);
    expect(store.getState().data.items).toHaveLength(0);
  });

  it('a damaged link says so', async () => {
    renderApp({ route: '/shared/NW2.AAAAAAAA' });
    await waitFor(() => expect(screen.getByTestId('shared-landing-error')).toBeTruthy());
  });

  it('the pasted compact code or whole link imports like any other code', async () => {
    const view = renderApp({ route: '/home/list/l2', data: household([makeItem('a', 'l2', { title: 'Milk' })]) });
    await view.user.click(screen.getByTestId('list-menu-button'));
    await view.user.click(screen.getByTestId('list-menu-share'));
    await waitFor(() => expect(screen.getByTestId('share-link-button')).toBeTruthy());
    await view.user.click(screen.getByTestId('share-link-button'));
    const link = await navigator.clipboard.readText();
    view.unmount();

    const data = household();
    data.lists = [];
    const { user, store } = renderApp({ route: '/today', data });
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-import-list-row'));
    fireEvent.change(screen.getByTestId('import-list-paste-input'), { target: { value: link } });
    await waitFor(() => expect(screen.getByTestId('import-list-counts').textContent).toBe('1 new, 0 updated, 0 deleted'));
    await user.click(screen.getByTestId('import-list-confirm'));
    expect(store.getState().data.items.map((i) => i.title)).toEqual(['Milk']);
  });
});

it('re-tapping the Home tab pops back to the lists overview', async () => {
  const { user } = renderApp({ route: '/home/list/l1', data: household() });
  expect(screen.getByTestId('screen-list')).toBeTruthy();
  await act(async () => {
    await user.click(screen.getByTestId('tab-home'));
  });
  expect(screen.getByTestId('home-lists')).toBeTruthy();
});
