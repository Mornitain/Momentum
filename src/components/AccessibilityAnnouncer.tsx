import React, { useEffect, useRef } from 'react';

interface AccessibilityAnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
  onAnnounced?: () => void;
}

/**
 * Component for announcing theme changes to screen readers
 */
const AccessibilityAnnouncer: React.FC<AccessibilityAnnouncerProps> = ({
  message,
  priority = 'polite',
  onAnnounced,
}) => {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && announcerRef.current) {
      // Clear previous message
      announcerRef.current.textContent = '';
      
      // Set new message after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
          onAnnounced?.();
        }
      }, 100);
    }
  }, [message, onAnnounced]);

  return (
    <div
      ref={announcerRef}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    />
  );
};

/**
 * Hook for announcing theme changes
 */
export const useThemeAnnouncer = () => {
  const [announcement, setAnnouncement] = React.useState('');

  const announceThemeChange = (theme: 'light' | 'dark' | 'system') => {
    const messages = {
      light: '已切换到浅色模式',
      dark: '已切换到深色模式',
      system: '已切换到跟随系统模式',
    };
    
    setAnnouncement(messages[theme]);
  };

  const clearAnnouncement = () => {
    setAnnouncement('');
  };

  return {
    announcement,
    announceThemeChange,
    clearAnnouncement,
  };
};

export default AccessibilityAnnouncer;