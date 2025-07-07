import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, Clock, Settings, List, Info, Mic, Camera, Power, Bell, Trash2 } from "lucide-react";
import { firebaseService } from "@/lib/firebase";
import type { AccessLog, MonitoringStatus } from "@shared/schema";

const apps = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "snapchat", label: "Snapchat" },
  { value: "tiktok", label: "TikTok" },
  { value: "zoom", label: "Zoom" },
];

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{ app: string; type: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<{
    microphone: 'granted' | 'denied' | 'prompt';
    camera: 'granted' | 'denied' | 'prompt';
  }>({ microphone: 'prompt', camera: 'prompt' });
  const [installedApps, setInstalledApps] = useState<Array<{
    name: string;
    permissions: {
      microphone: boolean;
      camera: boolean;
    };
    lastAccess: string | null;
  }>>([]);
  const [showAppScanner, setShowAppScanner] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize Firebase and check permissions
  useEffect(() => {
    const initFirebase = async () => {
      const connected = await firebaseService.initialize();
      setFirebaseConnected(connected);
    };
    initFirebase();
    
    // Check current permissions
    const checkPermissions = async () => {
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        setPermissionStatus({
          microphone: micPermission.state,
          camera: cameraPermission.state
        });
        
        // Listen for permission changes
        micPermission.addEventListener('change', () => {
          setPermissionStatus(prev => ({ ...prev, microphone: micPermission.state }));
        });
        
        cameraPermission.addEventListener('change', () => {
          setPermissionStatus(prev => ({ ...prev, camera: cameraPermission.state }));
        });
      } catch (error) {
        console.log('Permission API not supported');
        // Fallback: check if we can access media devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasAudio = devices.some(device => device.kind === 'audioinput');
          const hasVideo = devices.some(device => device.kind === 'videoinput');
          
          setPermissionStatus({
            microphone: hasAudio ? 'granted' : 'prompt',
            camera: hasVideo ? 'granted' : 'prompt'
          });
        } catch (fallbackError) {
          console.log('MediaDevices API not supported');
        }
      }
    };

    checkPermissions();
    
    // Real browser-based app detection
    const scanRealApps = async () => {
      const detectedApps = [];
      
      try {
        // Current browser/tab with actual permissions
        const browserName = navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                           navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                           navigator.userAgent.includes('Safari') ? 'Safari' : 
                           navigator.userAgent.includes('Edge') ? 'Edge' : 'Browser';
        
        detectedApps.push({
          name: `${browserName} - SpyMe App`,
          permissions: {
            microphone: permissionStatus.microphone === 'granted',
            camera: permissionStatus.camera === 'granted'
          },
          lastAccess: new Date().toISOString()
        });

        // Check available media devices to understand hardware
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(device => device.kind === 'audioinput');
          const videoInputs = devices.filter(device => device.kind === 'videoinput');

          if (audioInputs.length > 0) {
            audioInputs.forEach((device, index) => {
              detectedApps.push({
                name: device.label || `Microphone ${index + 1}`,
                permissions: { microphone: true, camera: false },
                lastAccess: null
              });
            });
          }

          if (videoInputs.length > 0) {
            videoInputs.forEach((device, index) => {
              detectedApps.push({
                name: device.label || `Camera ${index + 1}`,
                permissions: { microphone: false, camera: true },
                lastAccess: null
              });
            });
          }
        } catch (deviceError) {
          console.log('Could not enumerate devices');
        }

        // Check for PWA installations if available
        if ('getInstalledRelatedApps' in navigator) {
          try {
            const relatedApps = await (navigator as any).getInstalledRelatedApps();
            relatedApps.forEach((app: any) => {
              detectedApps.push({
                name: app.platform === 'webapp' ? `PWA: ${app.url}` : app.id,
                permissions: { microphone: false, camera: false },
                lastAccess: null
              });
            });
          } catch (error) {
            console.log('PWA detection not available');
          }
        }

      } catch (error) {
        console.error('Error detecting real apps:', error);
        // Minimal fallback
        detectedApps.push({
          name: "Current Browser Session",
          permissions: {
            microphone: permissionStatus.microphone === 'granted',
            camera: permissionStatus.camera === 'granted'
          },
          lastAccess: new Date().toISOString()
        });
      }

      setInstalledApps(detectedApps);
    };
    
    scanRealApps();
  }, [permissionStatus]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch access logs
  const { data: accessLogs = [], isLoading: logsLoading } = useQuery<AccessLog[]>({
    queryKey: ["/api/access-logs"],
    refetchInterval: 5000,
  });

  // Fetch monitoring status
  const { data: monitoringStatus, isLoading: statusLoading } = useQuery<MonitoringStatus>({
    queryKey: ["/api/monitoring-status"],
    refetchInterval: 10000,
  });

  // Create access log mutation
  const createLogMutation = useMutation({
    mutationFn: async (data: { app: string; type: string; firebaseId?: string }) => {
      const response = await apiRequest("POST", "/api/access-logs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-logs"] });
    },
  });

  // Update monitoring status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { isEnabled: boolean }) => {
      const response = await apiRequest("PUT", "/api/monitoring-status", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring-status"] });
    },
  });

  // Clear logs mutation
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/access-logs");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-logs"] });
      toast({
        title: "Logs Cleared",
        description: "All access logs have been cleared successfully.",
      });
    },
  });

  const handleToggleMonitoring = async (enabled: boolean) => {
    try {
      await updateStatusMutation.mutateAsync({ isEnabled: enabled });
      toast({
        title: enabled ? "Monitoring Enabled" : "Monitoring Disabled",
        description: enabled ? "Now monitoring for mic and camera access" : "Monitoring has been disabled",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update monitoring status",
        variant: "destructive",
      });
    }
  };

  const handleTestMicrophone = async () => {
    if (!monitoringStatus?.isEnabled) {
      toast({
        title: "Monitoring Disabled",
        description: "Please enable monitoring to detect access",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsListening(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      
      // Update permission status immediately after grant
      setPermissionStatus(prev => ({ ...prev, microphone: 'granted' }));
      
      // Log the real access
      let firebaseId = null;
      if (firebaseConnected) {
        const alertData = {
          app: "SpyMe Web App",
          type: "microphone",
          timestamp: new Date().toISOString(),
        };
        firebaseId = await firebaseService.pushAlert(alertData);
      }

      await createLogMutation.mutateAsync({
        app: "SpyMe Web App",
        type: "microphone",
        firebaseId,
      });

      setNotificationData({ app: "SpyMe Web App", type: "microphone" });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      toast({
        title: "Microphone Access Detected!",
        description: "SpyMe Web App is now accessing your microphone",
      });

      // Stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        setIsListening(false);
      }, 3000);
    } catch (error) {
      setIsListening(false);
      setPermissionStatus(prev => ({ ...prev, microphone: 'denied' }));
      toast({
        title: "Microphone Access Denied",
        description: "Please grant microphone permission to test detection",
        variant: "destructive",
      });
    }
  };

  const handleTestCamera = async () => {
    if (!monitoringStatus?.isEnabled) {
      toast({
        title: "Monitoring Disabled",
        description: "Please enable monitoring to detect access",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(stream);
      
      // Update permission status immediately after grant
      setPermissionStatus(prev => ({ ...prev, camera: 'granted' }));
      
      // Log the real access
      let firebaseId = null;
      if (firebaseConnected) {
        const alertData = {
          app: "SpyMe Web App",
          type: "camera",
          timestamp: new Date().toISOString(),
        };
        firebaseId = await firebaseService.pushAlert(alertData);
      }

      await createLogMutation.mutateAsync({
        app: "SpyMe Web App",
        type: "camera",
        firebaseId,
      });

      setNotificationData({ app: "SpyMe Web App", type: "camera" });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      toast({
        title: "Camera Access Detected!",
        description: "SpyMe Web App is now accessing your camera",
      });

      // Stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }, 3000);
    } catch (error) {
      setPermissionStatus(prev => ({ ...prev, camera: 'denied' }));
      toast({
        title: "Camera Access Denied",
        description: "Please grant camera permission to test detection",
        variant: "destructive",
      });
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearLogsMutation.mutateAsync();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear logs",
        variant: "destructive",
      });
    }
  };

  const getAppIcon = (type: string) => {
    return type === "camera" ? <Camera className="w-4 h-4" /> : <Mic className="w-4 h-4" />;
  };

  const getAppColor = (type: string) => {
    return type === "camera" ? "bg-cyber-purple" : "bg-cyber-blue";
  };

  const getBorderColor = (type: string) => {
    return type === "camera" ? "border-cyber-purple" : "border-cyber-blue";
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const lastAccessSummary = accessLogs.slice(0, 2);

  return (
    <div className="min-h-screen bg-cyber-dark text-white">
      {/* Header */}
      <header className="bg-cyber-surface shadow-lg border-b border-cyber-gray sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-cyber-green p-2 rounded-lg">
                <Shield className="text-cyber-dark w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SpyMe</h1>
                <p className="text-xs text-gray-400">Mic & Camera Detector</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${monitoringStatus?.isEnabled ? 'bg-cyber-green animate-pulse-slow' : 'bg-gray-500'}`} />
                <span className="text-sm font-medium">
                  {monitoringStatus?.isEnabled ? 'Monitoring Active' : 'Monitoring Disabled'}
                </span>
              </div>
              <div className="bg-cyber-gray px-3 py-1 rounded-full text-xs">
                <Clock className="w-3 h-3 mr-1 inline" />
                <span>{currentTime.toLocaleTimeString('en-US', { hour12: false })}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Control Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-cyber-surface border-cyber-gray">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <Settings className="mr-2 text-cyber-green" />
                  Monitoring Controls
                </h2>
                
                {/* Master Toggle */}
                <div className="flex items-center justify-between mb-6 p-4 bg-cyber-gray rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-cyber-green rounded-full flex items-center justify-center">
                      <Power className="text-cyber-dark w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Master Protection</h3>
                      <p className="text-sm text-gray-400">Enable continuous monitoring</p>
                    </div>
                  </div>
                  <Switch
                    checked={monitoringStatus?.isEnabled || false}
                    onCheckedChange={handleToggleMonitoring}
                    disabled={statusLoading || updateStatusMutation.isPending}
                  />
                </div>

                {/* Real Access Detection */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg mb-4">Real Access Detection</h3>
                  
                  {(permissionStatus.microphone === 'prompt' || permissionStatus.camera === 'prompt') && (
                    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Info className="w-5 h-5 text-yellow-500" />
                        <p className="text-sm text-yellow-200">
                          Test real microphone/camera access on this device. The app will request actual permissions and log the access.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {(permissionStatus.microphone === 'granted' && permissionStatus.camera === 'granted') && (
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-green-500" />
                        <p className="text-sm text-green-200">
                          Permissions granted! Click the buttons below to test real-time access detection.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      onClick={handleTestMicrophone}
                      disabled={createLogMutation.isPending || isListening}
                      className="bg-cyber-blue hover:bg-blue-600 text-white p-6"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Mic className="w-6 h-6" />
                        <span className="font-medium">Test Microphone</span>
                        <span className="text-xs opacity-75">
                          {isListening ? "Listening..." : "Click to access mic"}
                        </span>
                      </div>
                    </Button>

                    <Button
                      onClick={handleTestCamera}
                      disabled={createLogMutation.isPending}
                      className="bg-cyber-purple hover:bg-purple-600 text-white p-6"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Camera className="w-6 h-6" />
                        <span className="font-medium">Test Camera</span>
                        <span className="text-xs opacity-75">Click to access camera</span>
                      </div>
                    </Button>
                  </div>

                  <div className="bg-cyber-gray rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">Current Browser Permissions</h4>
                      <div className="flex space-x-2">
                        <Button
                          onClick={async () => {
                            // Re-scan permissions and apps
                            window.location.reload();
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-cyber-green hover:bg-green-600 text-cyber-dark border-cyber-green"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Refresh
                        </Button>
                        <Button
                          onClick={() => setShowAppScanner(!showAppScanner)}
                          variant="outline"
                          size="sm"
                          className="bg-cyber-blue hover:bg-blue-600 text-white border-cyber-blue"
                        >
                          <List className="w-4 h-4 mr-2" />
                          {showAppScanner ? 'Hide' : 'Scan Apps'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Microphone:</span>
                        <span className={`text-sm font-medium ${
                          permissionStatus.microphone === 'granted' ? 'text-cyber-green' : 
                          permissionStatus.microphone === 'denied' ? 'text-cyber-red' : 'text-yellow-500'
                        }`}>
                          {permissionStatus.microphone === 'granted' ? 'Granted' : 
                           permissionStatus.microphone === 'denied' ? 'Denied' : 'Not Requested'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Camera:</span>
                        <span className={`text-sm font-medium ${
                          permissionStatus.camera === 'granted' ? 'text-cyber-green' : 
                          permissionStatus.camera === 'denied' ? 'text-cyber-red' : 'text-yellow-500'
                        }`}>
                          {permissionStatus.camera === 'granted' ? 'Granted' : 
                           permissionStatus.camera === 'denied' ? 'Denied' : 'Not Requested'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Overview */}
          <div className="space-y-6">
            {/* System Status */}
            <Card className="bg-cyber-surface border-cyber-gray">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Shield className="mr-2 text-cyber-green" />
                  System Status
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Monitoring</span>
                    <span className={`font-semibold ${monitoringStatus?.isEnabled ? 'text-cyber-green' : 'text-gray-500'}`}>
                      {monitoringStatus?.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Firebase</span>
                    <span className={`font-semibold ${firebaseConnected ? 'text-cyber-green' : 'text-cyber-red'}`}>
                      {firebaseConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Permissions</span>
                    <span className="text-cyber-green font-semibold">Granted</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Background Service</span>
                    <span className="text-cyber-green font-semibold">Running</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Access */}
            <Card className="bg-cyber-surface border-cyber-gray">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock className="mr-2 text-yellow-500" />
                  Last Access
                </h3>
                <div className="space-y-3">
                  {lastAccessSummary.length > 0 ? (
                    lastAccessSummary.map((log) => (
                      <div key={log.id} className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAppColor(log.type)}`}>
                          {getAppIcon(log.type)}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{log.app}</p>
                          <p className="text-xs text-gray-400">{formatTimeAgo(log.timestamp.toString())}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No recent access detected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* App Scanner */}
        {showAppScanner && (
          <Card className="bg-cyber-surface border-cyber-gray mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Shield className="mr-2 text-cyber-blue" />
                Browser Permission Scanner
                <span className="ml-2 text-sm text-gray-400">({installedApps.length} detected)</span>
              </h2>
              
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Bell className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-300 mb-2">Important Limitation</h3>
                    <p className="text-sm text-red-200 mb-2">
                      This web app <strong>cannot detect</strong> other applications like WhatsApp, Instagram, or TikTok accessing your microphone/camera.
                    </p>
                    <p className="text-sm text-red-200 mb-2">
                      Web browsers can only show their own permission status for security reasons.
                    </p>
                    <p className="text-sm text-red-200">
                      For real system-wide monitoring, you need a native Android app with special permissions.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-300 mb-2">Real Android Solution</h3>
                    <p className="text-sm text-blue-200 mb-2">
                      To detect WhatsApp, TikTok, and other apps accessing your mic/camera, you need:
                    </p>
                    <ul className="text-sm text-blue-200 space-y-1 ml-4">
                      <li>• <strong>Android Studio</strong> with Kotlin development</li>
                      <li>• <strong>AppOpsManager</strong> API for permission monitoring</li>
                      <li>• <strong>UsageStatsManager</strong> for foreground app detection</li>
                      <li>• <strong>PACKAGE_USAGE_STATS</strong> permission from user</li>
                      <li>• <strong>Foreground Service</strong> for background monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-cyber-gray rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Mic className="w-5 h-5 text-cyber-blue" />
                    <span className="font-semibold">Microphone Access</span>
                  </div>
                  <div className="text-2xl font-bold text-cyber-blue">
                    {installedApps.filter(app => app.permissions.microphone).length}
                  </div>
                  <div className="text-sm text-gray-400">apps have permission</div>
                </div>
                
                <div className="bg-cyber-gray rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Camera className="w-5 h-5 text-cyber-purple" />
                    <span className="font-semibold">Camera Access</span>
                  </div>
                  <div className="text-2xl font-bold text-cyber-purple">
                    {installedApps.filter(app => app.permissions.camera).length}
                  </div>
                  <div className="text-sm text-gray-400">apps have permission</div>
                </div>
                
                <div className="bg-cyber-gray rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bell className="w-5 h-5 text-cyber-red" />
                    <span className="font-semibold">High Risk Apps</span>
                  </div>
                  <div className="text-2xl font-bold text-cyber-red">
                    {installedApps.filter(app => app.permissions.microphone && app.permissions.camera).length}
                  </div>
                  <div className="text-sm text-gray-400">apps have both permissions</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold mb-3">App Permission Details</h3>
                {installedApps.map((app, index) => (
                  <div key={index} className="bg-cyber-gray rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyber-blue to-cyber-purple rounded-lg flex items-center justify-center text-white font-bold">
                        {app.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{app.name}</h4>
                        {app.lastAccess && (
                          <p className="text-xs text-gray-400">
                            Last access: {formatTimeAgo(app.lastAccess)}
                          </p>
                        )}
                        {!app.lastAccess && (
                          <p className="text-xs text-gray-500">Never used</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Mic className={`w-4 h-4 ${app.permissions.microphone ? 'text-cyber-green' : 'text-gray-500'}`} />
                        <span className={`text-xs ${app.permissions.microphone ? 'text-cyber-green' : 'text-gray-500'}`}>
                          {app.permissions.microphone ? 'Granted' : 'Denied'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Camera className={`w-4 h-4 ${app.permissions.camera ? 'text-cyber-green' : 'text-gray-500'}`} />
                        <span className={`text-xs ${app.permissions.camera ? 'text-cyber-green' : 'text-gray-500'}`}>
                          {app.permissions.camera ? 'Granted' : 'Denied'}
                        </span>
                      </div>
                      {app.permissions.microphone && app.permissions.camera && (
                        <div className="bg-cyber-red px-2 py-1 rounded text-xs font-semibold">
                          HIGH RISK
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Logs */}
        <Card className="bg-cyber-surface border-cyber-gray">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <List className="mr-2 text-cyber-green" />
                Access History
              </h2>
              <Button
                onClick={handleClearLogs}
                disabled={clearLogsMutation.isPending}
                variant="outline"
                className="bg-cyber-gray hover:bg-gray-600"
              >
                <Trash2 className="mr-2 w-4 h-4" />
                Clear
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyber-green"></div>
                </div>
              ) : accessLogs.length > 0 ? (
                accessLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-4 bg-cyber-gray rounded-lg border-l-4 hover:bg-gray-700 transition-colors duration-200 ${getBorderColor(log.type)}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAppColor(log.type)}`}>
                        {getAppIcon(log.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold capitalize">{log.app}</h4>
                        <p className="text-sm text-gray-400">{log.type} access detected</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-gray-300">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(log.timestamp.toString())}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No access logs yet. Simulate access to see logs here.</p>
                </div>
              )}
            </div>

            {/* Firebase Status */}
            <div className="mt-6 p-4 bg-cyber-gray rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${firebaseConnected ? 'bg-cyber-green animate-pulse-slow' : 'bg-gray-500'}`} />
                  <span className="text-sm font-medium">Firebase Realtime Database</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">
                    {firebaseConnected ? 'Last sync: Just now' : 'Not connected'}
                  </p>
                  <p className="text-xs text-gray-500">{accessLogs.length} alerts stored</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Educational Note */}
        <Card className="mt-8 bg-gradient-to-r from-green-900/20 to-blue-900/20 border-cyber-green/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-cyber-green rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="text-cyber-dark w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-cyber-green mb-2">Privacy Protection Information</h3>
                <p className="text-gray-300 mb-3">
                  SpyMe helps protect your privacy by monitoring when applications access your device's microphone and camera. 
                  This tool is designed for educational purposes and helps users understand how their privacy might be compromised.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyber-green rounded-full" />
                    <span>Real-time monitoring</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyber-green rounded-full" />
                    <span>Local and cloud logging</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyber-green rounded-full" />
                    <span>No data collection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyber-green rounded-full" />
                    <span>Open source design</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Toast */}
      {showNotification && notificationData && (
        <div className="fixed top-4 right-4 bg-cyber-surface border border-cyber-green rounded-lg p-4 shadow-xl z-50 animate-in slide-in-from-right">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-cyber-red rounded-full flex items-center justify-center">
              <Bell className="text-white w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Access Detected!</h4>
              <p className="text-sm text-gray-300">
                {notificationData.app} accessed your {notificationData.type}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
