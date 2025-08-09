import { SessionRecord, DailyReport, DailySummary, ChainPerformanceAnalysis } from '../types/reports';
import { CompletionHistory, Chain } from '../types';

const STORAGE_KEYS = {
  SESSION_RECORDS: 'momentum_session_records',
  DAILY_REPORTS: 'momentum_daily_reports',
};

export class ReportStorage {
  // 保存会话记录
  static saveSessionRecord(record: SessionRecord): void {
    try {
      const existingRecords = this.getSessionRecords();
      const updatedRecords = [...existingRecords, record];
      localStorage.setItem(STORAGE_KEYS.SESSION_RECORDS, JSON.stringify(updatedRecords));
      console.log('Session record saved:', record);
    } catch (error) {
      console.error('Failed to save session record:', error);
    }
  }

  // 获取所有会话记录
  static getSessionRecords(): SessionRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION_RECORDS);
      if (!data) return [];
      
      return JSON.parse(data).map((record: any) => ({
        ...record,
        startTime: new Date(record.startTime),
        endTime: new Date(record.endTime),
      }));
    } catch (error) {
      console.error('Failed to load session records:', error);
      return [];
    }
  }

  // 根据日期范围获取会话记录
  static getSessionsByDateRange(start: Date, end: Date): SessionRecord[] {
    const allRecords = this.getSessionRecords();
    return allRecords.filter(record => 
      record.startTime >= start && record.startTime < end
    );
  }

  // 获取特定日期的会话记录
  static getSessionsByDate(date: string): SessionRecord[] {
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return this.getSessionsByDateRange(targetDate, nextDate);
  }

  // 从完成历史记录转换为会话记录
  static convertCompletionHistoryToSessionRecords(completionHistory: CompletionHistory[], chains: Chain[]): SessionRecord[] {
    const sessionRecords: SessionRecord[] = [];
    
    completionHistory.forEach((completion) => {
      const chain = chains.find(c => c.id === completion.chainId);
      const ruleEffects = completion.ruleEffects || [];
      
      // 计算暂停总时间和中断次数
      let totalPausedTime = 0;
      let interruptionCount = 0;
      
      const pauseEvents: Array<{ startTime: number; endTime: number }> = [];
      let pauseStart: number | null = null;
      
      // 检查是否有暂停规则效果  
      ruleEffects.forEach((effect) => {        
        if (effect.ruleType === 'pause') {
          interruptionCount++;
          pauseStart = effect.appliedAt.getTime();
        } else if (pauseStart !== null) {
          // 任何非暂停事件都可能结束暂停
          const pauseEnd = effect.appliedAt.getTime();
          const pauseDuration = pauseEnd - pauseStart;
          totalPausedTime += pauseDuration;
          pauseEvents.push({ startTime: pauseStart, endTime: pauseEnd });
          pauseStart = null;
        }
      });
      
      // 如果还有未结束的暂停，用完成时间作为结束时间
      if (pauseStart !== null) {
        const pauseEnd = completion.completedAt.getTime();
        totalPausedTime += (pauseEnd - pauseStart);
        pauseEvents.push({ startTime: pauseStart, endTime: pauseEnd });
      }
      
      // 计算真实开始时间（包含暂停时间）
      const totalSessionTime = completion.actualFocusTime * 1000 + totalPausedTime;
      const realStartTime = new Date(completion.completedAt.getTime() - totalSessionTime);
      
      // 创建主会话记录
      const mainSession: SessionRecord = {
        id: `session_${completion.chainId}_${completion.completedAt.getTime()}`,
        chainId: completion.chainId,
        chainName: chain?.name || '未知链条',
        chainColor: this.getChainColor(completion.chainId),
        startTime: realStartTime,
        endTime: completion.completedAt,
        duration: completion.actualFocusTime / 60, // actualFocusTime 是秒，转换为分钟
        originalDuration: completion.duration, // duration 是分钟
        status: completion.wasSuccessful ? 
          (completion.isEarlyComplete ? 'early_completed' : 'completed') : 
          'interrupted',
        interruptions: interruptionCount,
        pausedTime: totalPausedTime / (1000 * 60), // 毫秒转换为分钟
        completionRate: completion.wasSuccessful ? 1 : (completion.actualFocusTime / (completion.duration * 60)),
        actualFocusTime: completion.actualFocusTime, // 保持秒为单位
        ruleEffects: ruleEffects,
      };
      
      sessionRecords.push(mainSession);
      
      // 为每个暂停期间创建暂停块
      pauseEvents.forEach((pause, index) => {
        const pauseSession: SessionRecord = {
          id: `pause_${completion.chainId}_${completion.completedAt.getTime()}_${index}`,
          chainId: completion.chainId,
          chainName: `${chain?.name || '未知链条'} - 暂停`,
          chainColor: '#9ca3af', // 灰色表示暂停
          startTime: new Date(pause.startTime),
          endTime: new Date(pause.endTime),
          duration: (pause.endTime - pause.startTime) / (1000 * 60), // 毫秒转分钟
          originalDuration: (pause.endTime - pause.startTime) / (1000 * 60),
          status: 'interrupted' as const,
          interruptions: 0,
          pausedTime: 0,
          completionRate: 0,
          actualFocusTime: 0,
          ruleEffects: [],
          isPauseBlock: true, // 标记为暂停块
        };
        
        sessionRecords.push(pauseSession);
      });
    });
    
    // 按开始时间排序
    return sessionRecords.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  // 获取链条颜色（简单的颜色分配逻辑）
  private static getChainColor(chainId: string): string {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // yellow
      '#ef4444', // red
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
    ];
    
    const hash = chainId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  // 清理旧的会话记录（保留最近30天）
  static cleanupOldRecords(): void {
    try {
      const allRecords = this.getSessionRecords();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecords = allRecords.filter(record => record.startTime >= thirtyDaysAgo);
      localStorage.setItem(STORAGE_KEYS.SESSION_RECORDS, JSON.stringify(recentRecords));
      
      console.log(`Cleaned up ${allRecords.length - recentRecords.length} old session records`);
    } catch (error) {
      console.error('Failed to cleanup old records:', error);
    }
  }

  // 将活动会话转换为会话记录
  static convertActiveSessionToSessionRecord(activeSession: any, chains: any[]): SessionRecord | null {
    try {
      const chain = chains.find(c => c.id === activeSession.chainId);
      if (!chain) return null;

      const now = new Date();
      const actualFocusTime = Math.max(0, 
        (now.getTime() - activeSession.startedAt.getTime() - activeSession.totalPausedTime) / 1000
      );

      return {
        id: `active_${activeSession.chainId}_${activeSession.startedAt.getTime()}`,
        chainId: activeSession.chainId,
        chainName: chain.name + ' (进行中)',
        chainColor: this.getChainColor(activeSession.chainId),
        startTime: new Date(activeSession.startedAt),
        endTime: now,
        duration: actualFocusTime / 60, // 保持原始精度
        originalDuration: activeSession.originalDuration || activeSession.duration,
        status: 'completed' as const,
        interruptions: 0,
        pausedTime: activeSession.totalPausedTime / (1000 * 60), // 保持原始精度
        completionRate: Math.min(1, actualFocusTime / (activeSession.duration * 60)),
        actualFocusTime: Math.floor(actualFocusTime),
        ruleEffects: activeSession.ruleEffects || [],
      };
    } catch (error) {
      console.error('Failed to convert active session:', error);
      return null;
    }
  }
}

export class ReportAnalytics {
  // 生成每日报告
  static generateDailyReport(date: string, sessions: SessionRecord[]): DailyReport {
    const summary = this.generateDailySummary(sessions);
    
    return {
      date,
      sessions,
      idlePeriods: [], // 不再计算空闲时间
      summary,
    };
  }

  // 生成每日统计摘要
  static generateDailySummary(sessions: SessionRecord[]): DailySummary {
    if (sessions.length === 0) {
      return {
        totalFocusTime: 0,
        totalPlannedTime: 0,
        efficiency: 0,
        chainsUsed: [],
        peakHours: null,
        sessionCount: 0,
        completedSessions: 0,
        longestSession: 0,
        averageSessionLength: 0,
        interruptionRate: 0,
      };
    }

    console.log('Debug: Sessions for summary calculation:', sessions.map(s => ({
      id: s.id,
      duration: s.duration, // 应该是分钟
      originalDuration: s.originalDuration, // 应该是分钟
      actualFocusTime: s.actualFocusTime, // 应该是秒
      isPauseBlock: s.isPauseBlock
    })));
    
    // 过滤掉暂停块，只计算实际专注会话
    const focusSessions = sessions.filter(s => !s.isPauseBlock);
    console.log('Debug: Focus sessions (excluding pauses):', focusSessions.length);
    
    const totalFocusTime = focusSessions.reduce((sum, session) => sum + session.duration, 0);
    const totalPlannedTime = focusSessions.reduce((sum, session) => sum + session.originalDuration, 0);
    
    console.log('Debug: Total focus time (minutes):', totalFocusTime);
    console.log('Debug: Total planned time (minutes):', totalPlannedTime);
    
    const completedSessions = focusSessions.filter(s => s.status === 'completed' || s.status === 'early_completed').length;
    const longestSession = focusSessions.length > 0 ? Math.max(...focusSessions.map(s => s.duration)) : 0;
    const chainsUsed = [...new Set(focusSessions.map(s => s.chainId))];
    
    const efficiency = totalPlannedTime > 0 ? (totalFocusTime / totalPlannedTime) * 100 : 0;
    const averageSessionLength = focusSessions.length > 0 ? totalFocusTime / focusSessions.length : 0;
    const interruptionRate = focusSessions.length > 0 ? focusSessions.filter(s => s.status === 'interrupted').length / focusSessions.length : 0;
    
    // 计算高效时段（会话密度最高的2小时窗口）
    const peakHours = this.calculatePeakHours(focusSessions);

    return {
      totalFocusTime,
      totalPlannedTime,
      efficiency: Math.round(efficiency * 100) / 100, // 保留两位小数
      chainsUsed,
      peakHours,
      sessionCount: focusSessions.length,
      completedSessions,
      longestSession,
      averageSessionLength: Math.round(averageSessionLength * 100) / 100,
      interruptionRate: Math.round(interruptionRate * 100) / 100,
    };
  }

  // 计算高效时段
  private static calculatePeakHours(sessions: SessionRecord[]): { start: number; end: number } | null {
    if (sessions.length === 0) return null;
    
    // 创建24小时的专注时间分布
    const hourlyFocus = new Array(24).fill(0);
    
    sessions.forEach(session => {
      const startHour = session.startTime.getHours();
      const endHour = session.endTime.getHours();
      const duration = session.duration;
      
      if (startHour === endHour) {
        // 会话在同一小时内
        hourlyFocus[startHour] += duration;
      } else {
        // 会话跨小时
        const minutesToEndOfStartHour = 60 - session.startTime.getMinutes();
        const minutesFromStartOfEndHour = session.endTime.getMinutes();
        
        hourlyFocus[startHour] += minutesToEndOfStartHour;
        hourlyFocus[endHour] += minutesFromStartOfEndHour;
        
        // 中间的完整小时
        for (let h = (startHour + 1) % 24; h !== endHour; h = (h + 1) % 24) {
          hourlyFocus[h] += 60;
        }
      }
    });
    
    // 找到连续2小时专注时间最多的时段
    let maxFocus = 0;
    let peakStart = 0;
    
    for (let i = 0; i < 24; i++) {
      const twoHourFocus = hourlyFocus[i] + hourlyFocus[(i + 1) % 24];
      if (twoHourFocus > maxFocus) {
        maxFocus = twoHourFocus;
        peakStart = i;
      }
    }
    
    // 如果没有足够的专注时间，返回null
    if (maxFocus < 30) return null; // 至少30分钟
    
    return {
      start: peakStart,
      end: (peakStart + 2) % 24,
    };
  }

  // 分析链条表现
  static analyzeChainPerformance(sessions: SessionRecord[], chains: any[]): ChainPerformanceAnalysis[] {
    const chainStats = new Map<string, any>();
    
    // 收集每个链条的统计数据
    sessions.forEach(session => {
      const chainId = session.chainId;
      if (!chainStats.has(chainId)) {
        const chain = chains.find(c => c.id === chainId);
        chainStats.set(chainId, {
          chainId,
          chainName: chain?.name || '未知链条',
          sessions: [],
        });
      }
      
      chainStats.get(chainId).sessions.push(session);
    });
    
    // 计算每个链条的分析结果
    return Array.from(chainStats.values()).map(chainData => {
      const sessions = chainData.sessions;
      const completedSessions = sessions.filter((s: SessionRecord) => s.status === 'completed').length;
      const totalFocusTime = sessions.reduce((sum: number, s: SessionRecord) => sum + s.duration, 0);
      
      return {
        chainId: chainData.chainId,
        chainName: chainData.chainName,
        totalSessions: sessions.length,
        completedSessions,
        averageDuration: totalFocusTime / sessions.length,
        successRate: completedSessions / sessions.length,
        totalFocusTime,
        trendDirection: 'stable' as const, // 暂时设为stable，后续可以添加趋势分析
      };
    });
  }
}
