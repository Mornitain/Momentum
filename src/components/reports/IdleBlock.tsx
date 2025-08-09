import React from 'react';
import { IdlePeriod } from '../../types/reports';

interface IdleBlockProps {
  idle: IdlePeriod;
  height: number;
  isCompact: boolean;
  className?: string;
}

const IdleBlock: React.FC<IdleBlockProps> = ({
  idle,
  isCompact,
  className = '',
}) => {
  // 根据空闲类型确定样式
  const getIdleTypeStyles = () => {
    switch (idle.type) {
      case 'sleep':
        return 'bg-indigo-300 border-indigo-400 text-indigo-900';
      case 'meal':
        return 'bg-orange-300 border-orange-400 text-orange-900';
      case 'break':
        return 'bg-green-300 border-green-400 text-green-900';
      case 'transition':
        return 'bg-gray-300 border-gray-400 text-gray-900';
      default:
        return 'bg-gray-300 border-gray-400 text-gray-900';
    }
  };

  // 获取空闲类型图标
  const getIdleTypeIcon = () => {
    switch (idle.type) {
      case 'sleep':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
          </svg>
        );
      case 'meal':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 5V1a1 1 0 112 0v4h1V1a1 1 0 112 0v4h1V1a1 1 0 112 0v4a2 2 0 01-2 2v7a2 2 0 11-4 0V7a2 2 0 01-2-2zM4 5V1a1 1 0 10-2 0v4a2 2 0 002 2v7a2 2 0 11-4 0V7a2 2 0 012-2z" clipRule="evenodd" />
          </svg>
        );
      case 'break':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 000 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
          </svg>
        );
      case 'transition':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  // 获取空闲类型中文名称
  const getIdleTypeName = () => {
    switch (idle.type) {
      case 'sleep':
        return '睡眠';
      case 'meal':
        return '用餐';
      case 'break':
        return '休息';
      case 'transition':
        return '过渡';
      default:
        return '空闲';
    }
  };

  // 格式化时长显示
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  // 格式化时间显示
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const idleStyles = getIdleTypeStyles();

  return (
    <div
      className={`idle-block relative w-full rounded-md border-l-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 opacity-60 hover:opacity-80 ${idleStyles} ${className}`}
    >
      {/* 内容区域 */}
      <div className="relative h-full px-3 py-2 flex flex-col">
        {!isCompact ? (
          // 正常显示模式（高度 >= 30px）
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getIdleTypeIcon()}
                <h4 className="font-medium text-sm">
                  {getIdleTypeName()}
                </h4>
              </div>
              <div className="text-xs opacity-80 flex-shrink-0">
                {formatTime(idle.startTime)}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1 text-xs opacity-80">
              <span>{formatDuration(idle.duration)}</span>
            </div>
            
            {/* 描述信息 */}
            {idle.description && (
              <div className="text-xs opacity-70 mt-1 truncate">
                {idle.description}
              </div>
            )}
          </>
        ) : (
          // 紧凑显示模式（高度 < 30px）
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-1">
              {getIdleTypeIcon()}
              <span className="text-xs font-medium truncate">
                {getIdleTypeName()}
              </span>
            </div>
            <div className="text-xs flex-shrink-0">
              {Math.round(idle.duration)}分
            </div>
          </div>
        )}
      </div>
      
      {/* 悬停工具提示 */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-t-md z-10">
          <div className="flex items-center space-x-2 mb-1">
            {getIdleTypeIcon()}
            <span className="font-medium">{getIdleTypeName()}</span>
          </div>
          <div>开始：{formatTime(idle.startTime)}</div>
          <div>结束：{formatTime(idle.endTime)}</div>
          <div>时长：{formatDuration(idle.duration)}</div>
          {idle.description && (
            <div className="mt-1 text-gray-300">{idle.description}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdleBlock;
