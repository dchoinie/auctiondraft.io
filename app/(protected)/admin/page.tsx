"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Trash2, Users, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface PlayerDataInfo {
  lastUpdated: string | null;
  playerCount: number;
  status: string;
}

interface SeedingResult {
  success: boolean;
  message: string;
  playersCreated?: number;
  playersUpdated?: number;
  skipped?: boolean;
  error?: string;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerDataInfo, setPlayerDataInfo] = useState<PlayerDataInfo | null>(null);
  const [importingPlayers, setImportingPlayers] = useState(false);
  const [clearingPlayers, setClearingPlayers] = useState(false);

  // Check admin status on component mount
  useEffect(() => {
    if (isLoaded && user) {
      checkAdminStatus();
      fetchPlayerDataInfo();
    }
  }, [isLoaded, user]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/admin/player-data-info");
      if (response.status === 403) {
        setIsAdmin(false);
      } else if (response.ok) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerDataInfo = async () => {
    try {
      const response = await fetch("/api/admin/player-data-info");
      if (response.ok) {
        const data = await response.json();
        setPlayerDataInfo(data);
      }
    } catch (error) {
      console.error("Error fetching player data info:", error);
    }
  };

  const handleImportPlayers = async () => {
    setImportingPlayers(true);
    try {
      const response = await fetch("/api/admin/seed-players", {
        method: "POST",
      });
      
      const result: SeedingResult = await response.json();
      
      if (result.success) {
        if (result.skipped) {
          toast.success("Player data is already up to date");
        } else {
          toast.success(
            `NFL players imported successfully! Created: ${result.playersCreated}, Updated: ${result.playersUpdated}`
          );
        }
        fetchPlayerDataInfo(); // Refresh the data
      } else {
        toast.error(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Error importing players:", error);
      toast.error("Failed to import players. Please try again.");
    } finally {
      setImportingPlayers(false);
    }
  };

  const handleClearPlayers = async () => {
    if (!confirm("Are you sure you want to clear all NFL player data? This action cannot be undone.")) {
      return;
    }

    setClearingPlayers(true);
    try {
      const response = await fetch("/api/admin/clear-nfl-players", {
        method: "POST",
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Cleared ${result.recordsDeleted} player records successfully`);
        fetchPlayerDataInfo(); // Refresh the data
      } else {
        toast.error(`Clear failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Error clearing players:", error);
      toast.error("Failed to clear players. Please try again.");
    } finally {
      setClearingPlayers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have admin privileges to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Administration</h1>
        <p className="text-gray-600 mt-2">
          Manage platform data and settings. Only visible to platform administrators.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* NFL Players Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              NFL Players Data
            </CardTitle>
            <CardDescription>
              Manage NFL player database and imports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {playerDataInfo && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Players:</span>
                  <Badge variant="secondary">{playerDataInfo.playerCount.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <span className="text-sm">
                    {playerDataInfo.lastUpdated 
                      ? new Date(playerDataInfo.lastUpdated).toLocaleDateString()
                      : "Never"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge 
                    variant={playerDataInfo.status === "success" ? "default" : "destructive"}
                  >
                    {playerDataInfo.status}
                  </Badge>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleImportPlayers} 
                disabled={importingPlayers}
                className="flex-1"
              >
                {importingPlayers ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Import Players
              </Button>
              <Button 
                onClick={handleClearPlayers} 
                disabled={clearingPlayers}
                variant="destructive"
                size="icon"
              >
                {clearingPlayers ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Admin Management
            </CardTitle>
            <CardDescription>
              Manage platform administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Admin privileges are managed through Clerk&apos;s private metadata.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Manage Admins
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Use API endpoints: /api/admin/make-admin, /api/admin/remove-admin
            </p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Monitor platform status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Database:</span>
                <Badge variant="default">Healthy</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">API Status:</span>
                <Badge variant="default">Online</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              Check Health
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" onClick={fetchPlayerDataInfo}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button variant="outline" disabled>
              <Database className="h-4 w-4 mr-2" />
              Backup Data
            </Button>
            <Button variant="outline" disabled>
              <Users className="h-4 w-4 mr-2" />
              User Stats
            </Button>
            <Button variant="outline" disabled>
              <AlertTriangle className="h-4 w-4 mr-2" />
              System Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 