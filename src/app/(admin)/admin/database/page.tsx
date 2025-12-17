"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Database, RefreshCw } from "lucide-react";

interface TableInfo {
  name: string;
  count: number;
}

interface TableData {
  table: string;
  total: number;
  data: Record<string, unknown>[];
  limit: number;
  offset: number;
}

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 25;

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable, page]);

  const fetchTables = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/database");
      const data = await response.json();
      if (response.ok) {
        setTables(data.tables || []);
      } else {
        setError(data.error || "Failed to fetch tables");
      }
    } catch (err) {
      console.error("Failed to fetch tables:", err);
      setError("Failed to connect to the database API");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setIsLoadingData(true);
    try {
      const response = await fetch(
        `/api/admin/database?table=${tableName}&limit=${limit}&offset=${page * limit}`
      );
      if (response.ok) {
        const data = await response.json();
        setTableData(data);
      }
    } catch (error) {
      console.error("Failed to fetch table data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(0);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value).slice(0, 50) + "...";
    if (typeof value === "string" && value.length > 50) return value.slice(0, 50) + "...";
    return String(value);
  };

  const getColumns = (data: Record<string, unknown>[]): string[] => {
    if (data.length === 0) return [];
    const allKeys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((key) => allKeys.add(key)));
    // Prioritize common columns
    const priority = ["id", "name", "email", "title", "status", "type", "createdAt"];
    const sorted = [...allKeys].sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
    return sorted.slice(0, 8); // Limit to 8 columns for display
  };

  const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database</h1>
          <p className="text-muted-foreground">
            View all database tables and records
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchTables();
            if (selectedTable) fetchTableData(selectedTable);
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedTable || "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table List */}
      <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
          <CardDescription>Click on a table to view its records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchTables}>
                Try Again
              </Button>
            </div>
          ) : tables.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No tables found in the database
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {tables.map((table) => (
                <Button
                  key={table.name}
                  variant={selectedTable === table.name ? "default" : "outline"}
                  className="h-auto py-3 px-4 justify-between"
                  onClick={() => handleTableSelect(table.name)}
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">{table.name}</span>
                  </div>
                  <Badge variant="secondary">{table.count}</Badge>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Data */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTable}</CardTitle>
                <CardDescription>
                  {tableData ? `${tableData.total} total records` : "Loading..."}
                </CardDescription>
              </div>
              <Select value={selectedTable} onValueChange={handleTableSelect}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.name} value={table.name}>
                      {table.name} ({table.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !tableData || tableData.data.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No records found
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {getColumns(tableData.data).map((column) => (
                          <TableHead key={column} className="whitespace-nowrap">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.data.map((row, index) => (
                        <TableRow key={index}>
                          {getColumns(tableData.data).map((column) => (
                            <TableCell key={column} className="max-w-xs truncate">
                              {formatValue(row[column])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, tableData.total)} of {tableData.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={(page + 1) * limit >= tableData.total}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
