import { 
  users, 
  accessLogs, 
  monitoringStatus,
  type User, 
  type InsertUser,
  type AccessLog,
  type InsertAccessLog,
  type MonitoringStatus,
  type InsertMonitoringStatus
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Access logs
  getAccessLogs(): Promise<AccessLog[]>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  clearAccessLogs(): Promise<void>;
  
  // Monitoring status
  getMonitoringStatus(): Promise<MonitoringStatus>;
  updateMonitoringStatus(status: InsertMonitoringStatus): Promise<MonitoringStatus>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private accessLogs: Map<number, AccessLog>;
  private monitoringStatus: MonitoringStatus;
  private currentUserId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.accessLogs = new Map();
    this.currentUserId = 1;
    this.currentLogId = 1;
    this.monitoringStatus = {
      id: 1,
      isEnabled: true,
      lastUpdated: new Date()
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAccessLogs(): Promise<AccessLog[]> {
    return Array.from(this.accessLogs.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createAccessLog(insertLog: InsertAccessLog): Promise<AccessLog> {
    const id = this.currentLogId++;
    const log: AccessLog = { 
      ...insertLog, 
      id, 
      timestamp: new Date()
    };
    this.accessLogs.set(id, log);
    return log;
  }

  async clearAccessLogs(): Promise<void> {
    this.accessLogs.clear();
  }

  async getMonitoringStatus(): Promise<MonitoringStatus> {
    return this.monitoringStatus;
  }

  async updateMonitoringStatus(status: InsertMonitoringStatus): Promise<MonitoringStatus> {
    this.monitoringStatus = {
      ...this.monitoringStatus,
      ...status,
      lastUpdated: new Date()
    };
    return this.monitoringStatus;
  }
}

export const storage = new MemStorage();
