export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 新增：格式化精确到秒的专注时间
export const formatFocusTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
};

// 新增：格式化专注时间为简洁版本
export const formatFocusTimeCompact = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h${minutes}m${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export const getTimeRemaining = (expiresAt: Date): number => {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
};

export const isSessionExpired = (expiresAt: Date): boolean => {
  return Date.now() > expiresAt.getTime();
};