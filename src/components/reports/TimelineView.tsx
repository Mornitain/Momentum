import React from 'react';
import { SessionRecord } from '../../types/reports';
import SessionBlock from './SessionBlock';
import TimeScale from './TimeScale';

interface TimelineViewProps {
  date: string;
  sessions: SessionRecord[];
  className?: string;
  showHourMarkers?: boolean;
  onSessionClick?: (session: SessionRecord) => void;
  zoomLevel?: number;
}

interface TimeBlock {
  type: 'session';
  data: SessionRecord;
  startMinutes: number;
  endMinutes: number;
  height: number;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  date,
  sessions,
  className = '',
  showHourMarkers = true,
  onSessionClick,
  zoomLevel = 1,
}) => {
  // 将时间转换为从凌晨3点开始的分钟数
  const getMinutesFromDayStart = (time: Date): number => {
    const dayStart = new Date(date);
    dayStart.setHours(3, 0, 0, 0); // 从凌晨3点开始
    
    const diffMs = time.getTime() - dayStart.getTime();
    return Math.floor(diffMs / (1000 * 60));
  };

  // 创建时间块数据
  const createTimeBlocks = (): TimeBlock[] => {
    const blocks: TimeBlock[] = [];
    const totalMinutesInDay = 24 * 60; // 一天24小时
    
    // 添加会话块 - 为每个会话创建独立的块
    sessions.forEach((session) => {
      const startMinutes = getMinutesFromDayStart(session.startTime);
      const endMinutes = getMinutesFromDayStart(session.endTime);
      
      // 确保时间在当天范围内
      if (startMinutes >= 0 && startMinutes < totalMinutesInDay) {
        blocks.push({
          type: 'session',
          data: session,
          startMinutes: Math.max(0, startMinutes),
          endMinutes: Math.min(totalMinutesInDay, endMinutes),
          height: Math.max(2, endMinutes - startMinutes), // 最小高度2分钟，方便点击
        });
      }
    });

    // 按开始时间排序，相同时间的按结束时间排序
    return blocks.sort((a, b) => {
      if (a.startMinutes === b.startMinutes) {
        return a.endMinutes - b.endMinutes;
      }
      return a.startMinutes - b.startMinutes;
    });
  };

  const timeBlocks = createTimeBlocks();
  const pixelsPerMinute = 2 * zoomLevel; // 每分钟像素数乘以缩放级别
  const timelineHeight = 24 * 60 * pixelsPerMinute; // 总高度

  // 格式化时间显示
  const formatTime = (minutes: number): string => {
    const totalMinutes = (minutes + 3 * 60) % (24 * 60); // 调整为正常24小时制
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleBlockClick = (block: TimeBlock) => {
    if (block.type === 'session' && onSessionClick) {
      onSessionClick(block.data as SessionRecord);
    }
  };

  return (
    <div className={`timeline-view relative ${className}`}>
      {/* 时间轴容器 */}
      <div className="flex">
        {/* 时间刻度 */}
        {showHourMarkers && (
          <TimeScale 
            totalMinutes={24 * 60}
            pixelsPerMinute={pixelsPerMinute}
            startHour={3}
            className="flex-shrink-0"
          />
        )}
        
        {/* 时间块容器 */}
        <div 
          className="timeline-content flex-1 relative border-l border-gray-200 dark:border-gray-700"
          style={{ height: `${timelineHeight}px` }}
        >
          {/* 背景小时线 */}
          {showHourMarkers && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 24 }, (_, i) => {
                const y = i * 60 * pixelsPerMinute;
                return (
                  <div
                    key={i}
                    className="absolute w-full border-t border-gray-100 dark:border-gray-800"
                    style={{ top: `${y}px` }}
                  />
                );
              })}
            </div>
          )}
          
          {/* 时间块 */}
          {timeBlocks.map((block, index) => {
            const top = block.startMinutes * pixelsPerMinute;
            const height = block.height * pixelsPerMinute;
            
            return (
              <div
                key={`${block.type}-${index}`}
                className="absolute left-0 right-0 cursor-pointer transition-all duration-200 hover:z-10"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  minHeight: '4px', // 确保很小的块也能看见
                }}
                onClick={() => handleBlockClick(block)}
                title={`${(block.data as SessionRecord).chainName} (${formatTime(block.startMinutes)} - ${formatTime(block.endMinutes)})`}
              >
                <SessionBlock
                  session={block.data as SessionRecord}
                  height={height}
                  isCompact={height < 30}
                />
              </div>
            );
          })}
          
          {/* 当前时间指示器（如果是今天） */}
          {date === new Date().toISOString().split('T')[0] && (
            <CurrentTimeIndicator 
              pixelsPerMinute={pixelsPerMinute}
              startDate={date}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// 当前时间指示器组件
const CurrentTimeIndicator: React.FC<{
  pixelsPerMinute: number;
  startDate: string;
}> = ({ pixelsPerMinute, startDate }) => {
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次
    
    return () => clearInterval(timer);
  }, []);
  
  const dayStart = new Date(startDate);
  dayStart.setHours(3, 0, 0, 0);
  
  const minutesFromStart = Math.floor((currentTime.getTime() - dayStart.getTime()) / (1000 * 60));
  
  // 如果不在当天范围内，不显示
  if (minutesFromStart < 0 || minutesFromStart >= 24 * 60) {
    return null;
  }
  
  const top = minutesFromStart * pixelsPerMinute;
  
  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 -ml-1.5" />
        <div className="flex-1 h-0.5 bg-red-500" />
        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-r">
          现在 {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineView);
