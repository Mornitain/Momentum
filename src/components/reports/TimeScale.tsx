import React from 'react';

interface TimeScaleProps {
  totalMinutes: number;
  pixelsPerMinute: number;
  startHour: number; // 开始小时（24小时制）
  className?: string;
  showMinorTicks?: boolean; // 是否显示分钟刻度
}

const TimeScale: React.FC<TimeScaleProps> = ({
  totalMinutes,
  pixelsPerMinute,
  startHour,
  className = '',
  showMinorTicks = false,
}) => {
  const totalHeight = totalMinutes * pixelsPerMinute;
  
  // 生成小时刻度
  const generateHourTicks = () => {
    const ticks = [];
    const hoursInDay = 24;
    
    for (let i = 0; i < hoursInDay; i++) {
      const hour = (startHour + i) % 24;
      const minutesFromStart = i * 60;
      const y = minutesFromStart * pixelsPerMinute;
      
      // 格式化小时显示
      const hourLabel = hour.toString().padStart(2, '0') + ':00';
      
      // 判断是否为重要时间点
      const isImportant = hour === 0 || hour === 6 || hour === 12 || hour === 18;
      const isMidnight = hour === 0;
      
      ticks.push(
        <div
          key={`hour-${i}`}
          className="absolute left-0 right-0 flex items-center"
          style={{ top: `${y}px` }}
        >
          {/* 刻度线 */}
          <div
            className={`border-t ${
              isMidnight 
                ? 'border-red-400 border-2' 
                : isImportant 
                  ? 'border-gray-600 dark:border-gray-400' 
                  : 'border-gray-400 dark:border-gray-600'
            } ${
              isImportant ? 'w-6' : 'w-4'
            }`}
          />
          
          {/* 时间标签 */}
          <div 
            className={`ml-2 text-xs select-none ${
              isMidnight
                ? 'text-red-600 dark:text-red-400 font-bold'
                : isImportant
                  ? 'text-gray-700 dark:text-gray-300 font-medium'
                  : 'text-gray-500 dark:text-gray-500'
            }`}
          >
            {hourLabel}
          </div>
          
          {/* 特殊时间点标记 */}
          {isMidnight && (
            <div className="ml-1 text-xs text-red-600 dark:text-red-400 font-bold">
              午夜
            </div>
          )}
          {hour === 12 && (
            <div className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">
              中午
            </div>
          )}
        </div>
      );
      
      // 添加半小时刻度（如果启用了分钟刻度）
      if (showMinorTicks && i < hoursInDay - 1) {
        const halfHourY = (minutesFromStart + 30) * pixelsPerMinute;
        ticks.push(
          <div
            key={`half-hour-${i}`}
            className="absolute left-0 flex items-center"
            style={{ top: `${halfHourY}px` }}
          >
            <div className="border-t border-gray-300 dark:border-gray-700 w-3" />
            <div className="ml-2 text-xs text-gray-400 dark:text-gray-600 select-none">
              {((startHour + i) % 24).toString().padStart(2, '0')}:30
            </div>
          </div>
        );
      }
    }
    
    return ticks;
  };

  // 生成15分钟刻度（如果启用了分钟刻度）
  const generateQuarterTicks = () => {
    if (!showMinorTicks) return [];
    
    const ticks = [];
    const totalQuarters = Math.floor(totalMinutes / 15);
    
    for (let i = 1; i < totalQuarters; i++) {
      // 跳过整点和半点（已经在小时刻度中显示）
      if (i % 4 === 0 || i % 2 === 0) continue;
      
      const minutes = i * 15;
      const y = minutes * pixelsPerMinute;
      
      ticks.push(
        <div
          key={`quarter-${i}`}
          className="absolute left-0"
          style={{ top: `${y}px` }}
        >
          <div className="border-t border-gray-200 dark:border-gray-800 w-2" />
        </div>
      );
    }
    
    return ticks;
  };

  return (
    <div 
      className={`time-scale relative bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${className}`}
      style={{ 
        width: '80px',
        height: `${totalHeight}px`,
        minWidth: '80px'
      }}
    >
      {/* 背景 */}
      <div className="absolute inset-0" />
      
      {/* 时间刻度 */}
      <div className="relative h-full">
        {generateHourTicks()}
        {generateQuarterTicks()}
      </div>
      
      {/* 渐变遮罩（顶部和底部） */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
      
      {/* 当前时间指示器（如果在今天） */}
      <CurrentTimeIndicator 
        totalMinutes={totalMinutes}
        pixelsPerMinute={pixelsPerMinute}
        startHour={startHour}
      />
    </div>
  );
};

// 当前时间指示器
const CurrentTimeIndicator: React.FC<{
  totalMinutes: number;
  pixelsPerMinute: number;
  startHour: number;
}> = ({ totalMinutes, pixelsPerMinute, startHour }) => {
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次
    
    return () => clearInterval(timer);
  }, []);
  
  // 计算当前时间在时间轴上的位置
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  
  // 计算从开始时间到现在的分钟数
  let minutesFromStart = ((currentHour - startHour + 24) % 24) * 60 + currentMinute;
  
  // 如果不在显示范围内，不显示指示器
  if (minutesFromStart < 0 || minutesFromStart >= totalMinutes) {
    return null;
  }
  
  const y = minutesFromStart * pixelsPerMinute;
  
  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${y}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900" />
        <div className="ml-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded text-nowrap">
          现在
        </div>
      </div>
    </div>
  );
};

export default TimeScale;
