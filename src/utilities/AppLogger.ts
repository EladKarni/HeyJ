/**
 * Centralized logging system for HeyJ app
 * Replaces all console statements with structured, conditional logging
 * Performance optimized with development-only execution
 */

interface LogData {
  [key: string]: any;
}

class AppLogger {
  private static isDevelopment = __DEV__;
  
  /**
   * Debug logging - only executes in development
   * Optimized for performance with conditional execution
   */
  static debug(message: string, data?: LogData): void {
    if (!this.isDevelopment) return;
    
    // Efficient logging with minimal object creation
    if (data) {
      console.debug(`🔍 ${message}`, data);
    } else {
      console.debug(`🔍 ${message}`);
    }
  }
  
  /**
   * Info logging - only executes in development
   */
  static info(message: string, data?: LogData): void {
    if (!this.isDevelopment) return;
    
    if (data) {
      console.info(`ℹ️ ${message}`, data);
    } else {
      console.info(`ℹ️ ${message}`);
    }
  }
  
  /**
   * Warning logging - always executes but with development details
   */
  static warn(message: string, data?: LogData): void {
    if (this.isDevelopment && data) {
      console.warn(`⚠️ ${message}`, data);
    } else {
      console.warn(`⚠️ ${message}`);
    }
  }
  
  /**
   * Critical logging - ALWAYS logs (both dev and production)
   */
  static critical(message: string, data?: LogData): void {
    const logData = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    console.error(`🚨 CRITICAL: ${message}`, logData);
    
    // Store critical logs in AsyncStorage for production debugging
    try {
      this.storeCriticalLog(message, logData);
    } catch (e) {
      console.error('Failed to store critical log:', e);
    }
  }

  /**
   * Error logging - development details + production monitoring
   */
  static error(message: string, error?: Error | LogData): void {
    // Always log errors in development with full details
    if (this.isDevelopment) {
      if (error instanceof Error) {
        console.error(`❌ ${message}`, {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      } else if (error) {
        console.error(`❌ ${message}`, error);
      } else {
        console.error(`❌ ${message}`);
      }
    } else {
      // Production: log minimal info and send to monitoring
      console.error(`❌ ${message}`);
      
      if (error instanceof Error) {
        this.sendToErrorTracking(message, error);
      }
    }
  }
  
  /**
   * Audio-specific logging for performance monitoring
   */
  static audio(message: string, data?: LogData): void {
    if (!this.isDevelopment) return;
    
    if (data) {
      console.debug(`🔊 ${message}`, data);
    } else {
      console.debug(`🔊 ${message}`);
    }
  }
  
  /**
   * Network/API logging for debugging requests
   */
  static network(message: string, data?: LogData): void {
    if (!this.isDevelopment) return;
    
    if (data) {
      console.debug(`🌐 ${message}`, data);
    } else {
      console.debug(`🌐 ${message}`);
    }
  }
  
  /**
   * Performance logging with timing
   */
  static performance(operation: string, startTime: number, data?: LogData): void {
    if (!this.isDevelopment) return;
    
    const duration = Date.now() - startTime;
    const performanceData = {
      operation,
      duration: `${duration}ms`,
      ...data
    };
    
    // Log slow operations (>100ms) as warnings
    if (duration > 100) {
      console.warn(`⏱️ Slow operation: ${operation}`, performanceData);
    } else {
      console.debug(`⏱️ ${operation}`, performanceData);
    }
  }
  
  /**
   * Memory usage tracking (development only)
   */
  static memory(context: string): void {
    if (!this.isDevelopment) return;
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.debug(`💾 Memory [${context}]`, {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
      });
    }
  }
  
  /**
   * Component lifecycle logging (development only)
   */
  static component(componentName: string, lifecycle: string, data?: LogData): void {
    if (!this.isDevelopment) return;
    
    if (data) {
      console.debug(`🔧 ${componentName}:${lifecycle}`, data);
    } else {
      console.debug(`🔧 ${componentName}:${lifecycle}`);
    }
  }
  
  /**
   * Security event logging (always enabled)
   */
  static security(message: string, data?: LogData): void {
    const securityData = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    console.warn(`🔒 ${message}`, securityData);
    
    // Send to security monitoring in production
    if (!this.isDevelopment) {
      this.sendToSecurityMonitoring(message, securityData);
    }
  }
  
  /**
   * Send errors to external monitoring service
   * Placeholder for Sentry, Bugsnag, etc.
   */
  private static sendToErrorTracking(message: string, error: Error): void {
    // Integration with error tracking service would go here
    // Example: Sentry.captureException(error, { tags: { context: message } });
    
    // For now, store critical errors locally
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      };
      
      // Store in AsyncStorage or send to service
      console.debug('Error tracking data:', errorLog);
    } catch (e) {
      console.error('Failed to send error to tracking service:', e);
    }
  }
  
  /**
   * Send security events to monitoring service
   */
  private static sendToSecurityMonitoring(message: string, data: LogData): void {
    // Integration with security monitoring would go here
    // Example: securityService.logEvent(message, data);
    
    try {
      const securityLog = {
        timestamp: new Date().toISOString(),
        event: message,
        data
      };
      
      console.debug('Security monitoring data:', securityLog);
    } catch (e) {
      console.error('Failed to send security event to monitoring:', e);
    }
  }

  /**
   * Store critical logs in AsyncStorage for production debugging
   */
  private static async storeCriticalLog(message: string, data: LogData): Promise<void> {
    try {
      // Note: This would require AsyncStorage import, but for now use localStorage for web
      const storageKey = 'critical_logs';
      const maxLogs = 50;
      
      let logs: any[] = [];
      
      if (typeof window !== 'undefined' && window.localStorage) {
        const existingLogs = localStorage.getItem(storageKey);
        if (existingLogs) {
          logs = JSON.parse(existingLogs);
        }
        
        // Add new log
        logs.push({
          timestamp: new Date().toISOString(),
          message,
          data
        });
        
        // Keep only last maxLogs
        if (logs.length > maxLogs) {
          logs = logs.slice(-maxLogs);
        }
        
        localStorage.setItem(storageKey, JSON.stringify(logs));
      }
    } catch (e) {
      console.error('Failed to store critical log:', e);
    }
  }

  /**
   * Retrieve stored critical logs
   */
  static async getCriticalLogs(): Promise<any[]> {
    try {
      const storageKey = 'critical_logs';
      
      if (typeof window !== 'undefined' && window.localStorage) {
        const logs = localStorage.getItem(storageKey);
        return logs ? JSON.parse(logs) : [];
      }
      
      return [];
    } catch (e) {
      console.error('Failed to retrieve critical logs:', e);
      return [];
    }
  }

  /**
   * Clear stored critical logs
   */
  static async clearCriticalLogs(): Promise<void> {
    try {
      const storageKey = 'critical_logs';
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.error('Failed to clear critical logs:', e);
    }
  }
  
  /**
   * Performance metrics for monitoring
   */
  static getMetrics() {
    if (!this.isDevelopment) return null;
    
    return {
      loggingEnabled: true,
      environment: 'development',
      memoryFootprint: this.memory('metrics-check')
    };
  }
}

export default AppLogger;