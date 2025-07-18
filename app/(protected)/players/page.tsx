"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePlayers } from "@/stores/playersStore";

export default function PlayersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const {
    players,
    pagination,
    loading,
    error,
    isPageCached,
    fetchPlayersPage,
    clearCache,
  } = usePlayers(currentPage);

  useEffect(() => {
    fetchPlayersPage();
  }, [currentPage]);

  useEffect(() => {
    // Scroll to top whenever the page changes (both cached and fresh data)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">NFL Players</h1>
        <p className="text-muted-foreground mt-2">Browse all NFL players</p>
        <div className="text-sm text-muted-foreground mt-1">
          Showing {(pagination.currentPage - 1) * 50 + 1}-
          {Math.min(pagination.currentPage * 50, pagination.totalCount)} of{" "}
          {pagination.totalCount} players
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Database</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    {player.firstName}
                  </TableCell>
                  <TableCell className="font-medium">
                    {player.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{player.position}</Badge>
                  </TableCell>
                  <TableCell>
                    {player.team ? (
                      <Badge variant="default">{player.team}</Badge>
                    ) : (
                      <Badge variant="secondary">FA</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={!pagination.hasPreviousPage}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {/* Show page numbers */}
          {Array.from(
            { length: Math.min(5, pagination.totalPages) },
            (_, i) => {
              const startPage = Math.max(1, pagination.currentPage - 2);
              const page = startPage + i;

              if (page > pagination.totalPages) return null;

              return (
                <Button
                  key={page}
                  variant={
                    page === pagination.currentPage ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="min-w-[2.5rem]"
                >
                  {page}
                </Button>
              );
            }
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground mt-4">
        Page {pagination.currentPage} of {pagination.totalPages}
      </div>
    </div>
  );
}
