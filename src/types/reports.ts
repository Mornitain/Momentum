// 报告系统相关类型定义

export type SessionStatus = 'completed' | 'interrupted' | 'early_completed';
export type IdleType = 'sleep' | 'meal' | 'break' | 'transition';

// 会话记录
export interface SessionRecord {
  id: string;
  chainId: string;
  chainName: string;
  chainColor?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // 实际完成时长（分钟）
  originalDuration: number; // 原计划时长（分钟）
  status: SessionStatus;
  interruptions: number; // 中断次数
  pausedTime: number; // 暂停总时长（分钟）
  completionRate: number; // 完成度 (0-1)
  actualFocusTime: number; // 实际专注时长（秒）
  ruleEffects?: any[]; // 使用的例外规则
  isPauseBlock?: boolean; // 标记是否为暂停时间块
}

// 空闲时间段
export interface IdlePeriod {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // 分钟
  type: IdleType;
  description?: string;
}

// 每日报告数据
export interface DailyReport {
  date: string; // YYYY-MM-DD
  sessions: SessionRecord[];
  idlePeriods: IdlePeriod[];
  summary: DailySummary;
}

// 每日统计摘要
export interface DailySummary {
  totalFocusTime: number; // 总专注时间（分钟）
  totalPlannedTime: number; // 总计划时间（分钟）
  efficiency: number; // 效率百分比 (0-100)
  chainsUsed: string[]; // 使用过的链条ID
  peakHours: { start: number; end: number } | null; // 高效时段
  sessionCount: number; // 会话总数
  completedSessions: number; // 完成的会话数
  longestSession: number; // 最长会话时长（分钟）
  averageSessionLength: number; // 平均会话时长（分钟）
  interruptionRate: number; // 中断率 (0-1)
}

// 链条表现分析
export interface ChainPerformanceAnalysis {
  chainId: string;
  chainName: string;
  totalSessions: number;
  completedSessions: number;
  averageDuration: number;
  successRate: number;
  totalFocusTime: number;
  trendDirection: 'improving' | 'declining' | 'stable';
}

// 时间轴视图配置
export interface TimelineViewConfig {
  startHour: number; // 开始小时（默认3）
  endHour: number;   // 结束小时（默认27，即次日3点）
  pixelsPerMinute: number; // 每分钟像素数
  showIdlePeriods: boolean; // 是否显示空闲时间
  hourHeight: number; // 每小时高度（像素）
}

// 导出数据格式
export interface ExportData {
  meta: {
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
    dateRange: { start: string; end: string };
    generatedAt: string;
    version: string;
  };
  summary: {
    totalFocusTime: string;
    totalSessions: number;
    averageSessionLength: string;
    mostProductiveChain: string;
    efficiency: string;
    peakProductivityHours: string;
  };
  sessions: ExportSessionData[];
  charts?: {
    timelineChart?: string; // base64 encoded image
    efficiencyChart?: string;
    chainDistribution?: string;
  };
}

export interface ExportSessionData {
  date: string;
  startTime: string;
  endTime: string;
  chain: string;
  duration: string;
  status: string;
  interruptions: number;
  completionRate: string;
  actualFocusTime: string;
}

// 时间范围选择器
export interface DateRange {
  start: Date;
  end: Date;
}

// 报告视图类型
export type ReportViewType = 'daily' | 'weekly' | 'monthly' | 'custom';
