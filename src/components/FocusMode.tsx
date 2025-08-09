import React, { useState, useEffect } from 'react';
import { ActiveSession, Chain, ExceptionRuleType } from '../types';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDuration } from '../utils/time';
import { showNotification } from '../utils/notifications';

interface FocusModeProps {
  session: ActiveSession;
  chain: Chain;
  onComplete: () => void;
  onInterrupt: (reason?: string) => void;
  onAddException: (exceptionRule: { description: string; type: ExceptionRuleType; extendMinutes?: number }) => void;
  onPause: () => void;
  onResume: () => void;
  onExtendTime: (minutes: number) => void;
  onCancelFocus: () => void;
  onEarlyComplete?: () => void; // 新增提前完成回调
}

const FocusMode: React.FC<FocusModeProps> = ({
  session,
  chain,
  onComplete,
  onInterrupt,
  onAddException,
  onPause,
  onResume,
  onExtendTime,
  onCancelFocus,
  onEarlyComplete,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showInterruptWarning, setShowInterruptWarning] = useState(false);
  const [interruptReason, setInterruptReason] = useState('');
  const [selectedExistingRule, setSelectedExistingRule] = useState('');
  const [useExistingRule, setUseExistingRule] = useState(false);
  const [ruleType, setRuleType] = useState<ExceptionRuleType>('normal');
  const [extendMinutes, setExtendMinutes] = useState<number>(5);

  // 计算初始时间函数
  const calculateInitialTime = () => {
    const now = Date.now();
    const realElapsedTime = session.isPaused 
      ? (session.pausedAt?.getTime() || now) - session.startedAt.getTime()
      : now - session.startedAt.getTime();
    
    const adjustedElapsedTime = realElapsedTime - session.totalPausedTime;
    
    // 倒计时模式：返回剩余时间（秒）
    const sessionDurationMs = session.duration * 60 * 1000;
    const remaining = Math.max(0, sessionDurationMs - adjustedElapsedTime);
    const remainingSeconds = Math.ceil(remaining / 1000);
    
    return remainingSeconds;
  };

  // 初始化计时器状态
  React.useEffect(() => {
    const initialTime = calculateInitialTime();
    setTimeRemaining(initialTime);
  }, [session.startedAt, session.totalPausedTime, session.duration]);

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const realElapsedTime = session.isPaused 
        ? (session.pausedAt?.getTime() || now) - session.startedAt.getTime()
        : now - session.startedAt.getTime();
      
      const adjustedElapsedTime = realElapsedTime - session.totalPausedTime;
      
      // 倒计时模式：返回剩余时间（秒）
      const sessionDurationMs = session.duration * 60 * 1000;
      const remaining = Math.max(0, sessionDurationMs - adjustedElapsedTime);
      return Math.ceil(remaining / 1000);
    };

    const updateTimer = () => {
      if (session.isPaused) return;
      
      const time = calculateTime();
      
      setTimeRemaining(time);
      
      if (time <= 0) {
        showNotification('任务完成', `"${chain.name}"已完成！`);
        onComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, onComplete, chain.name]);

  // 计算进度条
  const progress = ((session.duration * 60 - timeRemaining) / (session.duration * 60)) * 100;

  const handleInterruptClick = () => {
    setShowInterruptWarning(true);
  };

  const handleJudgmentFailure = () => {
    onInterrupt(interruptReason || '用户主动中断');
    setShowInterruptWarning(false);
  };

  const handleJudgmentAllow = () => {
    if (useExistingRule) {
      const selectedRule = chain.exceptions.find(rule => rule.id === selectedExistingRule);
      if (selectedRule) {
        // 根据规则类型执行相应动作
        if (selectedRule.type === 'extend_time' && selectedRule.extendMinutes) {
          executeRuleAction(selectedRule.type, selectedRule.extendMinutes);
        } else {
          executeRuleAction(selectedRule.type);
        }
      }
    } else {
      const ruleToAdd = interruptReason.trim();
      if (ruleToAdd) {
        // 检查是否已存在相同描述的规则
        const existingRule = chain.exceptions.find(rule => rule.description === ruleToAdd);
        if (!existingRule) {
          // 添加新规则
          const newRule = {
            description: ruleToAdd,
            type: ruleType,
            ...(ruleType === 'extend_time' && extendMinutes > 0 && { extendMinutes })
          };
          onAddException(newRule);
          // 执行规则动作
          if (ruleType === 'extend_time' && extendMinutes > 0) {
            executeRuleAction(ruleType, extendMinutes);
          } else {
            executeRuleAction(ruleType);
          }
        } else {
          // 使用已有规则
          if (existingRule.type === 'extend_time' && existingRule.extendMinutes) {
            executeRuleAction(existingRule.type, existingRule.extendMinutes);
          } else {
            executeRuleAction(existingRule.type);
          }
        }
      }
    }
    setShowInterruptWarning(false);
  };

  const executeRuleAction = (type: ExceptionRuleType, extendTime?: number) => {
    switch (type) {
      case 'pause':
        onPause();
        showNotification('任务已暂停', '根据例外规则，任务计时已暂停');
        break;
      case 'early_complete':
        // 提前完成使用专门的回调，确保记录实际时长
        if (onEarlyComplete) {
          onEarlyComplete();
        } else {
          onComplete(); // 兜底
        }
        showNotification('任务提前完成', '根据例外规则，任务已提前结束');
        break;
      case 'extend_time':
        if (extendTime && extendTime > 0) {
          onExtendTime(extendTime);
          showNotification('任务时间已延长', `根据例外规则，任务时间延长${extendTime}分钟`);
        }
        break;
      case 'cancel_focus':
        onCancelFocus();
        showNotification('专注已取消', '根据例外规则，专注已取消且不计入记录');
        break;
      case 'normal':
      default:
        // 普通规则，继续当前会话
        showNotification('行为已允许', '根据例外规则，此行为被允许');
        break;
    }
  };

  const getRuleTypeText = (type: ExceptionRuleType): string => {
    switch (type) {
      case 'pause':
        return '暂停计时';
      case 'early_complete':
        return '提前结束';
      case 'extend_time':
        return '延长计时';
      case 'cancel_focus':
        return '取消专注';
      case 'normal':
      default:
        return '普通规则';
    }
  };

  const getRuleActionText = (type: ExceptionRuleType): string => {
    switch (type) {
      case 'pause':
        return '此行为将暂停任务计时';
      case 'early_complete':
        return '此行为将提前结束任务并记录完成';
      case 'extend_time':
        return '此行为将延长任务计时时间';
      case 'cancel_focus':
        return '此行为将取消专注且不计入记录';
      case 'normal':
      default:
        return '此行为已被允许，可以继续任务';
    }
  };

  const getButtonStyleByRuleType = (type: ExceptionRuleType): string => {
    switch (type) {
      case 'pause':
        return 'bg-blue-500/90 hover:bg-blue-500';
      case 'early_complete':
        return 'bg-green-500/90 hover:bg-green-500';
      case 'extend_time':
        return 'bg-purple-500/90 hover:bg-purple-500';
      case 'cancel_focus':
        return 'bg-red-500/90 hover:bg-red-500';
      case 'normal':
      default:
        return 'bg-yellow-500/90 hover:bg-yellow-500';
    }
  };

  const getButtonTextColorByRuleType = (type: ExceptionRuleType): string => {
    switch (type) {
      case 'pause':
        return 'text-blue-200';
      case 'early_complete':
        return 'text-green-200';
      case 'extend_time':
        return 'text-purple-200';
      case 'cancel_focus':
        return 'text-red-200';
      case 'normal':
      default:
        return 'text-yellow-200';
    }
  };

  const handleRuleTypeChange = (useExisting: boolean) => {
    setUseExistingRule(useExisting);
    if (useExisting) {
      setInterruptReason('');
      // 优先选择第一个可用的规则
      const availableRules = chain.exceptions.filter(exception => 
        getAvailableRuleTypes().includes(exception.type)
      );
      setSelectedExistingRule(availableRules[0]?.id || '');
    } else {
      setSelectedExistingRule('');
    }
  };

  const resetInterruptModal = () => {
    setShowInterruptWarning(false);
    setInterruptReason('');
    setSelectedExistingRule('');
    setUseExistingRule(false);
  };

  // 获取可用的规则类型
  const getAvailableRuleTypes = (): ExceptionRuleType[] => {
    return ['normal', 'pause', 'early_complete', 'extend_time', 'cancel_focus'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#161615] dark:via-black dark:to-[#161615] flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-500/5 dark:from-primary-500/5 dark:via-transparent dark:to-primary-500/5"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/5 dark:bg-primary-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      
      {/* Main content */}
      <div className="relative z-10 text-center animate-fade-in">
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-primary-500/20 backdrop-blur-sm flex items-center justify-center border border-primary-500/30 dark:bg-primary-500/20 dark:border-primary-500/30">
              <i className="fas fa-fire text-primary-500 text-2xl"></i>
            </div>
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-light font-chinese text-gray-900 dark:text-white mb-2">{chain.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-mono tracking-wider">{chain.trigger}</p>
            </div>
          </div>
        </div>
        
        {/* Timer display */}
        <div className="mb-16">
          <div className="text-8xl md:text-9xl font-mono font-light text-gray-900 dark:text-white mb-8 tracking-wider">
            {formatDuration(timeRemaining)}
          </div>
          
          {/* Progress bar */}
          <div className="w-96 max-w-full h-3 bg-gray-200 dark:bg-white/10 backdrop-blur-sm rounded-full mx-auto mb-6 border border-gray-300 dark:border-white/20">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <i className="fas fa-clock text-primary-500"></i>
              <span className="font-mono">
                {Math.floor((session.duration * 60 - timeRemaining) / 60)}分钟 / {session.duration}分钟
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-stopwatch text-primary-500"></i>
              <span className="font-mono text-green-500">
                实际: {Math.floor(((Date.now() - session.startedAt.getTime() - session.totalPausedTime) / 1000) / 60)}分
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-fire text-primary-500"></i>
              <span className="font-mono">#{chain.currentStreak}</span>
            </div>
          </div>
        </div>

          {/* 规则效果显示 */}
          {session.ruleEffects && session.ruleEffects.length > 0 && (
            <div className="mt-8">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 max-w-md mx-auto">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 font-chinese">
                  已生效规则
                </h4>
                <div className="space-y-2">
                  {session.ruleEffects.slice(-3).map((effect, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        effect.ruleType === 'pause' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' :
                        effect.ruleType === 'early_complete' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' :
                        effect.ruleType === 'extend_time' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300' :
                        effect.ruleType === 'cancel_focus' ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300' :
                        'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300'
                      }`}>
                        {effect.ruleType === 'pause' ? '暂停' :
                         effect.ruleType === 'early_complete' ? '提前完成' :
                         effect.ruleType === 'extend_time' ? `延长${Math.floor((effect.timeImpact || 0) / 60)}分` :
                         effect.ruleType === 'cancel_focus' ? '取消' : '普通'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono">
                        {effect.appliedAt.toLocaleTimeString('zh-CN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        {session.isPaused && (
          <div 
            onClick={onResume}
            className="mt-12 p-6 bg-yellow-100 dark:bg-yellow-500/10 backdrop-blur-sm rounded-3xl border border-yellow-300 dark:border-yellow-500/30 max-w-md mx-auto animate-scale-in cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-500/20 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-center space-x-3 mb-2">
              <i className="fas fa-pause text-yellow-600 dark:text-yellow-400 text-xl"></i>
              <p className="text-yellow-700 dark:text-yellow-300 text-xl font-chinese font-medium">任务已暂停</p>
            </div>
            <p className="text-yellow-600 dark:text-yellow-400 text-sm font-chinese text-center">点击以继续</p>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-4">
          {/* Interrupt button */}
          <button
            onClick={handleInterruptClick}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-3xl font-medium transition-all duration-300 flex items-center space-x-3 border border-red-400 hover:border-red-500 hover:scale-105 shadow-2xl font-chinese"
          >
            <AlertTriangle size={20} />
            <span>中断/规则判定</span>
          </button>
        </div>
      </div>

      {/* Interrupt warning modal */}
      {showInterruptWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161615]/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700/50 shadow-2xl animate-scale-in flex flex-col">
            {/* Header */}
            <div className="p-8 pb-0 flex-shrink-0">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="text-red-400" size={32} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-white mb-1">规则判定</h2>
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400 tracking-wider">RULE JUDGMENT</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-chinese">
                  你似乎做出了与"最好的状态"不符的行为。请描述具体情况并选择处理方式：
                </p>
              </div>
            </div>
            
            {/* Content - 可滚动区域 */}
            <div className="flex-1 overflow-y-auto px-8">
              <div className="space-y-6">
              {/* 规则类型选择 */}
              {chain.exceptions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="ruleType"
                        checked={useExistingRule}
                        onChange={() => handleRuleTypeChange(true)}
                        className="w-5 h-5 text-green-500 focus:ring-green-500 focus:ring-2"
                      />
                      <span className="text-green-600 dark:text-green-300 font-medium font-chinese">使用已有例外规则</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="ruleType"
                        checked={!useExistingRule}
                        onChange={() => handleRuleTypeChange(false)}
                        className="w-5 h-5 text-yellow-500 focus:ring-yellow-500 focus:ring-2"
                      />
                      <span className="text-yellow-600 dark:text-yellow-300 font-medium font-chinese">添加新例外规则</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 已有规则选择 */}
              {useExistingRule && chain.exceptions.length > 0 && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-2xl p-6">
                  <label className="block text-green-700 dark:text-green-300 text-sm font-medium mb-3 font-chinese">
                    选择适用的例外规则：
                  </label>
                  <select
                    value={selectedExistingRule}
                    onChange={(e) => setSelectedExistingRule(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800/50 border border-green-300 dark:border-green-500/30 rounded-2xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 font-chinese"
                  >
                    {chain.exceptions
                      .filter(exception => getAvailableRuleTypes().includes(exception.type))
                      .map((exception, index) => (
                        <option key={index} value={exception.id} className="bg-white dark:bg-gray-800">
                          {exception.description} ({getRuleTypeText(exception.type)}
                          {exception.type === 'extend_time' && exception.extendMinutes ? ` - ${exception.extendMinutes}分钟` : ''})
                        </option>
                      ))}
                  </select>
                  <div className="mt-4 p-4 bg-green-100 dark:bg-green-500/10 rounded-2xl border border-green-200 dark:border-green-500/30">
                    <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
                      <CheckCircle size={20} />
                      <span className="text-sm font-chinese">
                        {(() => {
                          const selectedRule = chain.exceptions.find(r => r.id === selectedExistingRule);
                          if (selectedRule?.type === 'extend_time' && selectedRule.extendMinutes) {
                            return `${getRuleActionText(selectedRule.type)} ${selectedRule.extendMinutes}分钟`;
                          }
                          return getRuleActionText(selectedRule?.type || 'normal');
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 新规则输入 */}
              {!useExistingRule && (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl p-6">
                  <label className="block text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-3 font-chinese">
                    描述具体行为：
                  </label>
                  <textarea
                    value={interruptReason}
                    onChange={(e) => setInterruptReason(e.target.value)}
                    placeholder="请描述具体行为，例如：查看手机消息、起身上厕所、与他人交谈等"
                    className="w-full bg-white dark:bg-gray-800/50 border border-yellow-300 dark:border-yellow-500/30 rounded-2xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-300 resize-none font-chinese"
                    rows={3}
                    required
                  />
                  
                  {/* 规则类型选择 - 根据计时类型过滤 */}
                  <div className="mt-4">
                    <label className="block text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-3 font-chinese">
                      规则类型：
                    </label>
                    <div className="space-y-2">
                      {getAvailableRuleTypes().map((type) => (
                        <label key={type} className="flex items-center space-x-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="radio"
                              name="newRuleType"
                              value={type}
                              checked={ruleType === type}
                              onChange={(e) => setRuleType(e.target.value as ExceptionRuleType)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              ruleType === type 
                                ? 'border-yellow-500 bg-yellow-500' 
                                : 'border-gray-300 dark:border-gray-500'
                            }`}>
                              {ruleType === type && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                          </div>
                          <span className="text-yellow-700 dark:text-yellow-300 text-sm font-chinese">
                            {type === 'normal' && '普通规则 - 允许行为并继续任务'}
                            {type === 'pause' && '暂停计时 - 暂停计时但保持任务'}
                            {type === 'early_complete' && '提前结束 - 高效完成任务提前结束'}
                            {type === 'extend_time' && '延长计时 - 延长当前任务时间'}
                            {type === 'cancel_focus' && '取消专注 - 立即停止计时且不计入记录'}
                          </span>
                        </label>
                      ))}
                      
                      {/* 延长时间选项 */}
                      {ruleType === 'extend_time' && (
                        <div className="ml-7 mt-2">
                          <label className="block text-yellow-700 dark:text-yellow-300 text-xs font-medium mb-2 font-chinese">
                            延长时间（分钟）：
                          </label>
                          <select
                            value={extendMinutes}
                            onChange={(e) => setExtendMinutes(Number(e.target.value))}
                            className="bg-white dark:bg-gray-800/50 border border-yellow-300 dark:border-yellow-500/30 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                          >
                            <option value={5}>5分钟</option>
                            <option value={10}>10分钟</option>
                            <option value={15}>15分钟</option>
                            <option value={20}>20分钟</option>
                            <option value={30}>30分钟</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
            
            {/* Footer - 固定在底部 */}
            <div className="p-8 pt-6 border-t border-gray-200 dark:border-gray-700/50 flex-shrink-0">
              <div className="space-y-4">
                {/* 执行按钮 */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleJudgmentFailure}
                    className="bg-red-500/90 hover:bg-red-500 text-red-200 px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese border border-red-400"
                  >
                    判定失败
                    <div className="text-xs opacity-80 mt-1">主链记录将从 #{chain.currentStreak} 清零为 #0</div>
                  </button>
                  
                  <button
                    onClick={handleJudgmentAllow}
                    className={`${
                      useExistingRule 
                        ? (() => {
                            const selectedRule = chain.exceptions.find(r => r.id === selectedExistingRule);
                            return getButtonStyleByRuleType(selectedRule?.type || 'normal');
                          })()
                        : getButtonStyleByRuleType(ruleType)
                    } ${
                      useExistingRule
                        ? (() => {
                            const selectedRule = chain.exceptions.find(r => r.id === selectedExistingRule);
                            return getButtonTextColorByRuleType(selectedRule?.type || 'normal');
                          })()
                        : getButtonTextColorByRuleType(ruleType)
                    } px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese border`}
                    disabled={!useExistingRule && !interruptReason.trim()}
                  >
                    判定允许（下必为例) - {
                      useExistingRule
                        ? (() => {
                            const selectedRule = chain.exceptions.find(r => r.id === selectedExistingRule);
                            return getRuleTypeText(selectedRule?.type || 'normal');
                          })()
                        : getRuleTypeText(ruleType)
                    }
                    <div className="text-xs opacity-80 mt-1">
                      {useExistingRule
                        ? (() => {
                            const selectedRule = chain.exceptions.find(r => r.id === selectedExistingRule);
                            return getRuleActionText(selectedRule?.type || 'normal');
                          })()
                        : getRuleActionText(ruleType)
                      }
                    </div>
                  </button>
                </div>
                
                {/* 取消按钮 */}
                <button
                  onClick={resetInterruptModal}
                  className="w-full bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-2xl font-medium transition-all duration-300 font-chinese border border-gray-300 dark:border-gray-600"
                >
                  取消 - 继续任务
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusMode;