import { Chain } from '../types';

// 文件类型定义
export interface SingleChainExport {
  type: 'single_chain';
  version: '1.0';
  exportedAt: string;
  chain: Chain;
}

export interface BulkChainExport {
  type: 'bulk_chains';
  version: '1.0';
  exportedAt: string;
  chains: Chain[];
}

export interface ArchiveExport {
  type: 'full_archive';
  version: '1.0';
  exportedAt: string;
  chains: Chain[];
  settings: {
    customTriggers: any[];
    customSignals: any[];
    defaultTriggers: any[];
    defaultSignals: any[];
  };
}

export type ExportData = SingleChainExport | BulkChainExport | ArchiveExport;

// 导出单个链条
export const exportSingleChain = (chain: Chain): void => {
  const exportData: SingleChainExport = {
    type: 'single_chain',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    chain
  };

  downloadFile(exportData, `${chain.name}_链条导出.json`);
};

// 导出多个链条
export const exportBulkChains = (chains: Chain[]): void => {
  const exportData: BulkChainExport = {
    type: 'bulk_chains',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    chains
  };

  const fileName = chains.length === 1 
    ? `${chains[0].name}_链条导出.json`
    : `批量链条导出_${chains.length}条_${new Date().toISOString().split('T')[0]}.json`;
    
  downloadFile(exportData, fileName);
};

// 导出完整档案
export const exportFullArchive = (chains: Chain[]): void => {
  // 获取所有自定义设置
  const customTriggers = JSON.parse(localStorage.getItem('customTriggers') || '[]');
  const customSignals = JSON.parse(localStorage.getItem('customSignals') || '[]');
  const defaultTriggers = JSON.parse(localStorage.getItem('defaultTriggers') || '[]');
  const defaultSignals = JSON.parse(localStorage.getItem('defaultSignals') || '[]');

  const exportData: ArchiveExport = {
    type: 'full_archive',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    chains,
    settings: {
      customTriggers,
      customSignals,
      defaultTriggers,
      defaultSignals
    }
  };

  downloadFile(exportData, `Momentum完整档案_${new Date().toISOString().split('T')[0]}.json`);
};

// 下载文件的通用函数
const downloadFile = (data: any, filename: string): void => {
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', filename);
  linkElement.click();
};

// 检测导入文件类型
export const detectImportType = (fileContent: string): ExportData['type'] | null => {
  try {
    const data = JSON.parse(fileContent);
    
    if (data.type === 'single_chain' || data.type === 'bulk_chains' || data.type === 'full_archive') {
      return data.type;
    }
    
    // 向后兼容：检测旧格式的单个链条导出
    if (data.name && data.trigger && data.duration && !data.type) {
      return 'single_chain';
    }
    
    return null;
  } catch {
    return null;
  }
};

// 验证导入数据
export const validateImportData = (data: any, type: ExportData['type']): boolean => {
  try {
    switch (type) {
      case 'single_chain':
        if (data.chain) {
          // 新格式
          return validateChain(data.chain);
        } else {
          // 旧格式 - 直接是链条对象
          return validateChain(data);
        }
      
      case 'bulk_chains':
        return Array.isArray(data.chains) && data.chains.every(validateChain);
      
      case 'full_archive':
        return Array.isArray(data.chains) && 
               data.chains.every(validateChain) && 
               data.settings &&
               typeof data.settings === 'object';
      
      default:
        return false;
    }
  } catch {
    return false;
  }
};

// 验证单个链条
const validateChain = (chain: any): boolean => {
  return chain &&
         typeof chain.name === 'string' &&
         typeof chain.trigger === 'string' &&
         typeof chain.duration === 'number' &&
         chain.duration > 0;
};

// 处理导入的链条数据
export const processImportedChains = (data: any, type: ExportData['type']): Chain[] => {
  const now = new Date();
  
  const processChain = (chain: any): Chain => {
    return {
      ...chain,
      id: crypto.randomUUID(), // 生成新的ID避免冲突
      createdAt: now,
      lastCompletedAt: chain.lastCompletedAt ? new Date(chain.lastCompletedAt) : undefined,
      // 确保必要字段存在
      currentStreak: chain.currentStreak || 0,
      auxiliaryStreak: chain.auxiliaryStreak || 0,
      totalCompletions: chain.totalCompletions || 0,
      totalFailures: chain.totalFailures || 0,
      auxiliaryFailures: chain.auxiliaryFailures || 0,
      exceptions: chain.exceptions || [],
      auxiliaryExceptions: chain.auxiliaryExceptions || [],
      auxiliarySignal: chain.auxiliarySignal || '打响指',
      auxiliaryDuration: chain.auxiliaryDuration || 15,
      auxiliaryCompletionTrigger: chain.auxiliaryCompletionTrigger || chain.trigger,
    };
  };

  switch (type) {
    case 'single_chain':
      if (data.chain) {
        // 新格式
        return [processChain(data.chain)];
      } else {
        // 旧格式
        return [processChain(data)];
      }
    
    case 'bulk_chains':
      return data.chains.map(processChain);
    
    case 'full_archive':
      return data.chains.map(processChain);
    
    default:
      return [];
  }
};

// 处理导入的设置数据
export const processImportedSettings = (data: ArchiveExport, mode: 'merge' | 'replace' = 'merge'): void => {
  if (data.type !== 'full_archive' || !data.settings) return;

  const { customTriggers, customSignals, defaultTriggers, defaultSignals } = data.settings;

  if (mode === 'replace') {
    // 替换模式：直接覆盖现有设置
    if (customTriggers) {
      localStorage.setItem('customTriggers', JSON.stringify(customTriggers));
    }
    
    if (customSignals) {
      localStorage.setItem('customSignals', JSON.stringify(customSignals));
    }
    
    if (defaultTriggers) {
      localStorage.setItem('defaultTriggers', JSON.stringify(defaultTriggers));
    }
    
    if (defaultSignals) {
      localStorage.setItem('defaultSignals', JSON.stringify(defaultSignals));
    }
  } else {
    // 合并模式：将导入的设置与现有设置合并
    if (customTriggers) {
      const existingTriggers = JSON.parse(localStorage.getItem('customTriggers') || '[]');
      const mergedTriggers = [...existingTriggers];
      
      // 添加新的触发器，避免重复
      customTriggers.forEach((newTrigger: any) => {
        if (!mergedTriggers.some((existing: any) => existing === newTrigger || (typeof existing === 'object' && typeof newTrigger === 'object' && JSON.stringify(existing) === JSON.stringify(newTrigger)))) {
          mergedTriggers.push(newTrigger);
        }
      });
      
      localStorage.setItem('customTriggers', JSON.stringify(mergedTriggers));
    }
    
    if (customSignals) {
      const existingSignals = JSON.parse(localStorage.getItem('customSignals') || '[]');
      const mergedSignals = [...existingSignals];
      
      // 添加新的信号，避免重复
      customSignals.forEach((newSignal: any) => {
        if (!mergedSignals.some((existing: any) => existing === newSignal || (typeof existing === 'object' && typeof newSignal === 'object' && JSON.stringify(existing) === JSON.stringify(newSignal)))) {
          mergedSignals.push(newSignal);
        }
      });
      
      localStorage.setItem('customSignals', JSON.stringify(mergedSignals));
    }
    
    if (defaultTriggers) {
      const existingDefaultTriggers = JSON.parse(localStorage.getItem('defaultTriggers') || '[]');
      const mergedDefaultTriggers = [...existingDefaultTriggers];
      
      // 添加新的默认触发器，避免重复
      defaultTriggers.forEach((newTrigger: any) => {
        if (!mergedDefaultTriggers.some((existing: any) => existing === newTrigger || (typeof existing === 'object' && typeof newTrigger === 'object' && JSON.stringify(existing) === JSON.stringify(newTrigger)))) {
          mergedDefaultTriggers.push(newTrigger);
        }
      });
      
      localStorage.setItem('defaultTriggers', JSON.stringify(mergedDefaultTriggers));
    }
    
    if (defaultSignals) {
      const existingDefaultSignals = JSON.parse(localStorage.getItem('defaultSignals') || '[]');
      const mergedDefaultSignals = [...existingDefaultSignals];
      
      // 添加新的默认信号，避免重复
      defaultSignals.forEach((newSignal: any) => {
        if (!mergedDefaultSignals.some((existing: any) => existing === newSignal || (typeof existing === 'object' && typeof newSignal === 'object' && JSON.stringify(existing) === JSON.stringify(newSignal)))) {
          mergedDefaultSignals.push(newSignal);
        }
      });
      
      localStorage.setItem('defaultSignals', JSON.stringify(mergedDefaultSignals));
    }
  }
};
