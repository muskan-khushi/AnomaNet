// ─── Enums ────────────────────────────────────────────────────────────────────

export type Channel = 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'SWIFT' | 'CASH' | 'BRANCH';
export type TxStatus = 'PENDING' | 'SETTLED' | 'FAILED' | 'REVERSED';
export type AccountType = 'SAVINGS' | 'CURRENT' | 'OD' | 'LOAN' | 'NRE' | 'NRO';
export type KycRiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'PEP';
export type AccountStatus = 'ACTIVE' | 'DORMANT' | 'FROZEN' | 'CLOSED';
export type AlertType =
  | 'LAYERING'
  | 'CIRCULAR'
  | 'STRUCTURING'
  | 'DORMANT'
  | 'PROFILE_MISMATCH'
  | 'COMPOSITE';
export type AlertStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'ESCALATED'
  | 'REPORTED_FIU'
  | 'CLOSED_FP'
  | 'CLOSED_SAR';
export type UserRole = 'INVESTIGATOR' | 'ADMIN';
export type CaseStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'ESCALATED'
  | 'CLOSED_SAR'
  | 'CLOSED_FP';
export type FraudScenario =
  | 'CIRCULAR'
  | 'LAYERING'
  | 'STRUCTURING'
  | 'DORMANT'
  | 'PROFILE_MISMATCH';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  role: UserRole;
  employeeId: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

// ─── Transactions & Accounts ──────────────────────────────────────────────────

export interface Transaction {
  id: string;
  reference_number: string;
  source_account_id: string;
  dest_account_id: string;
  amount: number;
  channel: Channel;
  initiated_at: string;
  settled_at: string | null;
  branch_id: string;
  status: TxStatus;
  metadata: Record<string, unknown>;
}

export interface Account {
  id: string;
  customer_id: string;
  account_type: AccountType;
  kyc_risk_tier: KycRiskTier;
  declared_monthly_income: number;
  declared_occupation: string;
  open_date: string;
  last_transaction_date: string;
  is_dormant: boolean;
  dormant_since: string | null;
  status: AccountStatus;
  customer_name?: string;
  branch_id?: string;
  city?: string;
}

// ─── ML / AnomaScore ─────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  layering: number;
  circular: number;
  structuring: number;
  dormant: number;
  profile_mismatch: number;
}

export interface AnomaScoreResult {
  anoma_score: number;
  score_breakdown: ScoreBreakdown;
  detected_patterns: AlertType[];
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  transaction_id: string;
  account_id: string;
  alert_type: AlertType;
  anoma_score: number;
  score_breakdown: ScoreBreakdown;
  status: AlertStatus;
  assigned_to: string | null;
  evidence_package_id: string | null;
  created_at: string;
  // joined fields
  account?: Account;
  pattern_label?: string;
}

export interface AlertEvent {
  event_type: 'ALERT_GENERATED';
  alert_id: string;
  transaction_id: string;
  account_id: string;
  anoma_score: number;
  score_breakdown: ScoreBreakdown;
  detected_patterns: AlertType[];
  threshold_used: number;
  timestamp: string;
}

export interface AlertFilters {
  page?: number;
  size?: number;
  status?: AlertStatus;
  type?: AlertType;
  minScore?: number;
  assignedTo?: string;
  from?: string;
  to?: string;
}

export interface AlertExplanation {
  explanation: string;
  evidence_points: string[];
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  anoma_score: number;
  account_type: AccountType;
  is_dormant: boolean;
  kyc_risk_tier: KycRiskTier;
  branch_id: string;
  // D3 simulation fields (added at runtime)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  amount: number;
  timestamp: string;
  channel: Channel;
  tx_id: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    total_nodes: number;
    total_edges: number;
    detected_cycles: string[][];
  };
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export interface CaseNote {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

export interface Case {
  id: string;
  alert_id: string;
  alert: Alert;
  account: Account;
  transactions: Transaction[];
  notes: CaseNote[];
  status: CaseStatus;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface Report {
  report_id: string;
  download_url: string;
  generated_at: string;
}

// ─── Admin / Config ───────────────────────────────────────────────────────────

export interface SystemConfig {
  threshold: number;
  pep_threshold: number;
  weights: ScoreBreakdown;
}

export interface InvestigatorUser {
  id: string;
  name: string;
  employee_id: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
}

// ─── Simulator ────────────────────────────────────────────────────────────────

export interface SimulatorTriggerResult {
  triggered: boolean;
  scenario_id: string;
  alert_id?: string;
}

export interface RecentTrigger {
  scenario_id: string;
  type: FraudScenario;
  triggered_at: string;
  alert_id: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  total_elements: number;
  total_pages: number;
  number: number;
  size: number;
}
