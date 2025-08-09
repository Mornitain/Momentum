import React, { useState, useEffect, useMemo } from 'react';
import { DailyReport, SessionRecord } from '../../types/reports';
import { Chain } from '../../types';
import { ReportStorage, ReportAnalytics } from '../../utils/reportStorage';
import { storage } from '../../utils/storage';
import TimelineView from './TimelineView';
import { Clock, CheckCircle, TrendingUp, Target, BarChart3 } from 'lucide-react';

interface ReportDashboardProps {
  className?: string;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({ className = '' }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // 添加刷新键
  const [zoomLevel, setZoomLevel] = useState(1); // 添加缩放级别状态
  const [prevZoomLevel, setPrevZoomLevel] = useState(1); // 记录上一次的缩放级别
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);

  // 监听数据变化的强制刷新
  useEffect(() => {
    const handleDataChange = () => {
      setRefreshKey(prev => prev + 1);
    };

    // 监听localStorage变化
    window.addEventListener('storage', handleDataChange);
    
    // 监听自定义事件（当数据在同一页面更新时）
    window.addEventListener('dataUpdated', handleDataChange);

    return () => {
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('dataUpdated', handleDataChange);
    };
  }, []);

  // 加载链条数据
  useEffect(() => {
    try {
      const storedChains = storage.getChains();
      setChains(storedChains);
    } catch (err) {
      console.error('Failed to load chains:', err);
      setError('无法加载链条数据');
    }
  }, [refreshKey]); // 添加 refreshKey 依赖

  // 生成报告数据
  useEffect(() => {
    const generateReport = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取会话记录
        let sessions = ReportStorage.getSessionsByDate(selectedDate);
        
        // 检查今天的完成历史，无论是否有现有会话记录都要补充
        const completionHistory = storage.getCompletionHistory();
        const activeSession = storage.getActiveSession();
        
        // 过滤当天的完成历史
        const targetDate = new Date(selectedDate);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const todaysCompletions = completionHistory.filter(completion => {
          const completedAt = new Date(completion.completedAt);
          return completedAt >= targetDate && completedAt < nextDate;
        });
        
        console.log('Debug: Today\'s completions count:', todaysCompletions.length);
        
        // 如果有今天的完成记录但没有对应的会话记录，需要转换
        if (todaysCompletions.length > 0) {
          // 从完成历史转换
          const convertedSessions = ReportStorage.convertCompletionHistoryToSessionRecords(
            todaysCompletions, // 只转换当天的记录
            chains
          );
          
          console.log('Converted sessions count:', convertedSessions.length);
          
          // 合并现有会话记录和新转换的记录（去重）
          const existingSessionIds = new Set(sessions.map(s => s.id));
          const newSessions = convertedSessions.filter(s => !existingSessionIds.has(s.id));
          
          console.log('New sessions to add:', newSessions.length);
          
          sessions = [...sessions, ...newSessions];
          
          // 保存新转换的会话记录
          newSessions.forEach(session => {
            ReportStorage.saveSessionRecord(session);
          });
        }
        
        // 如果有当前活动会话，也要包含进来
        if (activeSession) {
          const activeSessionRecord = ReportStorage.convertActiveSessionToSessionRecord(
            activeSession,
            chains
          );
          if (activeSessionRecord) {
            const existingActiveSession = sessions.find(s => s.id === activeSessionRecord.id);
            if (!existingActiveSession) {
              sessions.push(activeSessionRecord);
            }
          }
        }
        
        console.log('Final sessions count:', sessions.length);
        const pauseBlockCount = sessions.filter(s => s.isPauseBlock).length;
        if (pauseBlockCount > 0) {
          console.log('Sessions with pause blocks:', pauseBlockCount);
        } else {
          console.log('No pause blocks found in sessions');
        }

        // 生成每日报告
        const report = ReportAnalytics.generateDailyReport(selectedDate, sessions);
        setDailyReport(report);

      } catch (err) {
        console.error('Failed to generate report:', err);
        setError('生成报告时出现错误');
      } finally {
        setLoading(false);
      }
    };

    if (chains.length > 0) {
      generateReport();
    }
  }, [selectedDate, chains]);

  // 自动滚动到当前时间
  useEffect(() => {
    if (!dailyReport || !timelineScrollRef.current) return;
    
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    if (isToday) {
      const now = new Date();
      const dayStart = new Date(selectedDate);
      dayStart.setHours(3, 0, 0, 0); // 从凌晨3点开始
      
      const minutesFromStart = Math.floor((now.getTime() - dayStart.getTime()) / (1000 * 60));
      
      // 确保时间在当天范围内
      if (minutesFromStart >= 0 && minutesFromStart < 24 * 60) {
        const pixelsPerMinute = 2;
        const scrollPosition = Math.max(0, (minutesFromStart - 60) * pixelsPerMinute); // 提前1小时显示
        
        setTimeout(() => {
          if (timelineScrollRef.current) {
            timelineScrollRef.current.scrollTop = scrollPosition;
          }
        }, 100); // 延迟确保组件已完全渲染
      }
    }
  }, [dailyReport, selectedDate]);

  // 处理缩放变化，保持当前可视区域的中心位置
  useEffect(() => {
    if (!timelineScrollRef.current || Math.abs(prevZoomLevel - zoomLevel) < 0.01) return;
    
    const scrollContainer = timelineScrollRef.current;
    const containerHeight = scrollContainer.clientHeight;
    const oldScrollTop = scrollContainer.scrollTop;
    
    // 计算当前可视区域中心对应的时间位置（分钟）
    const viewportCenter = oldScrollTop + containerHeight / 2;
    const minutesPerPixelOld = 1 / (2 * prevZoomLevel);
    const centerTimeMinutes = viewportCenter * minutesPerPixelOld;
    
    // 立即更新prevZoomLevel，避免重复触发
    setPrevZoomLevel(zoomLevel);
    
    // 使用 requestAnimationFrame 确保在下一帧更新滚动位置
    const adjustScroll = () => {
      if (timelineScrollRef.current) {
        const minutesPerPixelNew = 1 / (2 * zoomLevel);
        const newViewportCenter = centerTimeMinutes / minutesPerPixelNew;
        const newScrollTop = Math.max(0, newViewportCenter - containerHeight / 2);
        
        // 直接设置scrollTop，避免scrollTo可能带来的动画
        timelineScrollRef.current.scrollTop = newScrollTop;
      }
    };
    
    requestAnimationFrame(adjustScroll);
  }, [zoomLevel, prevZoomLevel]);

  // 添加键盘快捷键支持
  useEffect(() => {
    let keyPressTimeout: NodeJS.Timeout | null = null;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // 只在没有焦点在输入框等元素时响应
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // 清除之前的定时器，实现防抖
      if (keyPressTimeout) {
        clearTimeout(keyPressTimeout);
      }
      
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        keyPressTimeout = setTimeout(() => {
          setZoomLevel(prev => {
            const newLevel = Math.min(4, prev + 0.1);
            return Math.round(newLevel * 10) / 10;
          });
        }, 10);
      } else if (e.key === '-') {
        e.preventDefault();
        keyPressTimeout = setTimeout(() => {
          setZoomLevel(prev => {
            const newLevel = Math.max(0.5, prev - 0.1);
            return Math.round(newLevel * 10) / 10;
          });
        }, 10);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (keyPressTimeout) {
        clearTimeout(keyPressTimeout);
      }
    };
  }, []);

  // 格式化时长显示
  const formatDuration = (minutes: number): string => {
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    if (mins === 0) {
      return `${secs}秒`;
    } else if (mins < 60) {
      return secs > 0 ? `${mins}分钟${secs}秒` : `${mins}分钟`;
    } else {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (remainingMins === 0 && secs === 0) {
        return `${hours}小时`;
      } else if (secs === 0) {
        return `${hours}小时${remainingMins}分钟`;
      } else {
        return `${hours}小时${remainingMins}分钟${secs}秒`;
      }
    }
  };

  // 格式化百分比
  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100) / 100}%`;
  };

  // 生成日期选项
  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const label = i === 0 ? '今天' : 
                   i === 1 ? '昨天' : 
                   date.toLocaleDateString('zh-CN', { 
                     month: 'short', 
                     day: 'numeric',
                     weekday: 'short'
                   });
      
      options.push({ value: dateString, label });
    }
    
    return options;
  };

  const dateOptions = useMemo(() => generateDateOptions(), []);

  // 处理会话点击
  const handleSessionClick = (session: SessionRecord) => {
    setSelectedSession(session);
  };

  if (loading) {
    return (
      <div className={`report-dashboard flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在生成报告...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`report-dashboard flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!dailyReport) {
    return (
      <div className={`report-dashboard flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">📊</div>
          <p className="text-gray-600 dark:text-gray-400">暂无报告数据</p>
        </div>
      </div>
    );
  }

  const { sessions, summary } = dailyReport;

  return (
    <div className={`report-dashboard space-y-6 ${className}`}>
      {/* 顶部控制栏 */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* 标题区域 - 始终居中 */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            每日报告
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400">
            查看您的时间使用情况和专注效率
          </p>
        </div>
        
        {/* 控制区域 - 紧贴标题下方 */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-6">
            {/* 日期选择 */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                日期:
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dateOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 缩放控制 */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                缩放:
              </label>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoomLevel - 0.5) / 3.5) * 100}%, #e5e7eb ${((zoomLevel - 0.5) / 3.5) * 100}%, #e5e7eb 100%)`
                }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[2.5rem] font-mono">
                {zoomLevel.toFixed(1)}x
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 select-none" title="使用 + 和 - 键快速缩放">
                (+/-)
              </span>
            </div>
            
            {/* 显示选项 */}
            <div className="flex items-center space-x-2">
              <BarChart3 size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                专注时间分析视图
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总专注时间"
          value={formatDuration(summary.totalFocusTime)}
          icon={<Clock size={24} />}
          color="blue"
        />
        <StatCard
          title="完成率"
          value={`${summary.completedSessions}/${summary.sessionCount}`}
          subtitle={formatPercentage((summary.completedSessions / summary.sessionCount) * 100)}
          icon={<CheckCircle size={24} />}
          color="green"
        />
        <StatCard
          title="效率"
          value={formatPercentage(summary.efficiency)}
          subtitle={`计划 ${formatDuration(summary.totalPlannedTime)}`}
          icon={<TrendingUp size={24} />}
          color="yellow"
        />
        <StatCard
          title="最长专注"
          value={formatDuration(summary.longestSession)}
          subtitle={`平均 ${formatDuration(summary.averageSessionLength)}`}
          icon={<Target size={24} />}
          color="purple"
        />
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 时间轴视图 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              时间轴视图
            </h3>
            <div 
              ref={timelineScrollRef}
              className="overflow-auto" 
              style={{ height: '70vh', minHeight: '600px' }}
            >
              <TimelineView
                date={selectedDate}
                sessions={sessions}
                onSessionClick={handleSessionClick}
                className="min-w-full"
                zoomLevel={zoomLevel}
              />
            </div>
          </div>
        </div>

        {/* 侧边栏详情 */}
        <div className="space-y-4">
          {/* 会话详情 */}
          {selectedSession && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                会话详情
              </h4>
              <SessionDetailCard session={selectedSession} />
            </div>
          )}

          {/* 高效时段 */}
          {summary.peakHours && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                高效时段
              </h4>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.peakHours.start.toString().padStart(2, '0')}:00 - {summary.peakHours.end.toString().padStart(2, '0')}:00
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  在这个时间段您的专注度最高
                </p>
              </div>
            </div>
          )}

          {/* 使用的链条 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              使用的链条
            </h4>
            <div className="space-y-2">
              {summary.chainsUsed.map(chainId => {
                const chain = chains.find(c => c.id === chainId);
                const chainSessions = sessions.filter(s => s.chainId === chainId);
                const totalTime = chainSessions.reduce((sum, s) => sum + s.duration, 0);
                
                return (
                  <div key={chainId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {chain?.name || '未知链条'}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDuration(totalTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="text-gray-600 dark:text-gray-400">{icon}</div>
      </div>
    </div>
  );
};

// 会话详情卡片组件
interface SessionDetailCardProps {
  session: SessionRecord;
}

const SessionDetailCard: React.FC<SessionDetailCardProps> = ({ session }) => {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const formatDuration = (minutes: number): string => {
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    if (mins === 0) {
      return `${secs}秒`;
    } else if (mins < 60) {
      return secs > 0 ? `${mins}分钟${secs}秒` : `${mins}分钟`;
    } else {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (remainingMins === 0 && secs === 0) {
        return `${hours}小时`;
      } else if (secs === 0) {
        return `${hours}小时${remainingMins}分钟`;
      } else {
        return `${hours}小时${remainingMins}分钟${secs}秒`;
      }
    }
  };

  const formatActualTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) {
      return `${minutes}分${secs}秒`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分${secs}秒`;
  };

  return (
    <div className="space-y-3">
      <div>
        <h5 className="font-medium text-gray-900 dark:text-white">
          {session.chainName}
        </h5>
        <div className="flex items-center mt-1">
          <div 
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: session.chainColor }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {session.status === 'completed' ? '已完成' : 
             session.status === 'interrupted' ? '已中断' : '提前完成'}
          </span>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">开始时间:</span>
          <span className="text-gray-900 dark:text-white">{formatTime(session.startTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">结束时间:</span>
          <span className="text-gray-900 dark:text-white">{formatTime(session.endTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">实际专注:</span>
          <span className="text-gray-900 dark:text-white">{formatActualTime(session.actualFocusTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">计划时长:</span>
          <span className="text-gray-900 dark:text-white">{formatDuration(session.originalDuration)}</span>
        </div>
        {session.pausedTime > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">暂停时间:</span>
            <span className="text-yellow-600 dark:text-yellow-400">{formatDuration(session.pausedTime)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">完成率:</span>
          <span className="text-gray-900 dark:text-white">
            {Math.round(session.completionRate * 100)}%
          </span>
        </div>
        {session.interruptions > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">中断次数:</span>
            <span className="text-red-600 dark:text-red-400">{session.interruptions}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDashboard;
