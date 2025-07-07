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
  const [selectedApp, setSelectedApp] = useState("instagram");
  const [selectedType, setSelectedType] = useState<"microphone" | "camera">("microphone");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{ app: string; type: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      const connected = await firebaseService.initialize();
      setFirebaseConnected(connected);
    };
    initFirebase();
  }, []);

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

  const handleSimulateAccess = async () => {
    if (!monitoringStatus?.isEnabled) {
      toast({
        title: "Monitoring Disabled",
        description: "Please enable monitoring to detect access",
        variant: "destructive",
      });
      return;
    }

    try {
      // Push to Firebase first
      let firebaseId = null;
      if (firebaseConnected) {
        const alertData = {
          app: selectedApp,
          type: selectedType,
          timestamp: new Date().toISOString(),
        };
        firebaseId = await firebaseService.pushAlert(alertData);
      }

      // Create local log
      await createLogMutation.mutateAsync({
        app: selectedApp,
        type: selectedType,
        firebaseId,
      });

      // Show notification
      setNotificationData({ app: selectedApp, type: selectedType });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      toast({
        title: "Access Detected!",
        description: `${selectedApp} accessed your ${selectedType}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to simulate access detection",
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

                {/* Simulation Controls */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg mb-4">Simulation Tools</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select App</label>
                      <Select value={selectedApp} onValueChange={setSelectedApp}>
                        <SelectTrigger className="bg-cyber-gray border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {apps.map((app) => (
                            <SelectItem key={app.value} value={app.value}>
                              {app.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Access Type</label>
                      <div className="flex space-x-2">
                        <Button
                          variant={selectedType === "microphone" ? "default" : "outline"}
                          onClick={() => setSelectedType("microphone")}
                          className="flex-1 bg-cyber-blue hover:bg-blue-600"
                        >
                          <Mic className="mr-2 w-4 h-4" />
                          Mic
                        </Button>
                        <Button
                          variant={selectedType === "camera" ? "default" : "outline"}
                          onClick={() => setSelectedType("camera")}
                          className="flex-1 bg-cyber-purple hover:bg-purple-600"
                        >
                          <Camera className="mr-2 w-4 h-4" />
                          Camera
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSimulateAccess}
                    disabled={createLogMutation.isPending}
                    className="w-full bg-cyber-green hover:bg-green-600 text-cyber-dark font-semibold"
                  >
                    {createLogMutation.isPending ? (
                      "Detecting..."
                    ) : (
                      <>
                        <Bell className="mr-2 w-4 h-4" />
                        Trigger Access Detection
                      </>
                    )}
                  </Button>
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
