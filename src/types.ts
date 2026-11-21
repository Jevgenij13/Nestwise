/** Domain types for Nestwise, per docs/PRD.md section 9. */

/** Local calendar date, `YYYY-MM-DD` (D9). */
export type DateString = string;
/** ISO 8601 timestamp, e.g. `2026-11-21T09:30:00.000Z`. */
export type IsoTimestamp = string;

export interface EntityBase {
  id: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Tombstone (D11); null while the entity is live. */
  deletedAt: IsoTimestamp | null;
}

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type Repeat = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type BillStatus = 'active' | 'paused';
export type BillCategory = 'subscriptions' | 'utilities' | 'rent-mortgage' | 'insurance' | 'other';
export type ListType = 'chore' | 'shopping';
export type Appearance = 'system' | 'light' | 'dark';
export type LeadDays = 0 | 1 | 3 | 7;

export interface Settings {
  /** ISO 4217 code (D8). */
  currency: string;
  schemaVersion: number;
  defaultLeadDays: LeadDays;
  appearance: Appearance;
  monthlyIncomeMinor?: number;
  currentMemberId: string | null;
  badgeEnabled: boolean;
  lastBackupAt: IsoTimestamp | null;
  onboardingDone: boolean;
}

export interface Household extends EntityBase {
  name: string;
}

export interface Member extends EntityBase {
  name: string;
  /** Hex colour, e.g. `#b04e27`. */
  colour: string;
}

export interface Bill extends EntityBase {
  name: string;
  /** Integer minor units (1250 = 12.50). */
  amountMinor: number;
  cadence: Cadence;
  /** First or any known due date; occurrences are derived from it. */
  anchorDate: DateString;
  leadDays: LeadDays;
  status: BillStatus;
  endDate?: DateString;
  note?: string;
  category?: BillCategory;
}

export interface List extends EntityBase {
  name: string;
  type: ListType;
  sortOrder: number;
}

export interface DoneBy {
  memberId: string;
  /** Name at the time of completion; survives member removal (AC-HOME-8). */
  name: string;
}

export interface Item extends EntityBase {
  listId: string;
  title: string;
  qty?: string;
  done: boolean;
  /** Local date the item was checked off. */
  doneAt?: DateString;
  doneBy?: DoneBy;
  assigneeId?: string;
  dueDate?: DateString;
  repeat?: Repeat;
}

export interface Goal extends EntityBase {
  name?: string;
  targetMinor: number;
  currentMinor: number;
  /** 1 to 4 monthly amounts in minor units. */
  scenariosMinor: number[];
  annualRatePct: number;
  targetDate?: DateString;
}

/** Everything the app persists and backs up. */
export interface AppData {
  settings: Settings;
  /** Null until the first use of the Home tab (AC-HOME-1). */
  household: Household | null;
  members: Member[];
  bills: Bill[];
  lists: List[];
  items: Item[];
  goals: Goal[];
}

export type EnvelopeScope = 'all' | 'list';

/** Backup / snapshot envelope (PRD section 9). */
export interface Envelope<D> {
  app: 'nestwise';
  schemaVersion: number;
  exportedAt: IsoTimestamp;
  scope: EnvelopeScope;
  data: D;
}

/** Collections that can be merged by id with `updatedAt` / tombstone rules. */
export type MergeableCollections = Pick<AppData, 'members' | 'bills' | 'lists' | 'items' | 'goals'>;

/** Payload of a single-list snapshot (AC-HOME-10). */
export interface ListSnapshotData {
  lists: [List];
  items: Item[];
  members: Member[];
}
