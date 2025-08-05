export type ExceptionRuleType = 'normal' | 'pause' | 'early_complete' | 'extend_time' | 'cancel_focus';

export interface ExceptionRule {
  id: string;
  description: string;
  type: ExceptionRuleType;
  createdAt: Date;
  extendMinutes?: number; // 延长时间规则的具体分钟数
}

export interface Chain {
  id: string;
  name: string;
  trigger: string;
  duration: number; // in minutes
  description: string;
  currentStreak: number;
  auxiliaryStreak: number; // 辅助链连续成功记录
  totalCompletions: number;
  totalFailures: number;
  auxiliaryFailures: number; // 辅助链失败次数
  exceptions: ExceptionRule[]; // 改为带类型的例外规则数组
  auxiliaryExceptions: string[]; // 辅助链例外规则，确保是数组类型
  // 辅助链设置
  auxiliarySignal: string; // 预约信号，如"打响指"、"设置闹钟"
  auxiliaryDuration: number; // 预约时长（分钟）
  auxiliaryCompletionTrigger: string; // 预约完成条件，通常与主链trigger相同
  createdAt: Date;
  lastCompletedAt?: Date;
}

export interface ScheduledSession {
  chainId: string;
  scheduledAt: Date;
  expiresAt: Date;
  auxiliarySignal: string; // 记录使用的预约信号
}

export interface ActiveSession {
  chainId: string;
  startedAt: Date;
  duration: number;
  isPaused: boolean;
  pausedAt?: Date;
  totalPausedTime: number;
  ruleEffects: ExceptionRuleEffect[]; // 记录所有规则生效历史
  originalDuration: number; // 保存原始设定时长（分钟）
}

export interface CompletionHistory {
  chainId: string;
  completedAt: Date;
  duration: number; // 原设定时长（分钟）
  actualFocusTime: number; // 实际专注时长（秒），精确到秒
  wasSuccessful: boolean;
  reasonForFailure?: string;
  ruleEffects?: ExceptionRuleEffect[]; // 记录生效的例外规则影响
}

export interface ExceptionRuleEffect {
  ruleType: ExceptionRuleType;
  description: string;
  appliedAt: Date; // 规则生效时间
  timeImpact?: number; // 时间影响（秒），暂停为负数，延长为正数
}

export type ViewState = 'dashboard' | 'editor' | 'focus' | 'detail';

export interface AppState {
  chains: Chain[];
  scheduledSessions: ScheduledSession[];
  activeSession: ActiveSession | null;
  currentView: ViewState;
  editingChain: Chain | null;
  viewingChainId: string | null;
  completionHistory: CompletionHistory[];
}