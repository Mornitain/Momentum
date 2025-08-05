import React, { useState } from 'react';
import { Chain, CompletionHistory, ExceptionRule, ExceptionRuleType } from '../types';
import { ArrowLeft, Flame, CheckCircle, XCircle, Calendar, Clock, AlertCircle, Trash2, Edit, Plus, X } from 'lucide-react';
import { formatTime } from '../utils/time';

interface ChainDetailProps {
  chain: Chain;
  history: CompletionHistory[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateExceptions: (chainId: string, exceptions: ExceptionRule[], auxiliaryExceptions: string[]) => void;
}

const ChainDetail: React.FC<ChainDetailProps> = ({
  chain,
  history,
  onBack,
  onEdit,
  onDelete,
  onUpdateExceptions,
}) => {
  const chainHistory = history.filter(h => h.chainId === chain.id);
  const recentHistory = chainHistory.slice(-10).reverse();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [editingExceptions, setEditingExceptions] = useState<ExceptionRule[]>([...chain.exceptions]);
  const [editingAuxiliaryExceptions, setEditingAuxiliaryExceptions] = useState([...chain.auxiliaryExceptions || []]);
  const [newException, setNewException] = useState('');
  const [newExceptionType, setNewExceptionType] = useState<ExceptionRuleType>('normal');
  const [newExtendMinutes, setNewExtendMinutes] = useState(5);
  const [newAuxiliaryException, setNewAuxiliaryException] = useState('');

  const successRate = chain.totalCompletions > 0 
    ? Math.round((chain.totalCompletions / (chain.totalCompletions + chain.totalFailures)) * 100)
    : 0;

  const handleDeleteException = (index: number, isAuxiliary: boolean = false) => {
    if (isAuxiliary) {
      const updated = editingAuxiliaryExceptions.filter((_, i) => i !== index);
      setEditingAuxiliaryExceptions(updated);
    } else {
      const updated = editingExceptions.filter((_, i) => i !== index);
      setEditingExceptions(updated);
    }
  };

  const handleAddException = (isAuxiliary: boolean = false) => {
    const newRule = isAuxiliary ? newAuxiliaryException.trim() : newException.trim();
    if (!newRule) return;

    if (isAuxiliary) {
      if (!editingAuxiliaryExceptions.includes(newRule)) {
        setEditingAuxiliaryExceptions([...editingAuxiliaryExceptions, newRule]);
        setNewAuxiliaryException('');
      }
    } else {
      // 检查是否已存在相同描述的规则
      const exists = editingExceptions.some(rule => rule.description === newRule);
      if (!exists) {
        const newExceptionRule: ExceptionRule = {
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          description: newRule,
          type: newExceptionType,
          createdAt: new Date(),
          ...(newExceptionType === 'extend_time' && { extendMinutes: newExtendMinutes })
        };
        setEditingExceptions([...editingExceptions, newExceptionRule]);
        setNewException('');
        setNewExceptionType('normal');
        setNewExtendMinutes(5);
      }
    }
  };

  const handleSaveRules = () => {
    onUpdateExceptions(chain.id, editingExceptions, editingAuxiliaryExceptions);
    setEditingRules(false);
  };

  const handleCancelEdit = () => {
    setEditingExceptions([...chain.exceptions]);
    setEditingAuxiliaryExceptions([...chain.auxiliaryExceptions || []]);
    setNewException('');
    setNewAuxiliaryException('');
    setEditingRules(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 animate-fade-in">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-3 text-gray-400 hover:text-[#161615] dark:hover:text-slate-200 transition-colors rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-2">{chain.name}</h1>
              <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">CHAIN DETAILS</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onEdit}
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg font-chinese"
            >
              <Edit size={16} />
              <span>编辑链条</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg font-chinese"
            >
              <Trash2 size={16} />
              <span>删除</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Chain Info */}
          <div className="xl:col-span-1 space-y-6">
            {/* Main Stats */}
            <div className="bento-card animate-scale-in">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-3 text-primary-500 mb-4">
                  <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center">
                    <Flame size={32} />
                  </div>
                  <div className="text-left">
                    <span className="text-5xl font-bold font-mono">#{chain.currentStreak}</span>
                    <p className="text-gray-500 text-sm font-chinese">主链当前记录</p>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8 pb-8 border-b border-gray-200">
                <div className="flex items-center justify-center space-x-3 text-blue-500 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-3xl font-bold font-mono">#{chain.auxiliaryStreak}</span>
                    <p className="text-gray-500 text-sm font-chinese">预约链当前记录</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">触发动作</span>
                  <span className="text-[#161615] dark:text-slate-100 font-medium font-chinese">{chain.trigger}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">任务时长</span>
                  <span className="text-[#161615] dark:text-slate-100 font-medium font-mono">{formatTime(chain.duration)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">总完成次数</span>
                  <span className="text-green-500 font-bold font-mono">{chain.totalCompletions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">失败次数</span>
                  <span className="text-red-500 font-bold font-mono">{chain.totalFailures}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">预约链失败</span>
                  <span className="text-red-500 font-bold font-mono">{chain.auxiliaryFailures}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">预约信号</span>
                  <span className="text-blue-500 font-medium font-chinese">{chain.auxiliarySignal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">预约时长</span>
                  <span className="text-blue-500 font-medium font-mono">{chain.auxiliaryDuration}分钟</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">预约完成条件</span>
                  <span className="text-blue-500 font-medium font-chinese">{chain.auxiliaryCompletionTrigger}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-gray-500 dark:text-slate-400 font-chinese">成功率</span>
                  <span className="text-primary-500 font-bold text-xl font-mono">{successRate}%</span>
                </div>
              </div>
            </div>

            {/* Exceptions */}
            {(chain.exceptions.length > 0 || chain.auxiliaryExceptions.length > 0 || editingRules) && (
              <div className="bento-card animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold font-chinese text-[#161615] dark:text-slate-100 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                      <AlertCircle size={20} className="text-yellow-500" />
                    </div>
                    <div>
                      <span>规则手册</span>
                      <p className="text-xs font-mono text-gray-500 dark:text-slate-400 tracking-wide">RULE HANDBOOK</p>
                    </div>
                  </h3>
                  
                  {!editingRules ? (
                    <button
                      onClick={() => setEditingRules(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 text-sm font-chinese"
                    >
                      <Edit size={14} />
                      <span>编辑规则</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveRules}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 text-sm font-chinese"
                      >
                        <CheckCircle size={14} />
                        <span>保存</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 text-sm font-chinese"
                      >
                        <X size={14} />
                        <span>取消</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Main Chain Exceptions */}
                <div className="mb-6">
                  <h4 className="text-[#161615] dark:text-slate-100 font-medium mb-3 font-chinese flex items-center space-x-2">
                    <i className="fas fa-fire text-primary-500"></i>
                    <span>主链例外规则：</span>
                  </h4>
                  
                  {editingRules ? (
                    <div className="space-y-3">
                      {editingExceptions.map((exception, index) => (
                        <div key={index} className="bg-yellow-500/10 dark:bg-yellow-500/20 rounded-2xl p-4 border border-yellow-500/20 dark:border-yellow-500/30">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 mr-3">
                              <p className="text-yellow-700 dark:text-yellow-300 text-sm font-chinese mb-2">{exception.description}</p>
                              <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                                exception.type === 'normal' ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200' :
                                exception.type === 'pause' ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200' :
                                exception.type === 'early_complete' ? 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200' :
                                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                              }`}>
                                {exception.type === 'normal' ? '普通规则' : 
                                 exception.type === 'pause' ? '暂停计时' : 
                                 exception.type === 'early_complete' ? '提前结束' : '未知类型'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteException(index, false)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          
                          {/* 编辑规则类型 */}
                          <div className="pt-3 border-t border-yellow-500/20">
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-chinese mb-2 block">
                              规则类型：
                            </span>
                            <div className="flex flex-wrap gap-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name={`exceptionType_${index}`}
                                    value="normal"
                                    checked={exception.type === 'normal'}
                                    onChange={(e) => {
                                      const updated = [...editingExceptions];
                                      updated[index] = { ...updated[index], type: e.target.value as ExceptionRuleType };
                                      setEditingExceptions(updated);
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    exception.type === 'normal' 
                                      ? 'border-yellow-500 bg-yellow-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {exception.type === 'normal' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-xs text-yellow-700 dark:text-yellow-300 font-chinese">普通</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name={`exceptionType_${index}`}
                                    value="pause"
                                    checked={exception.type === 'pause'}
                                    onChange={(e) => {
                                      const updated = [...editingExceptions];
                                      updated[index] = { ...updated[index], type: e.target.value as ExceptionRuleType };
                                      setEditingExceptions(updated);
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    exception.type === 'pause' 
                                      ? 'border-blue-500 bg-blue-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {exception.type === 'pause' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-xs text-blue-700 dark:text-blue-300 font-chinese">暂停</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name={`exceptionType_${index}`}
                                    value="early_complete"
                                    checked={exception.type === 'early_complete'}
                                    onChange={(e) => {
                                      const updated = [...editingExceptions];
                                      updated[index] = { ...updated[index], type: e.target.value as ExceptionRuleType };
                                      setEditingExceptions(updated);
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    exception.type === 'early_complete' 
                                      ? 'border-green-500 bg-green-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {exception.type === 'early_complete' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-xs text-green-700 dark:text-green-300 font-chinese">提前结束</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name={`exceptionType_${index}`}
                                    value="extend_time"
                                    checked={exception.type === 'extend_time'}
                                    onChange={(e) => {
                                      const updated = [...editingExceptions];
                                      updated[index] = { ...updated[index], type: e.target.value as ExceptionRuleType };
                                      setEditingExceptions(updated);
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    exception.type === 'extend_time' 
                                      ? 'border-purple-500 bg-purple-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {exception.type === 'extend_time' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-xs text-purple-700 dark:text-purple-300 font-chinese">延长时间</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name={`exceptionType_${index}`}
                                    value="cancel_focus"
                                    checked={exception.type === 'cancel_focus'}
                                    onChange={(e) => {
                                      const updated = [...editingExceptions];
                                      updated[index] = { ...updated[index], type: e.target.value as ExceptionRuleType };
                                      setEditingExceptions(updated);
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    exception.type === 'cancel_focus' 
                                      ? 'border-red-500 bg-red-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {exception.type === 'cancel_focus' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-xs text-red-700 dark:text-red-300 font-chinese">取消专注</span>
                              </label>
                            </div>
                            
                            {/* 延长时间输入框 */}
                            {exception.type === 'extend_time' && (
                              <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/30">
                                <label className="block text-purple-700 dark:text-purple-300 text-xs font-medium mb-2 font-chinese">
                                  延长时间（分钟）：
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="120"
                                  value={exception.extendMinutes || 5}
                                  onChange={(e) => {
                                    const updated = [...editingExceptions];
                                    updated[index] = { 
                                      ...updated[index], 
                                      extendMinutes: Math.max(1, parseInt(e.target.value) || 1) 
                                    };
                                    setEditingExceptions(updated);
                                  }}
                                  className="w-full bg-white dark:bg-gray-800/50 border border-purple-300 dark:border-purple-500/30 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 font-chinese"
                                  placeholder="输入延长的分钟数"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Add new exception */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={newException}
                            onChange={(e) => setNewException(e.target.value)}
                            placeholder="添加新的例外规则..."
                            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-chinese focus:outline-none focus:border-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddException(false)}
                          />
                          
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-chinese">规则类型：</span>
                            <div className="flex flex-wrap gap-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name="exceptionType"
                                    value="normal"
                                    checked={newExceptionType === 'normal'}
                                    onChange={(e) => setNewExceptionType(e.target.value as ExceptionRuleType)}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    newExceptionType === 'normal' 
                                      ? 'border-yellow-500 bg-yellow-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {newExceptionType === 'normal' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-sm text-yellow-700 dark:text-yellow-300 font-chinese">普通</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name="exceptionType"
                                    value="pause"
                                    checked={newExceptionType === 'pause'}
                                    onChange={(e) => setNewExceptionType(e.target.value as ExceptionRuleType)}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    newExceptionType === 'pause' 
                                      ? 'border-blue-500 bg-blue-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {newExceptionType === 'pause' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-sm text-blue-700 dark:text-blue-300 font-chinese">暂停</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name="exceptionType"
                                    value="early_complete"
                                    checked={newExceptionType === 'early_complete'}
                                    onChange={(e) => setNewExceptionType(e.target.value as ExceptionRuleType)}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    newExceptionType === 'early_complete' 
                                      ? 'border-green-500 bg-green-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {newExceptionType === 'early_complete' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-sm text-green-700 dark:text-green-300 font-chinese">提前结束</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name="exceptionType"
                                    value="extend_time"
                                    checked={newExceptionType === 'extend_time'}
                                    onChange={(e) => setNewExceptionType(e.target.value as ExceptionRuleType)}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    newExceptionType === 'extend_time' 
                                      ? 'border-purple-500 bg-purple-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {newExceptionType === 'extend_time' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-sm text-purple-700 dark:text-purple-300 font-chinese">延长时间</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="radio"
                                    name="exceptionType"
                                    value="cancel_focus"
                                    checked={newExceptionType === 'cancel_focus'}
                                    onChange={(e) => setNewExceptionType(e.target.value as ExceptionRuleType)}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    newExceptionType === 'cancel_focus' 
                                      ? 'border-red-500 bg-red-500' 
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                    {newExceptionType === 'cancel_focus' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                </div>
                                <span className="text-sm text-red-700 dark:text-red-300 font-chinese">取消专注</span>
                              </label>
                            </div>
                            <button
                              onClick={() => handleAddException(false)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          
                          {/* 延长时间输入框 */}
                          {newExceptionType === 'extend_time' && (
                            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/30">
                              <label className="block text-purple-700 dark:text-purple-300 text-xs font-medium mb-2 font-chinese">
                                延长时间（分钟）：
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={newExtendMinutes}
                                onChange={(e) => setNewExtendMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-white dark:bg-gray-800/50 border border-purple-300 dark:border-purple-500/30 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 font-chinese"
                                placeholder="输入延长的分钟数"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chain.exceptions.length > 0 ? chain.exceptions.map((exception, index) => (
                        <div key={index} className={`rounded-2xl p-4 border ${
                          exception.type === 'normal' ? 'bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/20 dark:border-yellow-500/30' :
                          exception.type === 'pause' ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30' :
                          exception.type === 'early_complete' ? 'bg-green-500/10 dark:bg-green-500/20 border-green-500/20 dark:border-green-500/30' :
                          exception.type === 'extend_time' ? 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20 dark:border-purple-500/30' :
                          exception.type === 'cancel_focus' ? 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20 dark:border-red-500/30' :
                          'bg-gray-500/10 dark:bg-gray-500/20 border-gray-500/20 dark:border-gray-500/30'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm font-chinese ${
                                exception.type === 'normal' ? 'text-yellow-700 dark:text-yellow-300' :
                                exception.type === 'pause' ? 'text-blue-700 dark:text-blue-300' :
                                exception.type === 'early_complete' ? 'text-green-700 dark:text-green-300' :
                                exception.type === 'extend_time' ? 'text-purple-700 dark:text-purple-300' :
                                exception.type === 'cancel_focus' ? 'text-red-700 dark:text-red-300' :
                                'text-gray-700 dark:text-gray-300'
                              }`}>{exception.description}</p>
                              {exception.type === 'extend_time' && exception.extendMinutes && (
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                  延长 {exception.extendMinutes} 分钟
                                </p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              exception.type === 'normal' ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200' :
                              exception.type === 'pause' ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200' :
                              exception.type === 'early_complete' ? 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200' :
                              exception.type === 'extend_time' ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' :
                              exception.type === 'cancel_focus' ? 'bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200' :
                              'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {exception.type === 'normal' ? '普通规则' : 
                               exception.type === 'pause' ? '暂停计时' : 
                               exception.type === 'early_complete' ? '提前结束' :
                               exception.type === 'extend_time' ? '延长时间' :
                               exception.type === 'cancel_focus' ? '取消专注' : '未知类型'}
                            </span>
                          </div>
                        </div>
                      )) : (
                        <div className="text-gray-500 dark:text-gray-400 text-sm font-chinese italic">暂无主链例外规则</div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Auxiliary Chain Exceptions */}
                <div>
                  <h4 className="text-[#161615] dark:text-slate-100 font-medium mb-3 font-chinese flex items-center space-x-2">
                    <i className="fas fa-calendar-alt text-blue-500"></i>
                    <span>预约链例外规则：</span>
                  </h4>
                  
                  {editingRules ? (
                    <div className="space-y-3">
                      {editingAuxiliaryExceptions.map((exception, index) => (
                        <div key={index} className="bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl p-4 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-between">
                          <p className="text-blue-700 dark:text-blue-300 text-sm font-chinese flex-1">{exception}</p>
                          <button
                            onClick={() => handleDeleteException(index, true)}
                            className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      
                      {/* Add new auxiliary exception */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newAuxiliaryException}
                            onChange={(e) => setNewAuxiliaryException(e.target.value)}
                            placeholder="添加新的预约链例外规则..."
                            className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-chinese focus:outline-none focus:border-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddException(true)}
                          />
                          <button
                            onClick={() => handleAddException(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(chain.auxiliaryExceptions && chain.auxiliaryExceptions.length > 0) ? chain.auxiliaryExceptions.map((exception, index) => (
                        <div key={index} className="bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl p-4 border border-blue-500/20 dark:border-blue-500/30">
                          <p className="text-blue-700 dark:text-blue-300 text-sm font-chinese">{exception}</p>
                        </div>
                      )) : (
                        <div className="text-gray-500 dark:text-gray-400 text-sm font-chinese italic">暂无预约链例外规则</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* History and Description */}
          <div className="xl:col-span-2 space-y-6">
            {/* Description */}
            <div className="bento-card animate-scale-in">
              <h3 className="text-xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-6 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-500/10 flex items-center justify-center">
                  <i className="fas fa-align-left text-gray-500"></i>
                </div>
                <div>
                  <span>任务描述</span>
                  <p className="text-xs font-mono text-gray-500 dark:text-slate-400 tracking-wide">TASK DESCRIPTION</p>
                </div>
              </h3>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-chinese text-lg">{chain.description}</p>
            </div>

            {/* History */}
            <div className="bento-card animate-scale-in">
              <h3 className="text-xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-6 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                  <Calendar size={20} className="text-primary-500" />
                </div>
                <div>
                  <span>最近记录</span>
                  <p className="text-xs font-mono text-gray-500 dark:text-slate-400 tracking-wide">RECENT HISTORY</p>
                </div>
              </h3>

              {recentHistory.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-slate-400">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                    <Calendar size={32} className="text-gray-400" />
                  </div>
                  <p className="font-chinese text-lg">还没有完成记录</p>
                  <p className="text-sm font-mono text-gray-400 dark:text-slate-500 mt-2">NO COMPLETION RECORDS YET</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentHistory.map((record, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          record.wasSuccessful 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {record.wasSuccessful ? (
                            <CheckCircle size={24} />
                          ) : (
                            <XCircle size={24} />
                          )}
                        </div>
                        <div>
                          <p className="text-[#161615] dark:text-slate-100 font-medium font-chinese text-lg">
                            {record.wasSuccessful ? '任务完成' : '任务失败'}
                          </p>
                          {!record.wasSuccessful && record.reasonForFailure && (
                            <p className="text-red-500 dark:text-red-400 text-sm font-chinese mt-1">{record.reasonForFailure}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-slate-400 text-sm font-mono mb-1">
                          {record.completedAt.toLocaleDateString('zh-CN')}
                        </p>
                        <div className="flex items-center space-x-2 text-gray-400 dark:text-slate-500 text-sm">
                          <Clock size={14} />
                          <span className="font-mono">{formatTime(record.duration)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full border border-gray-200/60 dark:border-slate-600/60 shadow-2xl animate-scale-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="text-2xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-3">确认删除链条</h3>
                <p className="text-gray-600 dark:text-slate-300 mb-6 font-chinese">
                  你确定要删除链条 "<span className="text-primary-500 font-semibold">{chain.name}</span>" 吗？
                </p>
              </div>
              
              <div className="bg-red-50/80 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200/60 dark:border-red-800/40 mb-8">
                <div className="text-center mb-6">
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium font-chinese">
                    ⚠️ 此操作将永久删除以下数据：
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm">
                  <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                    <div className="font-semibold mb-3 flex items-center font-chinese">
                      <div className="w-6 h-6 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mr-2">
                        <Flame size={16} />
                      </div>
                      主链数据
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                      <div className="font-mono">记录: #{chain.currentStreak}</div>
                      <div className="font-mono">完成: {chain.totalCompletions}</div>
                      <div className="font-mono">失败: {chain.totalFailures}</div>
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                    <div className="font-semibold mb-3 flex items-center font-chinese">
                      <div className="w-6 h-6 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mr-2">
                        <Calendar size={16} />
                      </div>
                      预约链数据
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                      <div className="font-mono">记录: #{chain.auxiliaryStreak}</div>
                      <div className="font-mono">失败: {chain.auxiliaryFailures}</div>
                      <div className="font-chinese">例外: {chain.auxiliaryExceptions?.length || 0} 条</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm mt-4">
                  <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                    <div className="font-semibold mb-3 flex items-center font-chinese">
                      <div className="w-6 h-6 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mr-2">
                        <Clock size={16} />
                      </div>
                      历史记录
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                      <div className="font-mono">记录: {chainHistory.length} 条</div>
                      <div className="font-mono">成功率: {successRate}%</div>
                      <div className="font-chinese">时间统计</div>
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                    <div className="font-semibold mb-3 flex items-center font-chinese">
                      <div className="w-6 h-6 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mr-2">
                        <AlertCircle size={16} />
                      </div>
                      规则设置
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                      <div className="font-mono">例外: {chain.exceptions.length} 条</div>
                      <div className="font-mono">预约例外: {chain.auxiliaryExceptions?.length || 0} 条</div>
                      <div className="font-chinese">所有配置</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl font-chinese"
                >
                  <Trash2 size={16} />
                  <span>确认删除</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChainDetail;