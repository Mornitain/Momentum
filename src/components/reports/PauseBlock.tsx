import React from 'react';
import { SessionRecord } from '../../types/reports';

interface PauseBlockProps {
  session: SessionRecord;
  height: number;
  isCompact: boolean;
  className?: string;
}

const PauseBlock: React.FC<PauseBlockProps> = ({
  session,
  isCompact,
  className = '',
}) => {
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

  return (
    <div
      className={`pause-block relative w-full rounded-md border-l-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-gray-400 border-gray-500 text-white ${className}`}
      style={{ 
        backgroundColor: '#9ca3af',
        borderLeftColor: '#6b7280',
        opacity: 0.7,
        background: 'repeating-linear-gradient(45deg, #9ca3af, #9ca3af 10px, #6b7280 10px, #6b7280 20px)',
      }}
    >
      {/* 内容区域 */}
      <div className="relative h-full px-3 py-2 flex flex-col">
        {!isCompact ? (
          // 正常显示模式（高度 >= 30px）
          <>
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm truncate flex-1 mr-2">
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zM13 8a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
                  </svg>
                  任务暂停
                </span>
              </h4>
              <div className="text-xs opacity-90 flex-shrink-0">
                {formatTime(session.startTime)}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1 text-xs opacity-90">
              <span>{formatDuration(session.duration)}</span>
              <span className="bg-white bg-opacity-20 px-1 rounded text-xs">
                暂停期间
              </span>
            </div>
            
            {/* 状态指示器 */}
            <div className="flex items-center mt-1">
              <div className="flex-1">
                <div className="text-xs flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  暂停中
                </div>
              </div>
            </div>
          </>
        ) : (
          // 紧凑显示模式（高度 < 30px）
          <div className="flex items-center justify-between h-full">
            <span className="text-xs font-medium truncate flex-1 mr-2">
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zM13 8a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
                暂停
              </span>
            </span>
            <div className="flex items-center text-xs space-x-1 flex-shrink-0">
              <span>{Math.round(session.duration)}分</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 悬停工具提示 */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-t-md">
          <div>暂停开始：{formatTime(session.startTime)}</div>
          <div>暂停结束：{formatTime(session.endTime)}</div>
          <div>暂停时长：{formatDuration(session.duration)}</div>
          <div className="text-yellow-300 mt-1">任务暂停期间</div>
        </div>
      </div>
    </div>
  );
};

export default PauseBlock;
