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
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showInterruptWarning, setShowInterruptWarning] = useState(false);
  const [interruptReason, setInterruptReason] = useState('');
  const [selectedExistingRule, setSelectedExistingRule] = useState('');
  const [useExistingRule, setUseExistingRule] = useState(false);
  const [ruleType, setRuleType] = useState<ExceptionRuleType>('normal');
  const [extendMinutes, setExtendMinutes] = useState<number>(5);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now();
      const sessionDurationMs = session.duration * 60 * 1000;
      const elapsedTime = session.isPaused 
        ? (session.pausedAt?.getTime() || now) - session.startedAt.getTime()
        : now - session.startedAt.getTime();
      
      const adjustedElapsedTime = elapsedTime - session.totalPausedTime;
      const remaining = Math.max(0, sessionDurationMs - adjustedElapsedTime);
      
      return Math.ceil(remaining / 1000);
    };

    const updateTimer = () => {
      if (session.isPaused) return;
      
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        showNotification('任务完成', `“${chain.name}”已完成！`);
        onComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, onComplete, chain.name]);

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
        onComplete();
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
      setSelectedExistingRule(chain.exceptions[0]?.id || '');
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
              <i className="fas fa-fire text-primary-500"></i>
              <span className="font-mono">#{chain.currentStreak}</span>
            </div>
          </div>
        </div>

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
        {/* Interrupt button */}
        <button
          onClick={handleInterruptClick}
          className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-3xl font-medium transition-all duration-300 flex items-center space-x-3 border border-red-400 hover:border-red-500 hover:scale-105 shadow-2xl font-chinese"
        >
          <AlertTriangle size={20} />
          <span>中断/规则判定</span>
        </button>
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
                    {chain.exceptions.map((exception, index) => (
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
                  
                  {/* 规则类型选择 */}
                  <div className="mt-4">
                    <label className="block text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-3 font-chinese">
                      规则类型：
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="radio"
                            name="newRuleType"
                            value="normal"
                            checked={ruleType === 'normal'}
                            onChange={(e) => setRuleType(e.target.value as ExceptionRuleType)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ruleType === 'normal' 
                              ? 'border-yellow-500 bg-yellow-500' 
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {ruleType === 'normal' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        </div>
                        <span className="text-yellow-700 dark:text-yellow-300 text-sm font-chinese">普通规则 - 允许行为并继续任务</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="radio"
                            name="newRuleType"
                            value="pause"
                            checked={ruleType === 'pause'}
                            onChange={(e) => setRuleType(e.target.value as ExceptionRuleType)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ruleType === 'pause' 
                              ? 'border-blue-500 bg-blue-500' 
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {ruleType === 'pause' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        </div>
                        <span className="text-blue-700 dark:text-blue-300 text-sm font-chinese">暂停计时 - 暂停任务计时（如上厕所）</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="radio"
                            name="newRuleType"
                            value="early_complete"
                            checked={ruleType === 'early_complete'}
                            onChange={(e) => setRuleType(e.target.value as ExceptionRuleType)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ruleType === 'early_complete' 
                              ? 'border-green-500 bg-green-500' 
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {ruleType === 'early_complete' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        </div>
                        <span className="text-green-700 dark:text-green-300 text-sm font-chinese">提前结束 - 高效完成任务提前结束</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="radio"
                            name="newRuleType"
                            value="extend_time"
                            checked={ruleType === 'extend_time'}
                            onChange={(e) => setRuleType(e.target.value as ExceptionRuleType)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ruleType === 'extend_time' 
                              ? 'border-purple-500 bg-purple-500' 
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {ruleType === 'extend_time' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        </div>
                        <span className="text-purple-700 dark:text-purple-300 text-sm font-chinese">延长计时 - 延长当前计时时间</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="radio"
                            name="newRuleType"
                            value="cancel_focus"
                            checked={ruleType === 'cancel_focus'}
                            onChange={(e) => setRuleType(e.target.value as ExceptionRuleType)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ruleType === 'cancel_focus' 
                              ? 'border-red-500 bg-red-500' 
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {ruleType === 'cancel_focus' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        </div>
                        <span className="text-red-700 dark:text-red-300 text-sm font-chinese">取消专注 - 立即停止计时且不计入记录</span>
                      </label>
                    </div>
                    
                    {/* 延长时间输入框 */}
                    {ruleType === 'extend_time' && (
                      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-200 dark:border-purple-500/30">
                        <label className="block text-purple-700 dark:text-purple-300 text-sm font-medium mb-2 font-chinese">
                          延长时间（分钟）：
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={extendMinutes}
                          onChange={(e) => setExtendMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white dark:bg-gray-800/50 border border-purple-300 dark:border-purple-500/30 rounded-2xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 font-chinese"
                          placeholder="输入延长的分钟数"
                        />
                        <p className="mt-2 text-purple-600 dark:text-purple-400 text-xs font-chinese">
                          建议延长 5-30 分钟，最多 120 分钟
                        </p>
                      </div>
                    )}
                  </div>

                  {interruptReason.trim() && chain.exceptions.some(rule => rule.description === interruptReason.trim()) && (
                    <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-500/10 rounded-2xl border border-yellow-200 dark:border-yellow-500/30">
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm font-chinese">
                        ⚠️ 此规则已存在，建议选择"使用已有例外规则"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer - 固定在底部 */}
            <div className="p-8 pt-4 flex-shrink-0">
              <div className="space-y-4">
                <button
                  onClick={handleJudgmentFailure}
                  className="w-full bg-red-500/90 hover:bg-red-500 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese"
                >
                  <div className="text-left">
                    <div className="font-bold text-lg">判定失败</div>
                    <div className="text-sm text-red-200">主链记录将从 #{chain.currentStreak} 清零为 #0</div>
                  </div>
                </button>
                
                <button
                  onClick={handleJudgmentAllow}
                  disabled={useExistingRule ? !selectedExistingRule : !interruptReason.trim()}
                  className={`w-full px-6 py-4 rounded-2xl font-medium transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-white hover:scale-105 font-chinese ${
                    useExistingRule 
                      ? 'bg-green-500/90 hover:bg-green-500' 
                      : getButtonStyleByRuleType(ruleType)
                  }`}
                >
                  <div className="text-left">
                    <div className="font-bold text-lg">
                      {useExistingRule 
                        ? `使用例外规则 - ${getRuleTypeText(chain.exceptions.find(r => r.id === selectedExistingRule)?.type || 'normal')}` 
                        : `判定允许（下必为例） - ${getRuleTypeText(ruleType)}`
                      }
                    </div>
                    <div className={`text-sm ${useExistingRule ? 'text-green-200' : getButtonTextColorByRuleType(ruleType)}`}>
                      {useExistingRule 
                        ? getRuleActionText(chain.exceptions.find(r => r.id === selectedExistingRule)?.type || 'normal')
                        : `此行为将永久添加到例外规则中 - ${getRuleActionText(ruleType)}`
                      }
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={resetInterruptModal}
                  className="w-full bg-gray-200 dark:bg-gray-600/90 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese"
                >
                  取消 - 继续任务
                </button>
              </div>
              
              {chain.exceptions.length > 0 && (
                <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50">
                  <h4 className="text-gray-900 dark:text-white font-medium mb-4 flex items-center space-x-2 font-chinese">
                    <i className="fas fa-list text-primary-500"></i>
                    <span>当前例外规则：</span>
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {chain.exceptions.map((exception, index) => (
                      <div key={index} className="text-yellow-600 dark:text-yellow-300 text-sm flex items-center space-x-2">
                        <i className="fas fa-check-circle text-xs"></i>
                        <span>{exception.description}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {getRuleTypeText(exception.type)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusMode;