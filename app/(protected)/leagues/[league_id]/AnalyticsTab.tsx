"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface AnalyticsData {
  mostBidOnPlayers: Array<{
    count: number;
    playerName: string;
    playerId: string;
  }>;
  positionalSpending: Record<string, {
    total: number;
    percentage: number;
    count: number;
  }>;
  priceInflation: Array<{
    draftOrder: number;
    averagePrice: number;
    playerCount: number;
  }>;
  spendingPatterns: Array<{
    teamName: string;
    totalSpent: number;
    remainingBudget: number;
    earlySpending: number;
    lateSpending: number;
    spendingPattern: 'early' | 'balanced' | 'late';
  }>;
  teamAnalytics: Array<{
    teamName: string;
    totalSpent: number;
    remainingBudget: number;
    playerCount: number;
    positionalBreakdown: Record<string, {
      total: number;
      percentage: number;
      count: number;
    }>;
  }>;
  draftMomentum: Array<{
    teamName: string;
    budgetHistory: Array<{
      draftOrder: number;
      remainingBudget: number;
      spent: number;
    }>;
    turningPoints: Array<{
      draftOrder: number;
      description: string;
      budgetChange: number;
    }>;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function AnalyticsTab() {
  const { league_id } = useParams();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [league_id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leagues/${league_id}/analytics`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  // Check if we have any meaningful data
  const hasDraftData = analytics.mostBidOnPlayers.length > 0 || 
                      Object.keys(analytics.positionalSpending).length > 0 ||
                      analytics.priceInflation.length > 0;

  if (!hasDraftData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">No draft data available yet</p>
        <p className="text-sm text-gray-500">
          Analytics will be available once the draft has started and players have been drafted.
        </p>
      </div>
    );
  }

  // Prepare data for charts
  const mostBidOnData = analytics.mostBidOnPlayers.map((player, index) => ({
    name: player.playerName,
    bids: player.count,
    fill: COLORS[index % COLORS.length],
  }));

  const positionalData = Object.entries(analytics.positionalSpending).map(([position, data]) => ({
    position,
    total: data.total,
    percentage: data.percentage,
    count: data.count,
  }));

  const spendingPatternData = analytics.spendingPatterns.map((team) => ({
    name: team.teamName,
    early: team.earlySpending,
    late: team.lateSpending,
    remaining: team.remainingBudget,
    pattern: team.spendingPattern,
  }));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-50 mb-2">Draft Analytics</h3>
        <p className="text-gray-400">Comprehensive insights into your league&apos;s draft performance</p>
      </div>

      <Tabs defaultValue="league" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="league">League Analytics</TabsTrigger>
          <TabsTrigger value="trends">Draft Trends</TabsTrigger>
          <TabsTrigger value="teams">Team Analytics</TabsTrigger>
        </TabsList>

                 <TabsContent value="league" className="space-y-6">
           {/* Most Bid On Players */}
           {analytics.mostBidOnPlayers.length > 0 && (
             <Card>
               <CardHeader>
                 <CardTitle>Most Bid On Players</CardTitle>
                 <CardDescription>
                   Players who received the highest number of bids during the draft
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                   <BarChart data={mostBidOnData}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                     <YAxis />
                     <Tooltip />
                     <Bar dataKey="bids" fill="#8884d8" />
                   </BarChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>
           )}

                     {/* Positional Spending Breakdown */}
           {Object.keys(analytics.positionalSpending).length > 0 && (
             <Card>
               <CardHeader>
                 <CardTitle>Positional Spending Breakdown</CardTitle>
                 <CardDescription>
                   Percentage of total league budget spent on each position
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <ResponsiveContainer width="100%" height={300}>
                    <>
                      <PieChart>
                        <Pie
                          data={positionalData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ position, percentage }) => `${position}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="total"
                        >
                          {positionalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                      <Tooltip />
                    </>
                   </ResponsiveContainer>
                   <div className="space-y-4">
                     {positionalData.map((data, index) => (
                       <div key={data.position} className="flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                           <div
                             className="w-4 h-4 rounded"
                             style={{ backgroundColor: COLORS[index % COLORS.length] }}
                           />
                           <span className="font-medium">{data.position}</span>
                         </div>
                         <div className="text-right">
                           <div className="font-bold">${data.total}</div>
                           <div className="text-sm text-gray-500">
                             {data.percentage.toFixed(1)}% • {data.count} players
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}
        </TabsContent>

                 <TabsContent value="trends" className="space-y-6">
           {/* Price Inflation Over Time */}
           {analytics.priceInflation.length > 0 && (
             <Card>
               <CardHeader>
                 <CardTitle>Price Inflation Over Time</CardTitle>
                 <CardDescription>
                   Average player prices throughout the draft (moving average)
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                   <LineChart data={analytics.priceInflation}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="draftOrder" />
                     <YAxis />
                     <Tooltip />
                     <Legend />
                     <Line
                       type="monotone"
                       dataKey="averagePrice"
                       stroke="#8884d8"
                       strokeWidth={2}
                       dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                     />
                   </LineChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>
           )}

                     {/* Spending Patterns */}
           {analytics.spendingPatterns.length > 0 && (
             <Card>
               <CardHeader>
                 <CardTitle>Budget Hoarders vs Early Spenders</CardTitle>
                 <CardDescription>
                   How teams allocated their budget throughout the draft
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                   <BarChart data={spendingPatternData}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                     <YAxis />
                     <Tooltip />
                     <Legend />
                     <Bar dataKey="early" stackId="a" fill="#0088FE" name="Early Spending" />
                     <Bar dataKey="late" stackId="a" fill="#00C49F" name="Late Spending" />
                     <Bar dataKey="remaining" stackId="a" fill="#FFBB28" name="Remaining Budget" />
                   </BarChart>
                 </ResponsiveContainer>
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                   {spendingPatternData.map((team) => (
                     <div key={team.name} className="text-center p-3 border rounded">
                       <div className="font-medium">{team.name}</div>
                       <Badge
                         variant={
                           team.pattern === 'early' ? 'default' :
                           team.pattern === 'late' ? 'secondary' : 'outline'
                         }
                       >
                         {team.pattern} spender
                       </Badge>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
           )}
        </TabsContent>

                 <TabsContent value="teams" className="space-y-6">
           {/* Team Spending Summary */}
           {analytics.teamAnalytics.length > 0 && (
             <Card>
               <CardHeader>
                 <CardTitle>Team Spending Summary</CardTitle>
                 <CardDescription>
                   Overview of how each team allocated their budget
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {analytics.teamAnalytics.map((team) => (
                     <div key={team.teamName} className="p-4 border rounded-lg">
                       <h4 className="font-bold text-lg mb-2">{team.teamName}</h4>
                       <div className="space-y-2 text-sm">
                         <div className="flex justify-between">
                           <span>Total Spent:</span>
                           <span className="font-medium">${team.totalSpent}</span>
                         </div>
                         <div className="flex justify-between">
                           <span>Remaining:</span>
                           <span className="font-medium">${team.remainingBudget}</span>
                         </div>
                         <div className="flex justify-between">
                           <span>Players:</span>
                           <span className="font-medium">{team.playerCount}</span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
           )}

                     {/* Draft Momentum Map */}
           {analytics.draftMomentum.length > 0 && analytics.draftMomentum.some(team => team.budgetHistory.length > 1) && (
             <Card>
               <CardHeader>
                 <CardTitle>Draft Momentum Map</CardTitle>
                 <CardDescription>
                   How each team&apos;s budget changed throughout the draft
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <ResponsiveContainer width="100%" height={400}>
                   <AreaChart>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="draftOrder" />
                     <YAxis />
                     <Tooltip />
                     <Legend />
                     {analytics.draftMomentum.map((team, index) => (
                       <Area
                         key={team.teamName}
                         type="monotone"
                         dataKey="remainingBudget"
                         data={team.budgetHistory}
                         name={team.teamName}
                         stroke={COLORS[index % COLORS.length]}
                         fill={COLORS[index % COLORS.length]}
                         fillOpacity={0.3}
                       />
                     ))}
                   </AreaChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>
           )}

                     {/* Team Positional Breakdown */}
           {analytics.teamAnalytics.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {analytics.teamAnalytics.map((team) => (
                 <Card key={team.teamName}>
                   <CardHeader>
                     <CardTitle className="text-lg">{team.teamName}</CardTitle>
                     <CardDescription>Positional spending breakdown</CardDescription>
                   </CardHeader>
                   <CardContent>
                     {Object.keys(team.positionalBreakdown).length > 0 ? (
                       <ResponsiveContainer width="100%" height={200}>
                         <PieChart>
                           <Pie
                             data={Object.entries(team.positionalBreakdown).map(([position, data]) => ({
                               name: position,
                               value: data.total,
                               percentage: data.percentage,
                             }))}
                             cx="50%"
                             cy="50%"
                             labelLine={false}
                             label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                             outerRadius={60}
                             fill="#8884d8"
                             dataKey="value"
                           >
                             {Object.entries(team.positionalBreakdown).map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip />
                         </PieChart>
                       </ResponsiveContainer>
                     ) : (
                       <div className="text-center text-gray-500 py-8">
                         No players drafted yet
                       </div>
                     )}
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 