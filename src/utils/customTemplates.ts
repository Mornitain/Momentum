import { FileText, Headphones, Code, BookOpen, Dumbbell, Coffee, Target, Clock, Bell } from 'lucide-react';

interface CustomTemplate {
  id: string;
  text: string;
  type: 'trigger' | 'signal';
  isDefault?: boolean;
  icon?: any;
  color?: string;
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

export const getAllTriggers = (): CustomTemplate[] => {
  // 获取默认模板的修改
  const savedDefaultTriggers = localStorage.getItem('defaultTriggers');
  let triggers = [...DEFAULT_TRIGGER_TEMPLATES];
  
  if (savedDefaultTriggers) {
    const defaultTriggers = JSON.parse(savedDefaultTriggers);
    triggers = triggers.map(t => {
      const saved = defaultTriggers.find((st: CustomTemplate) => st.id === t.id);
      return saved || t;
    });
  }
  
  // 添加自定义触发器
  const customTriggers = localStorage.getItem('customTriggers');
  if (customTriggers) {
    triggers = [...triggers, ...JSON.parse(customTriggers)];
  }
  
  return triggers;
};

export const getAllSignals = (): CustomTemplate[] => {
  // 获取默认模板的修改
  const savedDefaultSignals = localStorage.getItem('defaultSignals');
  let signals = [...DEFAULT_SIGNAL_TEMPLATES];
  
  if (savedDefaultSignals) {
    const defaultSignals = JSON.parse(savedDefaultSignals);
    signals = signals.map(s => {
      const saved = defaultSignals.find((ss: CustomTemplate) => ss.id === s.id);
      return saved || s;
    });
  }
  
  // 添加自定义信号
  const customSignals = localStorage.getItem('customSignals');
  if (customSignals) {
    signals = [...signals, ...JSON.parse(customSignals)];
  }
  
  return signals;
};

export const getCustomTriggers = (): CustomTemplate[] => {
  const saved = localStorage.getItem('customTriggers');
  return saved ? JSON.parse(saved) : [];
};

export const getCustomSignals = (): CustomTemplate[] => {
  const saved = localStorage.getItem('customSignals');
  return saved ? JSON.parse(saved) : [];
};

export const getCustomTriggersForTemplates = () => {
  const allTriggers = getAllTriggers();
  return allTriggers.map(trigger => ({
    icon: trigger.icon || FileText,
    text: trigger.text,
    color: trigger.color || 'text-purple-500'
  }));
};

export const getCustomSignalsForTemplates = () => {
  const allSignals = getAllSignals();
  return allSignals.map(signal => ({
    icon: signal.icon || FileText,
    text: signal.text,
    color: signal.color || 'text-purple-500'
  }));
};
