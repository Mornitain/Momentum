import React from 'react';
import { SessionRecord } from '../../types/reports';
import PauseBlock from './PauseBlock';

interface SessionBlockProps {
  session: SessionRecord;
  height: number;
  isCompact: boolean;
  className?: string;
}

const SessionBlock: React.FC<SessionBlockProps> = ({
  session,
  height,
  isCompact,
  className = '',
}) => {
  // 如果是暂停块，使用专门的PauseBlock组件
  if (session.isPauseBlock) {
    return <PauseBlock session={session} height={height} isCompact={isCompact} className={className} />;
  }
  // 根据会话状态确定样式
  const getStatusStyles = () => {
    switch (session.status) {
      case 'completed':
        return 'bg-green-500 border-green-600 text-white';
      case 'interrupted':
        return 'bg-red-400 border-red-500 text-white';
      case 'early_completed':
        return 'bg-blue-500 border-blue-600 text-white';
      default:
        return 'bg-gray-400 border-gray-500 text-white';
    }
  };

  // 计算完成率，用于显示进度条
  const completionRate = session.completionRate || 0;
  
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

  const statusStyles = getStatusStyles();

  return (
    <div
      className={`session-block relative w-full rounded-md border-l-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${statusStyles} ${className}`}
      style={{ 
        backgroundColor: session.chainColor,
        borderLeftColor: session.chainColor,
        filter: session.status === 'completed' ? 'brightness(1)' : 'brightness(0.8)',
      }}
    >
      {/* 进度条背景（如果未完成100%） */}
      {completionRate < 1 && (
        <div className="absolute inset-0 bg-black bg-opacity-20">
          <div
            className="h-full bg-white bg-opacity-20"
            style={{ width: `${completionRate * 100}%` }}
          />
        </div>
      )}
      
      {/* 内容区域 */}
      <div className="relative h-full px-3 py-2 flex flex-col">
        {!isCompact ? (
          // 正常显示模式（高度 >= 30px）
          <>
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm truncate flex-1 mr-2">
                {session.chainName}
              </h4>
              <div className="text-xs opacity-90 flex-shrink-0">
                {formatTime(session.startTime)}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1 text-xs opacity-90">
              <span>{formatDuration(session.duration)}</span>
              {session.interruptions > 0 && (
                <span className="bg-white bg-opacity-20 px-1 rounded">
                  {session.interruptions}次中断
                </span>
              )}
            </div>
            
            {/* 状态指示器 */}
            <div className="flex items-center mt-1">
              <div className="flex-1">
                {session.status === 'completed' && (
                  <div className="text-xs flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    已完成
                  </div>
                )}
                {session.status === 'interrupted' && (
                  <div className="text-xs flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    已中断
                  </div>
                )}
                {session.status === 'early_completed' && (
                  <div className="text-xs flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    提前完成
                  </div>
                )}
              </div>
              
              {/* 效率指示器 */}
              {completionRate < 1 && (
                <div className="text-xs">
                  {Math.round(completionRate * 100)}%
                </div>
              )}
            </div>
          </>
        ) : (
          // 紧凑显示模式（高度 < 30px）
          <div className="flex items-center justify-between h-full">
            <span className="text-xs font-medium truncate flex-1 mr-2">
              {session.chainName}
            </span>
            <div className="flex items-center text-xs space-x-1 flex-shrink-0">
              <span>{Math.round(session.duration)}分</span>
              {session.status === 'completed' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {session.status === 'interrupted' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 悬停工具提示增强 */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-t-md">
          <div>开始：{formatTime(session.startTime)}</div>
          <div>结束：{formatTime(session.endTime)}</div>
          <div>实际专注：{formatDuration(session.actualFocusTime / 60)}</div>
          {session.pausedTime > 0 && (
            <div>暂停时间：{formatDuration(session.pausedTime)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionBlock;
