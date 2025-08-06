import React, { useState, useRef } from 'react';
import { Chain } from '../types';
import { 
  exportSingleChain, 
  exportBulkChains, 
  exportFullArchive,
  detectImportType,
  validateImportData,
  processImportedChains,
  processImportedSettings,
  ExportData
} from '../utils/importExport';
import { 
  Download, 
  Upload, 
  FileText, 
  Archive, 
  X,
  HelpCircle
} from 'lucide-react';

interface ImportExportProps {
  chains: Chain[];
  onImportChains: (chains: Chain[], replace?: boolean) => void;
  onClose: () => void;
}

const ImportExport: React.FC<ImportExportProps> = ({
  chains,
  onImportChains,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importPreview, setImportPreview] = useState<{
    type: ExportData['type'] | null;
    chains: Chain[];
    hasSettings: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导出功能
  const handleExportSelected = () => {
    const selectedChainObjects = chains.filter(chain => selectedChains.includes(chain.id));
    
    if (selectedChainObjects.length === 0) {
      alert('请选择要导出的链条');
      return;
    }

    if (selectedChainObjects.length === 1) {
      exportSingleChain(selectedChainObjects[0]);
    } else {
      exportBulkChains(selectedChainObjects);
    }
  };

  const handleExportAll = () => {
    if (chains.length === 0) {
      alert('没有链条可以导出');
      return;
    }
    exportBulkChains(chains);
  };

  const handleExportArchive = () => {
    if (chains.length === 0) {
      alert('没有链条可以导出');
      return;
    }
    exportFullArchive(chains);
    setShowArchiveConfirm(false);
  };

  // 导入功能
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const type = detectImportType(content);
        
        if (!type) {
          alert('无法识别的文件格式。请确保导入正确的导出文件。');
          return;
        }

        const data = JSON.parse(content);
        
        if (!validateImportData(data, type)) {
          alert('文件数据验证失败。文件可能已损坏或格式不正确。');
          return;
        }

        const importedChains = processImportedChains(data, type);
        
        setImportPreview({
          type,
          chains: importedChains,
          hasSettings: type === 'full_archive' && !!data.settings
        });

      } catch (error) {
        console.error('Import error:', error);
        alert('导入文件时发生错误。请检查文件格式是否正确。');
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const confirmImport = () => {
    if (!importPreview) return;

    const fileInput = fileInputRef.current;
    const file = fileInput?.files?.[0];
    
    if (importPreview.type === 'full_archive' && file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          if (importMode === 'replace') {
            // 替换模式：只清空链条数据，设置数据由 processImportedSettings 处理
            // 这里不需要 localStorage.clear() 因为设置项有专门的替换逻辑
          }
          
          // 导入设置（传递导入模式）
          processImportedSettings(data, importMode);
          
          // 导入链条（在设置导入完成后）
          if (importMode === 'replace') {
            // 完全替换现有链条
            onImportChains(importPreview.chains, true);
          } else {
            // 合并链条
            onImportChains(importPreview.chains, false);
          }

          const settingsText = importPreview.hasSettings ? '和设置' : '';
          alert(`成功导入 ${importPreview.chains.length} 条链条${settingsText}！`);
          setImportPreview(null);
          onClose();
          
        } catch (error) {
          console.error('Import settings error:', error);
          alert('导入设置时发生错误');
        }
      };
      reader.readAsText(file);
    } else {
      // 导入普通链条文件（不包含设置）
      if (importMode === 'replace') {
        // 完全替换现有链条
        onImportChains(importPreview.chains, true);
      } else {
        // 合并链条
        onImportChains(importPreview.chains, false);
      }

      alert(`成功导入 ${importPreview.chains.length} 条链条！`);
      setImportPreview(null);
      onClose();
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
  };

  const toggleChainSelection = (chainId: string) => {
    setSelectedChains(prev => 
      prev.includes(chainId) 
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };

  const selectAllChains = () => {
    setSelectedChains(chains.map(chain => chain.id));
  };

  const clearSelection = () => {
    setSelectedChains([]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-600 shadow-2xl">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".json"
        />

        {/* Header */}
        <div className="p-8 pb-0 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                <Archive className="text-primary-500" size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-white">
                  导入/导出
                </h2>
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400 tracking-wider">
                  IMPORT / EXPORT
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                activeTab === 'export'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Download size={18} />
              <span className="font-chinese">导出</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                activeTab === 'import'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Upload size={18} />
              <span className="font-chinese">导入</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          {activeTab === 'export' ? (
            <div className="space-y-8">
              {chains.length === 0 ? (
                <div className="text-center py-12">
                  <Archive size={48} className="mx-auto mb-4 text-gray-400 opacity-50" />
                  <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-white mb-2">
                    暂无数据可导出
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 font-chinese">
                    创建一些链条后就可以导出了
                  </p>
                </div>
              ) : (
                <>
                  {/* Export chains section */}
                  <div>
                    <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <FileText size={20} />
                      <span>链条导出</span>
                    </h3>
                    
                    {/* Chain selection */}
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-2xl p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium font-chinese text-gray-900 dark:text-white">
                          选择要导出的链条 ({selectedChains.length}/{chains.length})
                        </h4>
                        <div className="space-x-2">
                          <button
                            onClick={selectAllChains}
                            className="text-sm text-blue-500 hover:text-blue-600 font-chinese"
                          >
                            全选
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button
                            onClick={clearSelection}
                            className="text-sm text-gray-500 hover:text-gray-600 font-chinese"
                          >
                            清空
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                        {chains.map((chain) => (
                          <label
                            key={chain.id}
                            className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedChains.includes(chain.id)}
                              onChange={() => toggleChainSelection(chain.id)}
                              className="w-4 h-4 text-blue-500 focus:ring-blue-500 focus:ring-2 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium font-chinese text-gray-900 dark:text-white truncate">
                                {chain.name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                                {chain.trigger}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Export buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <button
                        onClick={handleExportSelected}
                        disabled={selectedChains.length === 0}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 disabled:hover:scale-100 shadow-lg font-chinese"
                      >
                        <Download size={20} />
                        <span>导出选中的链条</span>
                      </button>
                      
                      <button
                        onClick={handleExportAll}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 shadow-lg font-chinese"
                      >
                        <Archive size={20} />
                        <span>导出全部链条</span>
                      </button>
                    </div>
                  </div>

                  {/* Archive export section */}
                  <div className="border-t border-gray-200 dark:border-slate-600 pt-8">
                    <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Archive size={20} />
                      <span>完整档案导出</span>
                    </h3>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-700 mb-6">
                      <div className="flex items-start space-x-3">
                        <HelpCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="font-medium font-chinese text-yellow-800 dark:text-yellow-200 mb-2">
                            什么是完整档案？
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed font-chinese">
                            完整档案包含您的所有链条数据以及自定义设置，包括：
                          </p>
                          <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1 font-chinese">
                            <li>• 所有链条及其历史记录</li>
                            <li>• 自定义神圣座位触发器</li>
                            <li>• 自定义预约信号</li>
                            <li>• 默认模板的修改</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 shadow-lg font-chinese"
                    >
                      <Archive size={20} />
                      <span>导出完整档案</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Import section */}
              <div>
                <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <Upload size={20} />
                  <span>导入数据</span>
                </h3>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700 mb-6">
                  <div className="flex items-start space-x-3">
                    <HelpCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-medium font-chinese text-blue-800 dark:text-blue-200 mb-2">
                        支持的导入格式
                      </h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 font-chinese">
                        <li>• 单个链条导出文件</li>
                        <li>• 批量链条导出文件</li>
                        <li>• 完整档案文件（包含设置）</li>
                        <li>• 旧版本的链条导出文件</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleImportClick}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 shadow-lg font-chinese"
                >
                  <Upload size={20} />
                  <span>选择导入文件</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Archive confirmation modal */}
        {showArchiveConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-600">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                  <Archive className="text-purple-500" size={32} />
                </div>
                <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-white mb-2">
                  确认导出完整档案
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-chinese">
                  这将导出您的所有链条数据和自定义设置。该文件可以用于备份或迁移到其他设备。
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium transition-colors font-chinese"
                >
                  取消
                </button>
                <button
                  onClick={handleExportArchive}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-xl font-medium transition-colors font-chinese"
                >
                  确认导出
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import preview modal */}
        {importPreview && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-slate-600">
              <div className="p-6 border-b border-gray-200 dark:border-slate-600">
                <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-white mb-2">
                  导入预览
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-chinese">
                  请确认导入的内容和处理方式
                </p>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* File info */}
                <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      importPreview.type === 'single_chain' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      importPreview.type === 'bulk_chains' ? 'bg-green-100 dark:bg-green-900/30' :
                      'bg-purple-100 dark:bg-purple-900/30'
                    }`}>
                      {importPreview.type === 'single_chain' ? (
                        <FileText className="text-blue-500" size={16} />
                      ) : importPreview.type === 'bulk_chains' ? (
                        <Archive className="text-green-500" size={16} />
                      ) : (
                        <Archive className="text-purple-500" size={16} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium font-chinese text-gray-900 dark:text-white">
                        {importPreview.type === 'single_chain' ? '单个链条' :
                         importPreview.type === 'bulk_chains' ? '批量链条' :
                         '完整档案'}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {importPreview.chains.length} 条链条
                        {importPreview.hasSettings && ' + 自定义设置'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chains preview */}
                <div className="mb-6">
                  <h4 className="font-medium font-chinese text-gray-900 dark:text-white mb-3">
                    将要导入的链条：
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importPreview.chains.map((chain, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-primary-500 font-mono text-sm">#{chain.currentStreak}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium font-chinese text-gray-900 dark:text-white truncate">
                            {chain.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                            {chain.trigger}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Import mode selection */}
                <div className="space-y-3">
                  <h4 className="font-medium font-chinese text-gray-900 dark:text-white">
                    导入方式：
                  </h4>
                  
                  <label className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                      className="mt-1 w-4 h-4 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <h5 className="font-medium font-chinese text-gray-900 dark:text-white">
                        合并模式（推荐）
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-chinese">
                        将导入的链条添加到现有数据中，设置项会与现有设置合并（不重复添加）
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                      className="mt-1 w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <div>
                      <h5 className="font-medium font-chinese text-gray-900 dark:text-white">
                        替换模式
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-chinese">
                        完全替换现有链条数据
                        {importPreview.hasSettings && '，设置项也会被完全替换'}
                        （谨慎使用）
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-slate-600 flex space-x-3">
                <button
                  onClick={cancelImport}
                  className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium transition-colors font-chinese"
                >
                  取消
                </button>
                <button
                  onClick={confirmImport}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-medium transition-colors font-chinese"
                >
                  确认导入
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExport;
