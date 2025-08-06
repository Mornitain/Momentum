import { useState, useEffect } from 'react';
import { AppState, Chain, ScheduledSession, ActiveSession, CompletionHistory, ExceptionRuleType, ExceptionRule } from './types';
import Dashboard from './components/Dashboard';
import AuthWrapper from './components/AuthWrapper';
import ChainEditor from './components/ChainEditor';
import FocusMode from './components/FocusMode';
import ChainDetail from './components/ChainDetail';
import AuxiliaryJudgment from './components/AuxiliaryJudgment';
import { storage as localStorageUtils } from './utils/storage';
import { supabaseStorage } from './utils/supabaseStorage';
import { getCurrentUser, isSupabaseConfigured } from './lib/supabase';
import { isSessionExpired } from './utils/time';

function App() {
  const [state, setState] = useState<AppState>({
    chains: [],
    scheduledSessions: [],
    activeSession: null,
    currentView: 'dashboard',
    editingChain: null,
    viewingChainId: null,
    completionHistory: [],
  });

  const [showAuxiliaryJudgment, setShowAuxiliaryJudgment] = useState<string | null>(null);

  // Determine which storage to use based on authentication
  const [storage, setStorage] = useState<typeof localStorageUtils | typeof supabaseStorage>(localStorageUtils);

  // Check if user is authenticated and switch to Supabase storage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 只有在 Supabase 配置正确时才检查认证
        if (isSupabaseConfigured) {
          const user = await getCurrentUser();
          if (user) {
            setStorage(supabaseStorage);
            return;
          }
        }
        
        // 回退到本地存储
        setStorage(localStorageUtils);
      } catch (error) {
        console.warn('Supabase not available, using localStorage:', error);
        setStorage(localStorageUtils);
      }
    };

    checkAuth();
  }, []);

  const renderContent = () => {
    if (!isSupabaseConfigured) {
      // 没有 Supabase 配置时，直接渲染内容，不需要认证
      return renderCurrentView();
    }
    
    // 有 Supabase 配置时，使用认证包装
    return (
      <AuthWrapper>
        {renderCurrentView()}
      </AuthWrapper>
    );
  };

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'editor':
        return (
          <>
            <ChainEditor
              chain={state.editingChain || undefined}
              isEditing={!!state.editingChain}
              onSave={handleSaveChain}
              onCancel={handleBackToDashboard}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );

      case 'focus': {
        const activeChain = state.chains.find(c => c.id === state.activeSession?.chainId);
        if (!state.activeSession || !activeChain) {
          handleBackToDashboard();
          return null;
        }
        return (
          <>
            <FocusMode
              session={state.activeSession}
              chain={activeChain}
              onComplete={handleCompleteSession}
              onInterrupt={handleInterruptSession}
              onAddException={handleAddException}
              onPause={handlePauseSession}
              onResume={handleResumeSession}
              onExtendTime={handleExtendTime}
              onCancelFocus={handleCancelFocus}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );
      }

      case 'detail': {
        const viewingChain = state.chains.find(c => c.id === state.viewingChainId);
        if (!viewingChain) {
          handleBackToDashboard();
          return null;
        }
        return (
          <>
            <ChainDetail
              chain={viewingChain}
              history={state.completionHistory}
              onBack={handleBackToDashboard}
              onEdit={() => handleEditChain(viewingChain.id)}
              onDelete={() => handleDeleteChain(viewingChain.id)}
              onUpdateExceptions={handleUpdateExceptions}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );
      }

      default:
        return (
          <>
            <Dashboard
              chains={state.chains}
              scheduledSessions={state.scheduledSessions}
              onCreateChain={handleCreateChain}
              onStartChain={handleStartChain}
              onScheduleChain={handleScheduleChain}
              onViewChainDetail={handleViewChainDetail}
              onCancelScheduledSession={handleCancelScheduledSession}
              onDeleteChain={handleDeleteChain}
              onExportChain={handleExportChain}
              onImportChains={handleImportChains}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );
    }
  };

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const chains = await storage.getChains();
        const allScheduledSessions = await storage.getScheduledSessions();
        const scheduledSessions = allScheduledSessions.filter(
          (session: ScheduledSession) => !isSessionExpired(session.expiresAt)
        );
        const activeSession = await storage.getActiveSession();
        const completionHistory = await storage.getCompletionHistory();

        setState(prev => ({
          ...prev,
          chains,
          scheduledSessions,
          activeSession,
          completionHistory,
          currentView: activeSession ? 'focus' : 'dashboard',
        }));

        // Clean up expired sessions
        if (scheduledSessions.length !== allScheduledSessions.length) {
          await storage.saveScheduledSessions(scheduledSessions);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    if (storage) {
      loadData();
    }
  }, [storage]);

  // Clean up expired scheduled sessions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const expiredSessions = prev.scheduledSessions.filter(
          session => isSessionExpired(session.expiresAt)
        );
        const activeScheduledSessions = prev.scheduledSessions.filter(
          session => !isSessionExpired(session.expiresAt)
        );
        
        if (expiredSessions.length > 0) {
          // Show auxiliary judgment for the first expired session
          setShowAuxiliaryJudgment(expiredSessions[0].chainId);
          storage.saveScheduledSessions(activeScheduledSessions);
          return { ...prev, scheduledSessions: activeScheduledSessions };
        }
        
        return prev;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [storage]);

  const handleCreateChain = () => {
    setState(prev => ({
      ...prev,
      currentView: 'editor',
      editingChain: null,
    }));
  };

  const handleEditChain = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (chain) {
      setState(prev => ({
        ...prev,
        currentView: 'editor',
        editingChain: chain,
      }));
    }
  };

  const handleSaveChain = async (chainData: Omit<Chain, 'id' | 'currentStreak' | 'auxiliaryStreak' | 'totalCompletions' | 'totalFailures' | 'auxiliaryFailures' | 'createdAt' | 'lastCompletedAt'>) => {
    setState(prev => {
      let updatedChains: Chain[];
      
      if (prev.editingChain) {
        // Editing existing chain
        updatedChains = prev.chains.map(chain =>
          chain.id === prev.editingChain!.id
            ? { ...chain, ...chainData }
            : chain
        );
      } else {
        // Creating new chain
        const newChain: Chain = {
          id: crypto.randomUUID(),
          ...chainData,
          currentStreak: 0,
          auxiliaryStreak: 0,
          totalCompletions: 0,
          totalFailures: 0,
          auxiliaryFailures: 0,
          createdAt: new Date(),
        };
        updatedChains = [...prev.chains, newChain];
      }
      
      storage.saveChains(updatedChains);
      
      return {
        ...prev,
        chains: updatedChains,
        currentView: 'dashboard',
        editingChain: null,
      };
    });
  };

  const handleScheduleChain = (chainId: string) => {
    // 检查是否已有该链的预约
    const existingSchedule = state.scheduledSessions.find(s => s.chainId === chainId);
    if (existingSchedule) return;

    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const scheduledSession: ScheduledSession = {
      chainId,
      scheduledAt: new Date(),
      expiresAt: new Date(Date.now() + chain.auxiliaryDuration * 60 * 1000), // Use chain's auxiliary duration
      auxiliarySignal: chain.auxiliarySignal,
    };

    setState(prev => {
      const updatedSessions = [...prev.scheduledSessions, scheduledSession];
      storage.saveScheduledSessions(updatedSessions);
      
      // 增加辅助链记录
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? { ...chain, auxiliaryStreak: chain.auxiliaryStreak + 1 }
          : chain
      );
      storage.saveChains(updatedChains);
      
      return { 
        ...prev, 
        scheduledSessions: updatedSessions,
        chains: updatedChains
      };
    });
  };

  const handleStartChain = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const activeSession: ActiveSession = {
      chainId,
      startedAt: new Date(),
      duration: chain.duration,
      isPaused: false,
      totalPausedTime: 0,
      ruleEffects: [], // 初始化规则效果记录
      originalDuration: chain.duration, // 保存原始时长
    };

    // Remove any scheduled session for this chain
    const updatedScheduledSessions = state.scheduledSessions.filter(
      session => session.chainId !== chainId
    );

    setState(prev => {
      storage.saveActiveSession(activeSession);
      storage.saveScheduledSessions(updatedScheduledSessions);
      
      return {
        ...prev,
        activeSession,
        scheduledSessions: updatedScheduledSessions,
        currentView: 'focus',
      };
    });
  };

  const handleCompleteSession = () => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    // 计算实际专注时长（排除暂停时间，精确到秒）
    const sessionEndTime = Date.now();
    const totalElapsedTime = sessionEndTime - state.activeSession.startedAt.getTime();
    const actualFocusTime = Math.max(0, totalElapsedTime - state.activeSession.totalPausedTime);
    const actualFocusTimeSeconds = Math.floor(actualFocusTime / 1000);

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.originalDuration || state.activeSession.duration, // 使用原始设定时长
      actualFocusTime: actualFocusTimeSeconds, // 实际专注时长（秒）
      wasSuccessful: true,
      ruleEffects: state.activeSession.ruleEffects || [], // 记录规则效果
    };

    setState(prev => {
      const updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: c.currentStreak + 1,
              totalCompletions: c.totalCompletions + 1,
              lastCompletedAt: new Date(),
            }
          : c
      );

      const updatedHistory = [...prev.completionHistory, completionRecord];
      
      storage.saveChains(updatedChains);
      storage.saveActiveSession(null);
      storage.saveCompletionHistory(updatedHistory);

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
  };

  const handleInterruptSession = (reason?: string) => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    // 计算实际专注时长（失败情况下仍记录实际时长）
    const sessionEndTime = Date.now();
    const totalElapsedTime = sessionEndTime - state.activeSession.startedAt.getTime();
    const actualFocusTime = Math.max(0, totalElapsedTime - state.activeSession.totalPausedTime);
    const actualFocusTimeSeconds = Math.floor(actualFocusTime / 1000);

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.originalDuration || state.activeSession.duration,
      actualFocusTime: actualFocusTimeSeconds,
      wasSuccessful: false,
      reasonForFailure: reason || '用户主动中断',
      ruleEffects: state.activeSession.ruleEffects || [],
    };

    setState(prev => {
      const updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: 0, // 重置主链连续次数
              auxiliaryStreak: 0, // 重置预约链连续次数
              totalCompletions: 0, // 重置完成次数
              totalFailures: 0, // 重置失败次数
              auxiliaryFailures: 0, // 重置预约链失败次数
              lastCompletedAt: undefined, // 清除最后完成时间
            }
          : c
      );

      const updatedHistory = [...prev.completionHistory, completionRecord];
      
      storage.saveChains(updatedChains);
      storage.saveActiveSession(null);
      storage.saveCompletionHistory(updatedHistory);

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
  };

  const handlePauseSession = async () => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: true,
        pausedAt: new Date(),
      };
      
      // 异步保存但不阻塞UI更新
      storage.saveActiveSession(updatedSession);
      
      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleResumeSession = async () => {
    if (!state.activeSession || !state.activeSession.pausedAt) return;

    setState(prev => {
      const pauseDuration = Date.now() - prev.activeSession!.pausedAt!.getTime();
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: false,
        pausedAt: undefined,
        totalPausedTime: prev.activeSession!.totalPausedTime + pauseDuration,
      };
      
      // 异步保存但不阻塞UI更新
      storage.saveActiveSession(updatedSession);
      
      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleExtendTime = async (extendMinutes: number) => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedSession = {
        ...prev.activeSession!,
        duration: prev.activeSession!.duration + extendMinutes, // duration 以分钟为单位
      };
      
      // 异步保存但不阻塞UI更新
      storage.saveActiveSession(updatedSession);
      
      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleCancelFocus = async () => {
    if (!state.activeSession) return;

    // 取消专注不记录任何数据，直接清除当前会话
    setState(prev => {
      // 清除active session存储
      storage.saveActiveSession(null);
      
      return {
        ...prev,
        activeSession: null,
        currentView: 'dashboard',
      };
    });
  };

  const handleAuxiliaryJudgmentFailure = (chainId: string, reason: string) => {
    console.log('Auxiliary judgment failure reason:', reason); // 记录失败原因用于调试
    setState(prev => {
      // Remove the scheduled session
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              auxiliaryStreak: 0, // Reset auxiliary streak
              auxiliaryFailures: chain.auxiliaryFailures + 1
            }
          : chain
      );
      
      storage.saveChains(updatedChains);
      storage.saveScheduledSessions(updatedScheduledSessions);
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });
    
    setShowAuxiliaryJudgment(null);
  };

  const handleAuxiliaryJudgmentAllow = (chainId: string, exceptionRule: string) => {
    setState(prev => {
      // Remove the scheduled session
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              auxiliaryExceptions: [...(chain.auxiliaryExceptions || []), exceptionRule]
            }
          : chain
      );
      
      storage.saveChains(updatedChains);
      storage.saveScheduledSessions(updatedScheduledSessions);
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });
    
    setShowAuxiliaryJudgment(null);
  };

  const handleCancelScheduledSession = (chainId: string) => {
    setShowAuxiliaryJudgment(chainId);
  };

  const handleAddException = (exceptionRule: { description: string; type: ExceptionRuleType; extendMinutes?: number }) => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedChains = prev.chains.map(chain =>
        chain.id === prev.activeSession!.chainId
          ? {
              ...chain,
              exceptions: [...(chain.exceptions || []), {
                id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                description: exceptionRule.description,
                type: exceptionRule.type,
                createdAt: new Date(),
                ...(exceptionRule.extendMinutes && { extendMinutes: exceptionRule.extendMinutes })
              }]
            }
          : chain
      );
      
      storage.saveChains(updatedChains);
      
      return {
        ...prev,
        chains: updatedChains,
      };
    });
  };

  const handleUpdateExceptions = (chainId: string, exceptions: ExceptionRule[], auxiliaryExceptions: string[]) => {
    setState(prev => {
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              exceptions,
              auxiliaryExceptions
            }
          : chain
      );
      
      storage.saveChains(updatedChains);
      
      return {
        ...prev,
        chains: updatedChains,
      };
    });
  };

  const handleViewChainDetail = (chainId: string) => {
    setState(prev => ({
      ...prev,
      currentView: 'detail',
      viewingChainId: chainId,
    }));
  };

  const handleBackToDashboard = () => {
    setState(prev => ({
      ...prev,
      currentView: 'dashboard',
      editingChain: null,
      viewingChainId: null,
    }));
  };

  const handleDeleteChain = (chainId: string) => {
    setState(prev => {
      // Remove the chain
      const updatedChains = prev.chains.filter(chain => chain.id !== chainId);
      
      // Remove any scheduled sessions for this chain
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      // Remove completion history for this chain
      const updatedHistory = prev.completionHistory.filter(
        history => history.chainId !== chainId
      );
      
      // If currently active session belongs to this chain, clear it
      const updatedActiveSession = prev.activeSession?.chainId === chainId 
        ? null 
        : prev.activeSession;
      
      // Save to storage
      storage.saveChains(updatedChains);
      storage.saveScheduledSessions(updatedScheduledSessions);
      storage.saveCompletionHistory(updatedHistory);
      if (!updatedActiveSession) {
        storage.saveActiveSession(null);
      }
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
        completionHistory: updatedHistory,
        activeSession: updatedActiveSession,
        currentView: updatedActiveSession ? prev.currentView : 'dashboard',
        viewingChainId: prev.viewingChainId === chainId ? null : prev.viewingChainId,
      };
    });
  };

  const handleExportChain = (chainId: string) => {
    const chainToExport = state.chains.find(c => c.id === chainId);
    if (!chainToExport) return;

    const dataStr = JSON.stringify(chainToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${chainToExport.name}_export.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportChains = (chains: Chain[], replace: boolean = false) => {
    setState(prev => {
      const updatedChains = replace ? chains : [...prev.chains, ...chains];
      storage.saveChains(updatedChains);

      return {
        ...prev,
        chains: updatedChains,
      };
    });
  };

  return renderContent();
}

export default App;