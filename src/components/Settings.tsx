import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings as SettingsIcon, Edit2, Check, Headphones, Code, BookOpen, Dumbbell, Coffee, Target, Clock, Bell } from 'lucide-react';

interface CustomTemplate {
  id: string;
  text: string;
  type: 'trigger' | 'signal';
  isDefault?: boolean; // 标记是否为默认模板
  icon?: any; // 可选的图标
  color?: string; // 可选的颜色
}

interface SettingsProps {
  onClose: () => void;
}

// 默认触发器模板
const DEFAULT_TRIGGER_TEMPLATES: CustomTemplate[] = [
  { id: 'default_trigger_1', text: '戴上降噪耳机', type: 'trigger', isDefault: true, icon: Headphones, color: 'text-primary-500' },
  { id: 'default_trigger_2', text: '打开编程软件', type: 'trigger', isDefault: true, icon: Code, color: 'text-green-500' },
  { id: 'default_trigger_3', text: '坐到书房书桌前', type: 'trigger', isDefault: true, icon: BookOpen, color: 'text-blue-500' },
  { id: 'default_trigger_4', text: '换上运动服', type: 'trigger', isDefault: true, icon: Dumbbell, color: 'text-red-500' },
  { id: 'default_trigger_5', text: '准备一杯咖啡', type: 'trigger', isDefault: true, icon: Coffee, color: 'text-yellow-500' },
];

// 默认信号模板
const DEFAULT_SIGNAL_TEMPLATES: CustomTemplate[] = [
  { id: 'default_signal_1', text: '打响指', type: 'signal', isDefault: true, icon: Target, color: 'text-primary-500' },
  { id: 'default_signal_2', text: '设置手机闹钟', type: 'signal', isDefault: true, icon: Clock, color: 'text-green-500' },
  { id: 'default_signal_3', text: '按桌上的铃铛', type: 'signal', isDefault: true, icon: Bell, color: 'text-blue-500' },
  { id: 'default_signal_4', text: '说"开始预约"', type: 'signal', isDefault: true, icon: Coffee, color: 'text-yellow-500' },
];

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [allTriggers, setAllTriggers] = useState<CustomTemplate[]>([]);
  const [allSignals, setAllSignals] = useState<CustomTemplate[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [newSignal, setNewSignal] = useState('');
  const [editingTrigger, setEditingTrigger] = useState<{ id: string; text: string } | null>(null);
  const [editingSignal, setEditingSignal] = useState<{ id: string; text: string } | null>(null);

  // 调试用
  useEffect(() => {
    console.log('Settings component mounted');
  }, []);

  // 从localStorage加载自定义模板，合并默认模板
  useEffect(() => {
    const loadTemplates = () => {
      // 加载已保存的默认模板修改
      const savedDefaultTriggers = localStorage.getItem('defaultTriggers');
      const savedDefaultSignals = localStorage.getItem('defaultSignals');
      
      // 加载自定义模板
      const savedCustomTriggers = localStorage.getItem('customTriggers');
      const savedCustomSignals = localStorage.getItem('customSignals');
      
      // 合并默认模板和自定义模板
      let triggers = [...DEFAULT_TRIGGER_TEMPLATES];
      let signals = [...DEFAULT_SIGNAL_TEMPLATES];
      
      // 如果有已保存的默认模板修改，使用它们，但需要恢复图标引用
      if (savedDefaultTriggers) {
        const defaultTriggers = JSON.parse(savedDefaultTriggers);
        triggers = triggers.map(t => {
          const saved = defaultTriggers.find((st: CustomTemplate) => st.id === t.id);
          if (saved) {
            // 恢复图标引用
            return { ...saved, icon: t.icon, color: t.color };
          }
          return t;
        });
      }
      
      if (savedDefaultSignals) {
        const defaultSignals = JSON.parse(savedDefaultSignals);
        signals = signals.map(s => {
          const saved = defaultSignals.find((ss: CustomTemplate) => ss.id === s.id);
          if (saved) {
            // 恢复图标引用
            return { ...saved, icon: s.icon, color: s.color };
          }
          return s;
        });
      }
      
      // 添加自定义模板
      if (savedCustomTriggers) {
        const customTriggers = JSON.parse(savedCustomTriggers);
        triggers = [...triggers, ...customTriggers];
      }
      
      if (savedCustomSignals) {
        const customSignals = JSON.parse(savedCustomSignals);
        signals = [...signals, ...customSignals];
      }
      
      setAllTriggers(triggers);
      setAllSignals(signals);
    };
    
    loadTemplates();
  }, []);

  // 保存到localStorage
  const saveToStorage = (triggers: CustomTemplate[], signals: CustomTemplate[]) => {
    // 分离默认和自定义模板
    const defaultTriggers = triggers.filter(t => t.isDefault);
    const customTriggers = triggers.filter(t => !t.isDefault);
    const defaultSignals = signals.filter(s => s.isDefault);
    const customSignals = signals.filter(s => !s.isDefault);
    
    // 保存修改过的默认模板（移除图标引用，因为函数不能序列化）
    const defaultTriggersToSave = defaultTriggers.map(({ icon, color, ...rest }) => rest);
    const defaultSignalsToSave = defaultSignals.map(({ icon, color, ...rest }) => rest);
    
    localStorage.setItem('defaultTriggers', JSON.stringify(defaultTriggersToSave));
    localStorage.setItem('defaultSignals', JSON.stringify(defaultSignalsToSave));
    
    // 保存自定义模板
    localStorage.setItem('customTriggers', JSON.stringify(customTriggers));
    localStorage.setItem('customSignals', JSON.stringify(customSignals));
  };

  const addCustomTrigger = () => {
    if (!newTrigger.trim()) return;
    
    const newTemplate: CustomTemplate = {
      id: `custom_trigger_${Date.now()}`,
      text: newTrigger.trim(),
      type: 'trigger',
      isDefault: false
    };
    
    const updated = [...allTriggers, newTemplate];
    setAllTriggers(updated);
    saveToStorage(updated, allSignals);
    setNewTrigger('');
  };

  const addCustomSignal = () => {
    if (!newSignal.trim()) return;
    
    const newTemplate: CustomTemplate = {
      id: `custom_signal_${Date.now()}`,
      text: newSignal.trim(),
      type: 'signal',
      isDefault: false
    };
    
    const updated = [...allSignals, newTemplate];
    setAllSignals(updated);
    saveToStorage(allTriggers, updated);
    setNewSignal('');
  };

  const deleteTrigger = (id: string) => {
    const updated = allTriggers.filter(t => t.id !== id);
    setAllTriggers(updated);
    saveToStorage(updated, allSignals);
  };

  const deleteSignal = (id: string) => {
    const updated = allSignals.filter(s => s.id !== id);
    setAllSignals(updated);
    saveToStorage(allTriggers, updated);
  };

  const startEditTrigger = (trigger: CustomTemplate) => {
    setEditingTrigger({ id: trigger.id, text: trigger.text });
  };

  const startEditSignal = (signal: CustomTemplate) => {
    setEditingSignal({ id: signal.id, text: signal.text });
  };

  const saveEditTrigger = () => {
    if (!editingTrigger || !editingTrigger.text.trim()) return;
    
    const updated = allTriggers.map(t => 
      t.id === editingTrigger.id 
        ? { ...t, text: editingTrigger.text.trim() }
        : t
    );
    setAllTriggers(updated);
    saveToStorage(updated, allSignals);
    setEditingTrigger(null);
  };

  const saveEditSignal = () => {
    if (!editingSignal || !editingSignal.text.trim()) return;
    
    const updated = allSignals.map(s => 
      s.id === editingSignal.id 
        ? { ...s, text: editingSignal.text.trim() }
        : s
    );
    setAllSignals(updated);
    saveToStorage(allTriggers, updated);
    setEditingSignal(null);
  };

  const cancelEdit = () => {
    setEditingTrigger(null);
    setEditingSignal(null);
  };

  const resetToDefaults = () => {
    if (confirm('确定要重置为默认设置吗？这将删除所有自定义内容。')) {
      // 清除所有保存的数据
      localStorage.removeItem('defaultTriggers');
      localStorage.removeItem('defaultSignals');
      localStorage.removeItem('customTriggers');
      localStorage.removeItem('customSignals');
      
      // 重新加载默认数据
      setAllTriggers([...DEFAULT_TRIGGER_TEMPLATES]);
      setAllSignals([...DEFAULT_SIGNAL_TEMPLATES]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="text-primary-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-chinese">
              自定义设置
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
          {/* 自定义神圣座位触发器 */}
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-chinese mb-2">
                触发器管理
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-chinese">
                编辑默认触发器或添加您的自定义触发器
              </p>
            </div>
            
            {/* 添加新触发器 */}
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder="例如：打开IDE、整理桌面..."
                className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm font-chinese focus:outline-none focus:border-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && addCustomTrigger()}
              />
              <button
                onClick={addCustomTrigger}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center space-x-2"
              >
                <Plus size={16} />
                <span className="font-chinese">添加</span>
              </button>
            </div>

            {/* 触发器列表 */}
            <div className="space-y-2">
              {allTriggers.map((trigger) => (
                <div key={trigger.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2">
                  {editingTrigger?.id === trigger.id ? (
                    <>
                      <input
                        type="text"
                        value={editingTrigger.text}
                        onChange={(e) => setEditingTrigger({ id: editingTrigger.id, text: e.target.value })}
                        className="flex-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-1 text-gray-900 dark:text-white font-chinese focus:outline-none focus:border-primary-500"
                        onKeyPress={(e) => e.key === 'Enter' && saveEditTrigger()}
                        autoFocus
                      />
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={saveEditTrigger}
                          className="text-green-500 hover:text-green-700 transition-colors"
                          title="保存"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="取消"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3">
                        {trigger.icon && typeof trigger.icon === 'function' && 
                          React.createElement(trigger.icon, { size: 16, className: trigger.color })
                        }
                        <span className="text-gray-900 dark:text-white font-chinese">
                          {trigger.text}
                          {trigger.isDefault && <span className="text-xs text-blue-500 ml-2">(默认)</span>}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEditTrigger(trigger)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTrigger(trigger.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {allTriggers.length === 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-blue-700 dark:text-blue-300 text-sm font-chinese mb-2">
                    📝 还没有触发器
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-xs font-chinese">
                    添加触发器后，您可以点击 ✏️ 编辑或 🗑️ 删除自定义项目
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 自定义预约信号 */}
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-chinese mb-2">
                预约信号管理
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-chinese">
                编辑默认预约信号或添加您的自定义信号
              </p>
            </div>
            
            {/* 添加新信号 */}
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={newSignal}
                onChange={(e) => setNewSignal(e.target.value)}
                placeholder="例如：拍手三次、敲桌子..."
                className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm font-chinese focus:outline-none focus:border-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && addCustomSignal()}
              />
              <button
                onClick={addCustomSignal}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center space-x-2"
              >
                <Plus size={16} />
                <span className="font-chinese">添加</span>
              </button>
            </div>

            {/* 信号列表 */}
            <div className="space-y-2">
              {allSignals.map((signal) => (
                <div key={signal.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2">
                  {editingSignal?.id === signal.id ? (
                    <>
                      <input
                        type="text"
                        value={editingSignal.text}
                        onChange={(e) => setEditingSignal({ id: editingSignal.id, text: e.target.value })}
                        className="flex-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-1 text-gray-900 dark:text-white font-chinese focus:outline-none focus:border-primary-500"
                        onKeyPress={(e) => e.key === 'Enter' && saveEditSignal()}
                        autoFocus
                      />
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={saveEditSignal}
                          className="text-green-500 hover:text-green-700 transition-colors"
                          title="保存"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="取消"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3">
                        {signal.icon && typeof signal.icon === 'function' && 
                          React.createElement(signal.icon, { size: 16, className: signal.color })
                        }
                        <span className="text-gray-900 dark:text-white font-chinese">
                          {signal.text}
                          {signal.isDefault && <span className="text-xs text-blue-500 ml-2">(默认)</span>}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEditSignal(signal)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteSignal(signal.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {allSignals.length === 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-blue-700 dark:text-blue-300 text-sm font-chinese mb-2">
                    📝 还没有预约信号
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-xs font-chinese">
                    添加信号后，您可以点击 ✏️ 编辑或 🗑️ 删除自定义项目
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
        </div>

        {/* Footer - 固定在底部 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex space-x-4">
            <button
              onClick={resetToDefaults}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors font-chinese"
            >
              重置为默认
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-medium transition-colors font-chinese"
            >
              完成设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
